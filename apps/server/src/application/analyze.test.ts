import {
  type AnalyzeRequest,
  type AnalyzeResponse,
  analyzeRequestSchema,
  FINDING_CODES,
} from "@baret/guard";
import { serializeTransaction } from "viem";
import { afterAll, describe, expect, it } from "vitest";
import {
  EIP1967_IMPLEMENTATION_SLOT,
  KNOWN_FUNCTIONS,
  ZOS_IMPLEMENTATION_SLOT,
} from "../simulation/abi.js";
import type { Sources } from "../sources/types.js";
import {
  approvalLog,
  approveData,
  calldata,
  cleanSources,
  config,
  DAPP,
  DRAINER,
  deps,
  FAKE_USDC,
  FakeRpc,
  frame,
  IMPL,
  implSlotValue,
  log,
  maxUint256,
  NFT,
  NOW,
  network,
  ONE_MON,
  ONE_USDC,
  PEER,
  policy,
  SHOP,
  transferLog,
  tx,
  USDC,
  USER,
} from "../testing/fake.js";
import { analyze } from "./analyze.js";

const emitted = new Set<string>();

async function run(
  req: AnalyzeRequest,
  rpc = new FakeRpc(),
  sources: Sources = cleanSources(),
): Promise<AnalyzeResponse> {
  const res = await analyze(req, deps(rpc, sources));
  for (const f of res.findings) emitted.add(f.code);
  return res;
}

const codes = (r: AnalyzeResponse) => r.findings.map((f) => f.code);

const sendMon = (to: string, value: bigint) => frame({ to, value: `0x${value.toString(16)}` });

describe("simulation", () => {
  it("passes a plain MON transfer to a known wallet", async () => {
    const rpc = new FakeRpc();
    rpc.frame = sendMon(PEER, ONE_MON);
    const r = await run(tx({ to: PEER, value: ONE_MON.toString() }), rpc);
    expect(r.decision).toBe("safe");
    expect(r.confidence).toBe("high");
    const mon = r.estimatedChanges.find((c) => c.asset.kind === "native");
    // One MON plus the fee for the whole gas limit (50k gas at 100 gwei).
    expect(mon?.delta).toBe((-(ONE_MON + 50_000n * 100n * 10n ** 9n)).toString());
  });

  it("blocks a request that would revert", async () => {
    const rpc = new FakeRpc();
    rpc.outcome = { ok: false, revertReason: "insufficient balance", revertData: null };
    const r = await run(tx({ to: PEER, value: "1" }), rpc);
    expect(r.decision).toBe("blocked");
    expect(r.firedRules).toContainEqual(
      expect.objectContaining({ rule: "requireSuccessfulSimulation", code: "SIMULATION_FAILED" }),
    );
    expect(r.confidence).toBe("low");
  });

  it("does not add unmeasurable-loss findings to a request that would revert", async () => {
    const rpc = new FakeRpc();
    rpc.outcome = { ok: false, revertReason: "ExceedsPerTxCap", revertData: null };
    rpc.estimate = null; // a revert has no gas estimate, so the fee is unknown
    const r = await run(tx({ to: PEER, value: "1" }), rpc);
    expect(codes(r)).toEqual(["SIMULATION_FAILED"]);
  });

  it("says when there is no trace", async () => {
    const r = await run(tx({ to: PEER, value: "1" }));
    expect(codes(r)).toContain("LOW_CONFIDENCE_INCOMPLETE_DATA");
    expect(r.decision).toBe("caution");
    expect(r.meta.traced).toBe(false);
  });

  it("rejects a request for another chain", async () => {
    await expect(analyze({ ...tx(), network: "mainnet" }, deps(new FakeRpc()))).rejects.toThrow(
      /does not serve/,
    );
  });
});

