/**
 * The wallet's whole life on Monad testnet, through @baret/wallet-core and
 * a Baret server, with real transactions:
 *
 *   open a vault → fund it → authorise an agent key derived from the passkey
 *   → cap a merchant → the agent pays → revoke → the agent can no longer pay
 *
 * A browser passkey cannot run in a terminal, so the passkey's PRF output
 * comes from BARET_WALLET_TEST_PRF (64 hex characters). Everything after
 * that is the code the wallet app runs.
 *
 *   BARET_WALLET_TEST_PRF=<hex> pnpm --filter @baret/server verify:wallet -- --api http://localhost:8080
 *
 * The wallet needs about 0.5 MON and 1 test USDC; the agent key about 0.1 MON.
 */
import { AgentWallet, GuardBlockedError, localSigner } from "@baret/agent-kit";
import { createPolicy } from "@baret/guard";
import {
  createWalletChain,
  NotClearedError,
  vault as vaultCalls,
  WALLET_CONTRACTS,
  Wallet,
  type WalletCall,
  WalletSession,
} from "@baret/wallet-core";
import { type Address, getAddress, hexToBytes, isHex } from "viem";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const api = (arg("api") ?? "http://localhost:8080").replace(/\/+$/, "");
const rpcUrl = process.env.MONAD_TESTNET_RPC_URL ?? "https://testnet-rpc.monad.xyz";
const prf = process.env.BARET_WALLET_TEST_PRF;
if (!prf || !isHex(`0x${prf}`) || prf.length !== 64) {
  console.error("BARET_WALLET_TEST_PRF must be 64 hex characters");
  process.exit(2);
}
const contracts = WALLET_CONTRACTS.testnet;
if (!contracts) throw new Error("no testnet contracts");
const MERCHANT = getAddress(arg("merchant") ?? "0x1365566191bAA9872A64AcDce963751d5343ff49");

const session = new WalletSession(hexToBytes(`0x${prf}`));
const chain = createWalletChain({ rpcUrl });
const policy = createPolicy("balanced", { allowedAssets: [contracts.usdc] });
const wallet = new Wallet({ session, chain, baretUrl: api, policy: () => policy });
const agentKey = session.agentKey(0);

if (process.argv.includes("--addresses")) {
  console.log(JSON.stringify({ wallet: wallet.address, agent: agentKey.address }));
  process.exit(0);
}

let failed = 0;
const step = (name: string, ok: boolean, detail: string) => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${name.padEnd(46)} ${detail}`);
};

/** Signs one call the way the sign screen would: Safe at once, Caution after reading. */
async function sign(name: string, call: WalletCall, expect: "safe" | "caution") {
  const verdict = await wallet.check(call);
  const codes = verdict.findings.map((f) => f.code).join(", ") || "-";
  if (verdict.decision !== expect) {
    step(name, false, `Baret said ${verdict.decision} [${codes}], expected ${expect}`);
    throw new Error("stopping: an unexpected verdict");
  }
  const hash = await wallet.sign(call, verdict, { acknowledged: expect === "caution" });
  const receipt = await chain.wait(hash);
  step(name, receipt.ok, `${verdict.decision} [${codes}] ${hash.slice(0, 12)}…`);
  if (!receipt.ok) throw new Error("stopping: the transaction reverted");
}

const balances = await chain.balances(wallet.address, [contracts.usdc]);
console.log(`wallet ${wallet.address}  agent key ${agentKey.address}`);
console.log(
  `balances: ${balances.map((b) => `${Number(b.amount) / 10 ** b.decimals} ${b.symbol}`).join(", ")}\n`,
);

let vault: Address | null = await chain.findVault(wallet.address);
if (!vault) {
  await sign(
    "open a vault",
    vaultCalls.create(contracts.paymentGuardFactory, contracts.usdc),
    "safe",
  );
  vault = await chain.findVault(wallet.address);
}
if (!vault) throw new Error("the factory did not record the vault");
step("the factory knows the vault", true, vault);

const [approve, deposit] = vaultCalls.deposit(vault, contracts.usdc, 500_000n);
await sign("allow the vault exactly 0.5 USDC", approve, "caution");
await sign("deposit 0.5 USDC", deposit, "safe");
await sign(
  "authorise the passkey-derived agent key",
  vaultCalls.setAgent(vault, agentKey.address),
  "safe",
);
await sign(
  "cap the merchant: 0.2 a payment, 0.4 a day",
  vaultCalls.setMerchantCap(vault, MERCHANT, {
    perPayment: 200_000n,
    perHour: null,
    perDay: 400_000n,
  }),
  "safe",
);

const state = await chain.vault(vault, [MERCHANT]);
step(
  "the vault reads back what was set",
  state.agent === agentKey.address &&
    state.merchants[0]?.perPayment === 200_000n &&
    state.balance >= 500_000n,
  `agent ${state.agent?.slice(0, 10)}…, balance ${Number(state.balance) / 1e6} USDC, reserved ${Number(state.reserved) / 1e6}`,
);

// The agent runs elsewhere with the key it was handed.
const agent = new AgentWallet({
  signer: localSigner(agentKey.privateKey),
  baretUrl: api,
  rpcUrl,
  policy,
});
const paid = await agent.pay({
  vault,
  merchant: MERCHANT,
  amount: 100_000n,
  reference: "wallet-check-1",
});
step(
  "the agent pays 0.1 USDC from the vault",
  (await chain.wait(paid.hash)).ok,
  `${paid.verdict.decision} ${paid.hash.slice(0, 12)}…`,
);

const tooMuch = await agent
  .pay({ vault, merchant: MERCHANT, amount: 300_000n, reference: "wallet-check-2" })
  .then(
    () => null,
    (e: unknown) => e,
  );
step(
  "the agent cannot pay above the cap",
  tooMuch instanceof GuardBlockedError,
  tooMuch instanceof Error ? tooMuch.message : "it was signed",
);

await sign("revoke the agent", vaultCalls.revokeAgent(vault), "safe");
const afterRevoke = await agent
  .pay({ vault, merchant: MERCHANT, amount: 100_000n, reference: "wallet-check-3" })
  .then(
    () => null,
    (e: unknown) => e,
  );
step(
  "the revoked agent cannot pay",
  afterRevoke instanceof GuardBlockedError,
  afterRevoke instanceof Error ? afterRevoke.message : "it was signed",
);

const blocked = await wallet.check({
  to: "0xac9517a70c88480c9fA7E9a280DA485F7f552C29",
  data: "0x",
  value: 1n,
});
const refused = await wallet
  .sign({ to: "0xac9517a70c88480c9fA7E9a280DA485F7f552C29", data: "0x", value: 1n }, blocked, {
    acknowledged: true,
  })
  .then(
    () => null,
    (e: unknown) => e,
  );
step(
  "the wallet refuses a Blocked request",
  blocked.decision === "blocked" && refused instanceof NotClearedError,
  `${blocked.decision} [${blocked.findings.map((f) => f.code).join(", ")}]`,
);

session.lock();
console.log(`\n${failed === 0 ? "every step agreed" : `${failed} step(s) disagreed`} with ${api}`);
process.exit(failed === 0 ? 0 : 1);
