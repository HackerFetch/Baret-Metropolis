import type { AnalyzeResponse } from "@baret/guard";
import type { WebAuthnClient } from "@category-labs/mera";
import { entropyToMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { decodeFunctionData, erc20Abi, keccak256, parseTransaction } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import { createWallet, unlockWallet, WalletSession } from "./account.js";
import { PAYMENT_GUARD_ABI, transfers, vault, type WalletCall } from "./calls.js";
import type { WalletChain } from "./chain.js";
import { NotClearedError, Wallet } from "./wallet.js";

const PRF = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
const VAULT = "0x0A82671420114E47c672D5e8e23017DdCE850A35";
const USDC = "0x534b2f3A21130d7a60830c2Df862319e593943A3";
const PEER = "0x1365566191bAA9872A64AcDce963751d5343ff49";

describe("WalletSession", () => {
  const mnemonic = entropyToMnemonic(PRF, wordlist);

  it("derives the wallet at the standard path, so the same words open it anywhere", () => {
    const session = new WalletSession(PRF);
    expect(session.address).toBe(mnemonicToAccount(mnemonic).address);
  });

  it("derives agent keys on their own branch, the same every time", () => {
    const session = new WalletSession(PRF);
    const first = session.agentKey(0);
    expect(first.address).toBe(mnemonicToAccount(mnemonic, { accountIndex: 1 }).address);
    expect(session.agentAddress(0)).toBe(first.address);
    expect(new WalletSession(PRF).agentKey(0).privateKey).toBe(first.privateKey);
    expect(session.agentKey(1).address).not.toBe(first.address);
    expect(first.address).not.toBe(session.address);
  });

  it("cannot sign or derive after lock", async () => {
    const session = new WalletSession(PRF);
    session.lock();
    expect(session.locked).toBe(true);
    expect(() => session.account).toThrow(/locked/);
    expect(() => session.agentKey(0)).toThrow(/locked/);
  });

  it("does not keep a reference to the caller's bytes", () => {
    const bytes = Uint8Array.from(PRF);
    const session = new WalletSession(bytes);
    bytes.fill(0);
    expect(session.agentKey(0).address).toBe(new WalletSession(PRF).agentKey(0).address);
  });
});

/** A passkey authenticator in memory: one credential, PRF output fixed per salt. */
function fakeAuthenticator(): WebAuthnClient {
  const id = Uint8Array.from([9, 9, 9, 9]);
  const prf = (salt: Uint8Array) =>
    Uint8Array.from(PRF, (b, i) => b ^ (salt[i % salt.length] ?? 0));
  return {
    createCredential: async (request) => ({
      credentialId: id,
      transports: ["internal"],
      prfEnabled: true,
      prfOutput: prf(request.prfSalt),
    }),
    getCredential: async (request) =>
      ({ credentialId: id, prfOutput: prf(request.prfSalt) }) as Awaited<
        ReturnType<WebAuthnClient["getCredential"]>
      >,
  };
}

describe("passkey", () => {
  it("opens the same wallet at creation and at every unlock", async () => {
    const webAuthnClient = fakeAuthenticator();
    const created = await createWallet({
      rpId: "wallet.example",
      rpName: "Baret",
      userName: "ezgin",
      webAuthnClient,
    });
    expect(created.credential.transports).toEqual(["internal"]);

    const unlocked = await unlockWallet({
      rpId: "wallet.example",
      credential: created.credential,
      webAuthnClient,
    });
    expect(unlocked.session.address).toBe(created.session.address);
    expect(unlocked.session.agentAddress(0)).toBe(created.session.agentAddress(0));
    expect(unlocked.credential).toEqual(created.credential);
  });
});

describe("calls", () => {
  it("funds a vault with an allowance for exactly the amount, then the deposit", () => {
    const [approve, deposit] = vault.deposit(VAULT, USDC, 5_000_000n);
    expect(approve.to).toBe(USDC);
    expect(decodeFunctionData({ abi: erc20Abi, data: approve.data }).args).toEqual([
      VAULT,
      5_000_000n,
    ]);
    expect(deposit.to).toBe(VAULT);
    expect(decodeFunctionData({ abi: PAYMENT_GUARD_ABI, data: deposit.data })).toEqual({
      functionName: "deposit",
      args: [5_000_000n],
    });
  });

  it("writes no hourly limit as zero", () => {
    const call = vault.setMerchantCap(VAULT, PEER, { perPayment: 1n, perHour: null, perDay: 5n });
    expect(decodeFunctionData({ abi: PAYMENT_GUARD_ABI, data: call.data }).args).toEqual([
      PEER,
      1n,
      0n,
      5n,
    ]);
  });

  it("sends MON as a plain transfer", () => {
    expect(transfers.mon(PEER, 7n)).toEqual({ to: PEER, data: "0x", value: 7n });
  });
});

const verdict = (decision: AnalyzeResponse["decision"], expiresInMs = 30_000) =>
  ({
    decision,
    findings: [],
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
  }) as unknown as AnalyzeResponse;

function setup(answer: AnalyzeResponse) {
  const sent: `0x${string}`[] = [];
  const asked: unknown[] = [];
  const chain: WalletChain = {
    balances: async () => [],
    findVault: async () => null,
    vault: async () => {
      throw new Error("not used");
    },
    prepare: async (_from, call) => ({
      chainId: 10143,
      type: "eip1559",
      to: call.to,
      data: call.data,
      value: call.value,
      nonce: 0,
      gas: 60_000n,
      maxFeePerGas: 100n,
      maxPriorityFeePerGas: 1n,
    }),
    send: async (raw) => {
      sent.push(raw);
      return keccak256(raw);
    },
    wait: async (hash) => ({ hash, ok: true, block: 1n, fee: 1n }),
  };
  const session = new WalletSession(PRF);
  const wallet = new Wallet({
    session,
    chain,
    baretUrl: "http://unused",
    policy: () => ({ allowWarnings: true }) as never,
    guard: {
      evaluate: async (req) => {
        asked.push(req);
        return answer;
      },
    },
  });
  return { wallet, session, sent, asked };
}

describe("Wallet", () => {
  const call: WalletCall = transfers.mon(PEER, 1_000n);

  it("signs a Safe request with the passkey account and sends it", async () => {
    const { wallet, sent, asked } = setup(verdict("safe"));
    const { verdict: v, receipt } = await wallet.checkAndSign(call);
    expect(v.decision).toBe("safe");
    expect(receipt.ok).toBe(true);
    expect(asked[0]).toMatchObject({
      userWallet: wallet.address,
      transaction: { to: PEER, value: "1000" },
    });
    const tx = parseTransaction(sent[0] as `0x${string}`);
    expect(tx.to?.toLowerCase()).toBe(PEER.toLowerCase());
    expect(tx.value).toBe(1_000n);
  });

  it("signs a Caution only when the owner says they read it", async () => {
    const { wallet, sent } = setup(verdict("caution"));
    const v = await wallet.check(call);
    await expect(wallet.sign(call, v)).rejects.toBeInstanceOf(NotClearedError);
    expect(sent).toHaveLength(0);
    await wallet.sign(call, v, { acknowledged: true });
    expect(sent).toHaveLength(1);
  });

  it("never signs a Blocked request, acknowledged or not", async () => {
    const { wallet, sent } = setup(verdict("blocked"));
    const v = await wallet.check(call);
    await expect(wallet.sign(call, v, { acknowledged: true })).rejects.toBeInstanceOf(
      NotClearedError,
    );
    expect(sent).toHaveLength(0);
  });

  it("refuses a verdict that has expired", async () => {
    const { wallet, sent } = setup(verdict("safe", -1));
    const v = await wallet.check(call);
    await expect(wallet.sign(call, v)).rejects.toThrow(/expired/);
    expect(sent).toHaveLength(0);
  });

  it("cannot sign once the wallet is locked", async () => {
    const { wallet, session } = setup(verdict("safe"));
    const v = await wallet.check(call);
    session.lock();
    await expect(wallet.sign(call, v)).rejects.toThrow(/locked/);
  });
});