describe("approvals", () => {
  it("blocks an unlimited allowance under Balanced and suggests the amount needed", async () => {
    const rpc = new FakeRpc();
    rpc.code.set(USDC, "0x60");
    rpc.frame = frame({
      to: USDC,
      input: approveData(DAPP, maxUint256),
      logs: [
        approvalLog(USDC, USER, DAPP, maxUint256),
        transferLog(USDC, USER, DAPP, 5n * ONE_USDC),
      ],
    });
    const r = await run(tx({ to: USDC, data: approveData(DAPP, maxUint256) }), rpc);
    expect(r.decision).toBe("blocked");
    const f = r.findings.find((x) => x.code === "ERC20_APPROVAL_UNLIMITED");
    expect(f?.values).toEqual({ spender: DAPP, asset: "USDC", amount: "5" });
    expect(r.suggestions).toEqual([
      { code: "ERC20_APPROVAL_UNLIMITED", values: { amount: "5", asset: "USDC" } },
    ]);
    expect(r.approvals[0]).toMatchObject({ unlimited: true, spender: DAPP, symbol: "USDC" });
  });

  it("shows an unlimited allowance as Caution under Permissive", async () => {
    const rpc = new FakeRpc();
    rpc.frame = frame({ to: USDC, logs: [approvalLog(USDC, USER, DAPP, maxUint256)] });
    const r = await run(
      {
        ...tx({ to: USDC, data: approveData(DAPP, maxUint256) }),
        policy: policy({ blockUnlimitedApprovals: false }),
      },
      rpc,
    );
    expect(r.decision).toBe("caution");
    expect(r.findings.find((f) => f.code === "ERC20_APPROVAL_UNLIMITED")?.blocking).toBe(false);
  });

  it("reads a limited allowance, operator access and calldata-only approvals", async () => {
    const rpc = new FakeRpc();
    rpc.frame = frame({
      to: DAPP,
      logs: [
        approvalLog(USDC, USER, DAPP, 10n * ONE_USDC),
        log(
          NFT,
          "ApprovalForAll",
          { owner: USER, operator: DRAINER },
          {
            types: [{ type: "bool" }],
            values: [true],
          },
        ),
      ],
    });
    const r = await run(tx({ to: DAPP }), rpc);
    expect(codes(r)).toEqual(
      expect.arrayContaining(["ERC20_APPROVAL_GRANTED", "NFT_OPERATOR_GRANTED"]),
    );
    expect(r.findings.find((f) => f.code === "ERC20_APPROVAL_GRANTED")?.values.amount).toBe("10");

    const noTrace = await run(tx({ to: USDC, data: approveData(DAPP, 3n * ONE_USDC) }));
    expect(codes(noTrace)).toContain("ERC20_APPROVAL_GRANTED");
  });

  it("catches a permit signature", async () => {
    const r = await run({
      network: "testnet",
      policy: policy(),
      typedData: {
        signer: USER,
        domain: { name: "USD Coin", verifyingContract: USDC, chainId: 10143 },
        types: { Permit: [{ name: "owner", type: "address" }] },
        primaryType: "Permit",
        message: { owner: USER, spender: DRAINER, value: "1000000", nonce: 0, deadline: NOW + 60 },
      },
    });
    expect(codes(r)).toContain("PERMIT_SIGNATURE_DETECTED");
    expect(r.decision).toBe("blocked");
  });
});

describe("request shapes", () => {
  const unsigned = (chainId = 10143) =>
    serializeTransaction({
      chainId,
      type: "eip1559",
      to: PEER,
      value: 1n,
      maxFeePerGas: 100n * 10n ** 9n,
      gas: 21_000n,
    });

  it("takes an unsigned serialized transaction with userWallet as the sender", async () => {
    const r = await run({
      network: "testnet",
      transaction: { raw: unsigned() },
      userWallet: USER,
      policy: policy(),
    });
    expect(r.estimatedChanges[0]?.account).toBe(USER);
  });

  it("refuses an unsigned transaction with no sender, and one for another chain", async () => {
    await expect(
      analyze({ network: "testnet", transaction: { raw: unsigned() } }, deps(new FakeRpc())),
    ).rejects.toThrow(/userWallet/);
    await expect(
      analyze(
        { network: "testnet", transaction: { raw: unsigned(1) }, userWallet: USER },
        deps(new FakeRpc()),
      ),
    ).rejects.toThrow(/chain 1/);
  });

  it("applies a template by name with the network's USDC filled in", async () => {
    // Strict turns every finding into a block; Permissive lets this one through.
    const call = { ...tx({ to: USDC, data: approveData(DAPP, 3n * ONE_USDC) }), policy: undefined };
    const strict = await run({ ...call, policyTemplate: "strict" });
    const permissive = await run({ ...call, policyTemplate: "permissive" });
    expect(strict.decision).toBe("blocked");
    expect(permissive.decision).toBe("caution");
    expect(analyzeRequestSchema.safeParse({ ...tx(), policyTemplate: "strict" }).success).toBe(
      false,
    );
  });

  it("names a collection in an operator approval", async () => {
    const rpc = new FakeRpc();
    rpc.meta.set(NFT, { symbol: "NIGHT", decimals: null as unknown as number });
    rpc.frame = frame({
      to: NFT,
      logs: [
        log(
          NFT,
          "ApprovalForAll",
          { owner: USER, operator: DRAINER },
          {
            types: [{ type: "bool" }],
            values: [true],
          },
        ),
      ],
    });
    const r = await run(tx({ to: NFT }), rpc);
    expect(r.approvals[0]).toMatchObject({ kind: "operator", symbol: "NIGHT", decimals: null });
  });
});

