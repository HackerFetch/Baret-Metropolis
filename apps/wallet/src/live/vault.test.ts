import type { VaultState } from "@baret/wallet-core";
import { describe, expect, it } from "vitest";
import { auditVaultOf, merchantAddresses, toVault, vaultUnits } from "./vault.js";

const VAULT = "0x35C80D511f2fC6923B3D82774ECB5315101ab011";
const MERCHANT = "0x1365566191bAA9872A64AcDce963751d5343ff49";
const AGENT = "0x454ae28357FeD61f732d368133d09D1887805c31";

const audit = {
  vault: {
    agent: AGENT.toLowerCase(),
    paymentCount: 2,
    merchants: [{ address: MERCHANT.toLowerCase() }, { address: "not an address" }],
  },
  activity: [
    { kind: "agentSet", agent: "0x0000000000000000000000000000000000000001", timestamp: 50 },
    { kind: "agentSet", agent: AGENT.toLowerCase(), timestamp: 100 },
    { kind: "paid", agent: AGENT.toLowerCase(), timestamp: 200 },
  ],
  payments: [
    { id: "p1", merchant: MERCHANT.toLowerCase(), amount: "250000", timestamp: 200 },
    { id: "p2", merchant: MERCHANT.toLowerCase(), amount: "a lot", timestamp: 300 },
  ],
};

const chain: VaultState = {
  address: VAULT,
  token: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
  balance: 550_000n,
  unreserved: 0n,
  reserved: 1_000_000n,
  agent: AGENT,
  merchants: [
    {
      address: MERCHANT,
      perPayment: 500_000n,
      perHour: null,
      perDay: 1_000_000n,
      spentLastHour: 250_000n,
      spentLastDay: 250_000n,
      status: "paused",
    },
    {
      address: "0x0000000000000000000000000000000000000002",
      perPayment: 0n,
      perHour: null,
      perDay: 0n,
      spentLastHour: 0n,
      spentLastDay: 0n,
      status: "removed",
    },
  ],
};

describe("auditVaultOf", () => {
  it("reads the merchants, the agent's start and the payments, and drops what it cannot read", () => {
    const read = auditVaultOf(audit);
    expect(read?.merchants).toEqual([MERCHANT.toLowerCase()]);
    expect(read?.paymentCount).toBe(2);
    expect(read?.agentSince).toBe(new Date(100_000).toISOString());
    expect(read?.payments).toEqual([
      {
        id: "p1",
        at: new Date(200_000).toISOString(),
        merchant: MERCHANT.toLowerCase(),
        amount: "0.25",
      },
    ]);
  });

  it("answers null for a body that is not a vault", () => {
    expect(auditVaultOf(null)).toBeNull();
    expect(auditVaultOf({ error: "not_found" })).toBeNull();
  });
});

describe("merchantAddresses", () => {
  it("asks the chain once per address, from the indexer and from this browser", () => {
    const labels = { [MERCHANT.toLowerCase()]: "scrybe.example", "0xabc": "bad" };
    expect(merchantAddresses(auditVaultOf(audit), labels)).toEqual([MERCHANT.toLowerCase()]);
    expect(merchantAddresses(null, labels)).toEqual([MERCHANT.toLowerCase()]);
    expect(merchantAddresses(null, {})).toEqual([]);
  });
});

describe("toVault", () => {
  it("shows the chain's figures, this browser's names and the indexer's dates", () => {
    const vault = toVault(chain, auditVaultOf(audit), { [MERCHANT.toLowerCase()]: "Scrybe" }, null);
    expect(vault.balance).toBe("0.55");
    expect(vault.merchants).toEqual([
      {
        address: MERCHANT,
        origin: "Scrybe",
        perPayment: "0.50",
        perHour: null,
        perDay: "1.00",
        spent: "0.25",
        status: "paused",
      },
    ]);
    expect(vault.agent).toEqual({
      address: AGENT,
      created: new Date(100_000).toISOString(),
      payments: 2,
    });
  });

  it("names a merchant by its address when nothing else is known, and has no agent when the vault has none", () => {
    const vault = toVault({ ...chain, agent: null }, null, {}, null);
    expect(vault.merchants[0]?.origin).toBe(MERCHANT);
    expect(vault.agent).toBeNull();
  });
});

describe("vaultUnits", () => {
  it("takes a positive amount in the vault's six decimals and nothing else", () => {
    expect(vaultUnits("0.8")).toBe(800_000n);
    expect(vaultUnits("0")).toBeNull();
    expect(vaultUnits("abc")).toBeNull();
  });
});