describe("token metadata", () => {
  it("counts a token it cannot read in base units, named by its address", async () => {
    const rpc = new FakeRpc();
    const MYSTERY = "0xabcdef0000000000000000000000000000001234" as const;
    rpc.frame = frame({ to: MYSTERY, logs: [approvalLog(MYSTERY, USER, DAPP, 5_000n)] });
    const r = await run(tx({ to: MYSTERY, data: approveData(DAPP, 5_000n) }), rpc);
    expect(r.findings.find((f) => f.code === "ERC20_APPROVAL_GRANTED")?.values).toEqual({
      spender: DAPP,
      amount: "5000",
      asset: "0xABcD...1234", // checksummed, like every address the server returns
    });
  });
});

describe("contracts and dangerous calls", () => {
  it("flags unknown, reported, self-destructing and borrowed-code contracts", async () => {
    const rpc = new FakeRpc();
    for (const a of [DAPP, NFT, IMPL, FAKE_USDC]) rpc.code.set(a, "0x60");
    rpc.frame = frame({
      to: DAPP,
      calls: [
        frame({ from: DAPP, to: NFT, type: "DELEGATECALL" }),
        frame({ from: NFT, to: PEER, type: "SELFDESTRUCT" }),
        frame({ from: DAPP, to: FAKE_USDC }),
      ],
      logs: [
        log(
          DAPP,
          "OwnershipTransferred",
          { previousOwner: USER, newOwner: DRAINER },
          {
            types: [],
            values: [],
          },
        ),
      ],
    });
    const r = await run(
      tx({ to: DAPP }),
      rpc,
      cleanSources({
        registry: { [FAKE_USDC]: { flagged: true, severity: 2, reasonCode: "SPOOF" } },
      }),
    );
    expect(codes(r)).toEqual(
      expect.arrayContaining([
        "UNKNOWN_CONTRACT_EXPOSURE",
        "RISKY_CONTRACT_INTERACTION",
        "SELFDESTRUCT_CALL",
        "DELEGATECALL_DETECTED",
        "OWNERSHIP_TRANSFER",
      ]),
    );
    expect(r.decision).toBe("blocked");
  });

  it("blocks a call that pays an unknown contract and brings nothing back", async () => {
    const pays = () => {
      const rpc = new FakeRpc();
      rpc.code.set(DAPP, "0x60");
      rpc.frame = sendMon(DAPP, ONE_MON / 10n);
      return rpc;
    };
    const stake = { to: DAPP, value: (ONE_MON / 10n).toString(), data: "0x3a4b66f1" as const };
    const r = await run(tx(stake), pays());
    const kept = r.findings.find((f) => f.code === "VALUE_KEPT_BY_UNKNOWN_CONTRACT");
    expect(kept?.values).toEqual({ contract: DAPP, amount: "0.1", asset: "MON" });
    // A small share of the balance: the loss limit says nothing, the new finding blocks.
    expect(codes(r)).not.toContain("ESTIMATED_LOSS_EXCEEDS_MAX");
    expect(r.decision).toBe("blocked");
    expect(r.firedRules.map((f) => f.rule)).toContain("blockRiskyContracts");

    // With the rule off it is still shown, and no longer blocks.
    const off = await run({ ...tx(stake), policy: policy({ blockRiskyContracts: false }) }, pays());
    expect(codes(off)).toContain("VALUE_KEPT_BY_UNKNOWN_CONTRACT");
    expect(off.decision).toBe("caution");
  });

  it("does not call a plain transfer, a known contract or an exchange a kept payment", async () => {
    // No calldata: a transfer to a contract address, whose recipient the user chose.
    const plain = new FakeRpc();
    plain.code.set(DAPP, "0x60");
    plain.frame = sendMon(DAPP, ONE_MON / 10n);
    const transfer = await run(tx({ to: DAPP, value: (ONE_MON / 10n).toString() }), plain);
    expect(codes(transfer)).toEqual(["UNKNOWN_CONTRACT_EXPOSURE"]);

    // The unknown contract sends a token back in the same transaction.
    const swap = new FakeRpc();
    for (const a of [DAPP, FAKE_USDC]) swap.code.set(a, "0x60");
    swap.frame = frame({
      to: DAPP,
      value: `0x${(ONE_MON / 10n).toString(16)}`,
      calls: [
        frame({ from: DAPP, to: FAKE_USDC, logs: [transferLog(FAKE_USDC, DAPP, USER, ONE_USDC)] }),
      ],
    });
    const swapped = await run(
      tx({ to: DAPP, value: (ONE_MON / 10n).toString(), data: "0x3a4b66f1" }),
      swap,
    );
    expect(codes(swapped)).not.toContain("VALUE_KEPT_BY_UNKNOWN_CONTRACT");
  });

  it("knows a vault the PaymentGuard factory deployed, and only with a factory configured", async () => {
    const vault = () => {
      const rpc = new FakeRpc();
      rpc.code.set(DAPP, "0x60");
      rpc.vaults.add(DAPP);
      rpc.frame = frame({ to: DAPP });
      return rpc;
    };
    const plain = await run(tx({ to: DAPP }), vault());
    expect(codes(plain)).toContain("UNKNOWN_CONTRACT_EXPOSURE");

    const withFactory = {
      ...deps(vault()),
      config: {
        ...config,
        networks: { testnet: { ...network, paymentGuardFactoryAddress: IMPL } },
      },
    };
    const r = await analyze(tx({ to: DAPP }), withFactory);
    expect(r.findings).toEqual([]);
  });

  it("does not report a standard proxy calling its own implementation", async () => {
    const rpc = new FakeRpc();
    rpc.code.set(USDC, "0x60");
    rpc.storage.set(`${USDC}:${EIP1967_IMPLEMENTATION_SLOT}`, implSlotValue(IMPL));
    rpc.code.set(IMPL, "0x60");
    rpc.frame = frame({ to: USDC, calls: [frame({ from: USDC, to: IMPL, type: "DELEGATECALL" })] });
    const r = await run(tx({ to: USDC }), rpc);
    expect(codes(r)).not.toContain("DELEGATECALL_DETECTED");
    // The implementation is covered by the proxy: USDC is known, so nothing is unknown.
    expect(r.findings).toEqual([]);
  });

  it("knows the proxies that predate EIP-1967, such as USDC's", async () => {
    const rpc = new FakeRpc();
    rpc.code.set(USDC, "0x60");
    rpc.code.set(IMPL, "0x60");
    rpc.storage.set(`${USDC}:${ZOS_IMPLEMENTATION_SLOT}`, implSlotValue(IMPL));
    rpc.frame = frame({ to: USDC, calls: [frame({ from: USDC, to: IMPL, type: "DELEGATECALL" })] });
    const r = await run(tx({ to: USDC }), rpc);
    expect(r.findings).toEqual([]);
  });

  it("flags deep nesting, many operations and a gas limit above the rule", async () => {
    const rpc = new FakeRpc();
    let leaf = frame({ from: DAPP, to: DAPP });
    for (let i = 0; i < 5; i++) leaf = frame({ from: DAPP, to: DAPP, calls: [leaf] });
    rpc.frame = frame({
      to: DAPP,
      calls: [leaf, ...Array.from({ length: 12 }, () => frame({ from: DAPP, to: PEER }))],
    });
    const r = await run(
      { ...tx({ to: DAPP, gas: "3000000" }), policy: policy({ maxGas: 1_000_000 }) },
      rpc,
    );
    expect(codes(r)).toEqual(
      expect.arrayContaining(["DEEP_CALL_NESTING", "HIGH_OPERATION_COUNT", "EXCESSIVE_GAS"]),
    );
    expect(r.findings.find((f) => f.code === "EXCESSIVE_GAS")?.values).toEqual({
      actual: "3000000",
      limit: "1000000",
    });
  });
});

describe("reputation", () => {
  it("blocks a listed address and labels the counterparty", async () => {
    const rpc = new FakeRpc();
    rpc.frame = sendMon(DRAINER, 1n);
    const r = await run(
      { ...tx({ to: DRAINER, value: "1" }), policy: policy({ minNansenTrustLevel: "identified" }) },
      rpc,
      cleanSources({
        registry: { [DRAINER]: { flagged: true, severity: 4, reasonCode: "DRAINER" } },
      }),
    );
    expect(codes(r)).toContain("KNOWN_MALICIOUS_ADDRESS");
    expect(r.decision).toBe("blocked");

    const peer = await run(
      { ...tx({ to: PEER, value: "1" }), policy: policy({ minNansenTrustLevel: "identified" }) },
      rpc,
      cleanSources({ nansen: { [PEER]: { trustLevel: "new", freshWallet: true, whale: true } } }),
    );
    expect(codes(peer)).toEqual(
      expect.arrayContaining([
        "NANSEN_FLAGGED_FRESH_WALLET",
        "NANSEN_FLAGGED_WHALE_COUNTERPARTY",
        "NANSEN_TRUST_BELOW_MINIMUM",
      ]),
    );
    expect(peer.findings.find((f) => f.code === "NANSEN_TRUST_BELOW_MINIMUM")?.values).toEqual({
      address: PEER,
      actual: "new",
      limit: "identified",
    });
  });

  it("fails closed when the registry, which the blocklist rules need, does not answer", async () => {
    const r = await run(
      tx({ to: PEER, value: "1" }),
      new FakeRpc(),
      cleanSources({ registry: null }),
    );
    expect(r.decision).toBe("blocked");
    expect(r.firedRules[0]).toMatchObject({
      code: "REPUTATION_DATA_UNAVAILABLE",
      rule: "blockKnownMalicious",
    });
    expect(r.sources.find((s) => s.name === "reputation-registry")?.status).toBe("unavailable");
  });

  it("does not need Nansen for the blocklist rules, only for the trust level rule", async () => {
    const noNansen = cleanSources({ nansen: null });
    const balanced = await run(tx({ to: PEER, value: "1" }), new FakeRpc(), noNansen);
    expect(codes(balanced)).not.toContain("REPUTATION_DATA_UNAVAILABLE");

    const strictTrust = await run(
      { ...tx({ to: PEER, value: "1" }), policy: policy({ minNansenTrustLevel: "established" }) },
      new FakeRpc(),
      noNansen,
    );
    expect(strictTrust.firedRules[0]).toMatchObject({
      code: "REPUTATION_DATA_UNAVAILABLE",
      rule: "minNansenTrustLevel",
    });
  });

  it("asks Nansen about wallets, not contracts", async () => {
    const asked: string[] = [];
    const sources = cleanSources();
    const nansen = sources.nansen;
    sources.nansen = nansen && {
      lookup: async (as) => {
        asked.push(...as);
        return nansen.lookup(as);
      },
    };
    const rpc = new FakeRpc();
    rpc.code.set(DAPP, "0x60");
    rpc.frame = frame({ to: DAPP, logs: [transferLog(USDC, USER, PEER, ONE_USDC)] });
    await run(tx({ to: DAPP }), rpc, sources);
    expect(asked).toEqual([PEER]);
  });

  it("does not need reputation when no rule asks for it", async () => {
    const r = await run(
      {
        ...tx({ to: PEER, value: "1" }),
        policy: policy({ blockKnownMalicious: false, blockRiskyContracts: false }),
      },
      new FakeRpc(),
      cleanSources({ nansen: null, registry: null }),
    );
    expect(codes(r)).not.toContain("REPUTATION_DATA_UNAVAILABLE");
  });
});

describe("compliance", () => {
  const usdcSend = (to: string) => {
    const rpc = new FakeRpc();
    rpc.frame = frame({ to: USDC, logs: [transferLog(USDC, USER, to as `0x${string}`, ONE_USDC)] });
    return rpc;
  };
  const strictId = policy({
    requireComplianceCheck: true,
    allowedCountries: ["DE"],
    minComplianceTier: 2,
  });
  const good = { expiresAt: NOW + 1000, countries: ["DE"], tier: 3 };

  it("checks both sides and names the side", async () => {
    const r = await run(
      { ...tx({ to: USDC }), policy: strictId },
      usdcSend(PEER),
      cleanSources({ compliance: { [USER]: null, [PEER]: good } }),
    );
    const f = r.findings.find((x) => x.code === "COMPLIANCE_NO_CREDENTIAL");
    expect(f?.details?.side).toBe("self");
    expect(r.decision).toBe("blocked");
  });

  it("checks expiry, country and level of the recipient", async () => {
    const expired = await run(
      { ...tx({ to: USDC }), policy: strictId },
      usdcSend(PEER),
      cleanSources({ compliance: { [USER]: good, [PEER]: { ...good, expiresAt: NOW - 1 } } }),
    );
    expect(codes(expired)).toContain("COMPLIANCE_EXPIRED");

    const elsewhere = await run(
      { ...tx({ to: USDC }), policy: strictId },
      usdcSend(PEER),
      cleanSources({
        compliance: { [USER]: good, [PEER]: { ...good, countries: ["DE", "FR"], tier: 1 } },
      }),
    );
    expect(codes(elsewhere)).toEqual(
      expect.arrayContaining(["COMPLIANCE_COUNTRY_DISALLOWED", "COMPLIANCE_TIER_INSUFFICIENT"]),
    );
  });

  it("names the party a CompliantPaymentGuard refused, before anything is signed", async () => {
    const rpc = new FakeRpc();
    rpc.code.set(DAPP, "0x60");
    // NotVerified(PEER, NoCredential): the guard's typed refusal.
    const revertData = `0x0c2b355f${PEER.slice(2).toLowerCase().padStart(64, "0")}${"0".repeat(64)}`;
    rpc.outcome = { ok: false, revertReason: null, revertData: revertData as `0x${string}` };
    const r = await run(tx({ to: DAPP, data: "0x8b7bd0a5" }), rpc);
    const finding = r.findings.find((f) => f.code === "COMPLIANCE_NO_CREDENTIAL");
    expect(finding?.values).toEqual({ recipient: PEER });
    expect(finding?.details).toMatchObject({ side: "recipient", reason: "NoCredential" });
    expect(codes(r)).toContain("SIMULATION_FAILED");
    expect(r.decision).toBe("blocked");
  });

  it("accepts a credential that does not expire, and refuses one with no country on it", async () => {
    const forever = { ...good, expiresAt: null };
    const ok = await run(
      { ...tx({ to: USDC }), policy: strictId },
      usdcSend(PEER),
      cleanSources({ compliance: { [USER]: forever, [PEER]: forever } }),
    );
    expect(codes(ok).filter((c) => c.startsWith("COMPLIANCE_"))).toEqual([]);

    const nowhere = await run(
      { ...tx({ to: USDC }), policy: strictId },
      usdcSend(PEER),
      cleanSources({ compliance: { [USER]: good, [PEER]: { ...good, countries: [] } } }),
    );
    expect(codes(nowhere)).toContain("COMPLIANCE_COUNTRY_DISALLOWED");
  });

  it("checks both sides of a compliant asset even when no rule asks for identity", async () => {
    const noRules = { ...tx({ to: USDC }), policy: policy() };
    const refused = await run(
      noRules,
      usdcSend(PEER),
      cleanSources({ compliance: { [USER]: good, [PEER]: null }, gated: [USDC] }),
    );
    const f = refused.findings.find((x) => x.code === "COMPLIANCE_NO_CREDENTIAL");
    expect(f).toMatchObject({ blocking: true, details: { side: "recipient", asset: USDC } });
    expect(refused.decision).toBe("blocked");
    expect(refused.sources).toContainEqual({ name: "cleanverse", status: "ok" });

    const fine = await run(
      noRules,
      usdcSend(PEER),
      cleanSources({ compliance: { [USER]: good, [PEER]: good }, gated: [USDC] }),
    );
    expect(codes(fine).filter((c) => c.startsWith("COMPLIANCE_"))).toEqual([]);
  });

  it("leaves an ordinary token alone when no rule asks for identity", async () => {
    const r = await run(
      { ...tx({ to: USDC }), policy: policy() },
      usdcSend(PEER),
      cleanSources({ compliance: { [USER]: null, [PEER]: null } }),
    );
    expect(codes(r).filter((c) => c.startsWith("COMPLIANCE_"))).toEqual([]);
    expect(r.sources).toContainEqual({ name: "cleanverse", status: "skipped" });
  });

  it("fails closed when Cleanverse does not answer", async () => {
    const r = await run(
      { ...tx({ to: USDC }), policy: strictId },
      usdcSend(PEER),
      cleanSources({ compliance: null }),
    );
    expect(codes(r)).toEqual(["COMPLIANCE_DATA_UNAVAILABLE"]);
    expect(r.decision).toBe("blocked");
  });
});

describe("loss limits", () => {
  it("blocks a request that takes more than the loss limit", async () => {
    const rpc = new FakeRpc();
    rpc.frame = sendMon(PEER, 60n * ONE_MON);
    const r = await run(tx({ to: PEER, value: (60n * ONE_MON).toString() }), rpc);
    expect(r.findings.find((f) => f.code === "ESTIMATED_LOSS_EXCEEDS_MAX")?.values.limit).toBe(
      "50%",
    );
    expect(r.decision).toBe("blocked");
  });

  it("does not count an exchange with a listed contract as a loss", async () => {
    // 80 of 100 MON staked for a receipt token, minted to the user by the pool.
    const stake = () => {
      const rpc = new FakeRpc();
      rpc.code.set(DAPP, "0x60");
      rpc.frame = frame({
        to: DAPP,
        value: `0x${(80n * ONE_MON).toString(16)}`,
        logs: [transferLog(NFT, "0x0000000000000000000000000000000000000000", USER, 80n * ONE_MON)],
      });
      return rpc;
    };
    const request = tx({ to: DAPP, value: (80n * ONE_MON).toString() });

    const unlisted = await run(request, stake());
    expect(codes(unlisted)).toContain("ESTIMATED_LOSS_EXCEEDS_MAX");

    const listed = {
      ...deps(stake()),
      config: { ...config, networks: { testnet: { ...network, knownContracts: [DAPP, NFT] } } },
    };
    const r = await analyze(request, listed);
    expect(r.findings.map((f) => f.code)).not.toContain("ESTIMATED_LOSS_EXCEEDS_MAX");
    expect(r.decision).toBe("safe");
  });

  it("still measures a payment to a listed contract that returns nothing", async () => {
    const rpc = new FakeRpc();
    rpc.code.set(DAPP, "0x60");
    rpc.frame = sendMon(DAPP, 80n * ONE_MON);
    const listed = {
      ...deps(rpc),
      config: { ...config, networks: { testnet: { ...network, knownContracts: [DAPP] } } },
    };
    const r = await analyze(tx({ to: DAPP, value: (80n * ONE_MON).toString() }), listed);
    expect(r.findings.map((f) => f.code)).toContain("ESTIMATED_LOSS_EXCEEDS_MAX");
  });

  it("fails closed when the balance cannot be read", async () => {
    const rpc = new FakeRpc();
    rpc.balanceFails = true;
    rpc.frame = sendMon(PEER, ONE_MON);
    const r = await run(tx({ to: PEER, value: ONE_MON.toString() }), rpc);
    expect(codes(r)).toEqual(
      expect.arrayContaining(["LOSS_PERCENT_UNAVAILABLE", "POST_BALANCE_UNAVAILABLE"]),
    );
  });

  it("keeps the MON and USDC floors", async () => {
    const rpc = new FakeRpc();
    rpc.frame = frame({
      to: USDC,
      value: `0x${(99n * ONE_MON).toString(16)}`,
      logs: [transferLog(USDC, USER, PEER, 999n * ONE_USDC)],
    });
    const r = await run(
      {
        ...tx({ to: USDC, value: (99n * ONE_MON).toString() }),
        policy: policy({
          maxLossPercent: null,
          minPostNativeBalance: "5",
          minPostUsdcBalance: "10",
        }),
      },
      rpc,
    );
    const floors = r.findings.filter((f) => f.code === "POST_BALANCE_TOO_LOW");
    expect(floors.map((f) => f.values.asset).sort()).toEqual(["MON", "USDC"]);
    expect(floors.find((f) => f.values.asset === "USDC")?.values).toEqual({
      actual: "1",
      limit: "10",
      asset: "USDC",
    });
  });
});

describe("x402 payments", () => {
  const pay = (over: Partial<{ to: string; token: string; value: string }> = {}) => ({
    signer: USER,
    domain: { name: "USDC", verifyingContract: over.token ?? USDC, chainId: 10143 },
    types: { TransferWithAuthorization: [{ name: "from", type: "address" }] },
    primaryType: "TransferWithAuthorization",
    message: { from: USER, to: over.to ?? SHOP, value: over.value ?? "1000000" },
  });
  const payment = (over: Record<string, unknown> = {}) => ({
    origin: "https://shop.example",
    payTo: SHOP,
    asset: USDC,
    amount: "1000000",
    memo: "inv-1",
    spendHistory: [],
    ...over,
  });

  it("lets a payment within every rule through", async () => {
    const r = await run({
      network: "testnet",
      policy: policy(),
      typedData: pay(),
      payment: payment(),
    });
    expect(r.findings).toEqual([]);
    expect(r.decision).toBe("safe");
  });

  it("catches a tampered destination and asset", async () => {
    const r = await run({
      network: "testnet",
      policy: policy({ allowWarnings: false }),
      typedData: pay({ to: DRAINER, token: FAKE_USDC }),
      payment: payment(),
    });
    expect(codes(r)).toEqual(
      expect.arrayContaining([
        "X402_DESTINATION_MISMATCH",
        "X402_ASSET_MISMATCH",
        "X402_NON_CANONICAL_ASSET",
      ]),
    );
    expect(r.findings.find((f) => f.code === "X402_ASSET_MISMATCH")?.values).toEqual({
      expected: USDC,
      actual: FAKE_USDC,
    });
    expect(r.decision).toBe("blocked");
  });

  it("enforces the asset list, the reference and the merchant list", async () => {
    const r = await run({
      network: "testnet",
      policy: policy({
        allowedAssets: [],
        requireMemo: true,
        allowedMerchantOrigins: ["https://other.example"],
      }),
      typedData: pay(),
      payment: payment({ memo: null }),
    });
    expect(codes(r)).toEqual(
      expect.arrayContaining([
        "X402_ASSET_NOT_ALLOWED",
        "X402_MEMO_MISSING",
        "X402_MERCHANT_NOT_ALLOWED",
      ]),
    );
  });

  it("enforces caps over rolling windows", async () => {
    const r = await run({
      network: "testnet",
      policy: policy({ maxPerTxCap: "0.5", maxHourlyCap: "3", maxDailyCap: "4" }),
      typedData: pay(),
      payment: payment({
        spendHistory: [
          { amount: "2500000", timestamp: NOW - 600 },
          { amount: "1000000", timestamp: NOW - 7200 },
          { amount: "9000000", timestamp: NOW - 90_000 },
        ],
      }),
    });
    const byCode = Object.fromEntries(r.findings.map((f) => [f.code, f.values]));
    expect(byCode.X402_PER_TX_CAP_EXCEEDED).toEqual({
      origin: "https://shop.example",
      actual: "1",
      cap: "0.5",
    });
    expect(byCode.X402_HOURLY_CAP_EXCEEDED).toEqual({ amount: "1", actual: "3.5", cap: "3" });
    expect(byCode.X402_DAILY_CAP_EXCEEDED).toEqual({ amount: "1", actual: "4.5", cap: "4" });
  });

  it("fails closed without spend history when a window cap is set", async () => {
    const r = await run({
      network: "testnet",
      policy: policy(),
      typedData: pay(),
      payment: payment({ spendHistory: undefined }),
    });
    expect(codes(r)).toEqual(["X402_SPEND_HISTORY_UNAVAILABLE"]);
    expect(r.decision).toBe("blocked");
  });
});

describe("calldata fallback", () => {
  it("still sees a transfer when there is no trace", async () => {
    const data = calldata({
      abi: KNOWN_FUNCTIONS,
      functionName: "transfer",
      args: [PEER, 900n * ONE_USDC],
    });
    const r = await run(tx({ to: USDC, data }));
    expect(codes(r)).toContain("ESTIMATED_LOSS_EXCEEDS_MAX");
  });
});

afterAll(() => {
  // Dead-code ban: every finding code is produced by at least one scenario above.
  const missing = FINDING_CODES.filter((c) => !emitted.has(c));
  expect(missing).toEqual([]);
});
