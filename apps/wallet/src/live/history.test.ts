import { describe, expect, it } from "vitest";
import { activityOf } from "./history.js";

const MERCHANT = "0x1365566191bAA9872A64AcDce963751d5343ff49";
const AGENT = "0x454ae28357FeD61f732d368133d09D1887805c31";
const HASH = "0x8e1f4a7c0d3b6e9f2a5c8d1b4e7a0f3c6b9d2e5a8f1c4b7e0a3d6f9c2b5e8a1d";

describe("activityOf", () => {
  it("reads a paid row into a payment activity item", () => {
    const body = {
      activity: [
        {
          id: "va1",
          kind: "paid",
          merchant: MERCHANT.toLowerCase(),
          agent: AGENT.toLowerCase(),
          amount: "250000",
          timestamp: 1_760_000_000,
          block: 69_000_000,
          txHash: HASH,
        },
      ],
    };
    expect(activityOf(body)).toEqual([
      {
        id: "va1",
        kind: "payment",
        at: new Date(1_760_000_000 * 1000).toISOString(),
        values: { amount: "0.25", asset: "USDC", merchant: MERCHANT.toLowerCase() },
        verdict: null,
        findings: [],
        changes: [{ direction: "out", value: "0.25", unit: "USDC" }],
        hash: HASH,
        block: "69000000",
      },
    ]);
  });

  it("skips every kind but paid: the other nine have no row yet", () => {
    const body = {
      activity: [
        { kind: "created", timestamp: 1 },
        { kind: "deposited", amount: "100", timestamp: 2 },
        { kind: "withdrawn", amount: "100", timestamp: 3 },
        { kind: "merchantCapSet", merchant: MERCHANT, amount: "100", timestamp: 4 },
        { kind: "merchantPaused", merchant: MERCHANT, timestamp: 5 },
        { kind: "merchantResumed", merchant: MERCHANT, timestamp: 6 },
        { kind: "merchantRevoked", merchant: MERCHANT, timestamp: 7 },
        { kind: "agentSet", agent: AGENT, timestamp: 8 },
        { kind: "agentRevoked", agent: AGENT, timestamp: 9 },
      ],
    };
    expect(activityOf(body)).toEqual([]);
  });

  it("leaves out a paid row with no readable merchant, amount or time", () => {
    const base = { kind: "paid", merchant: MERCHANT, amount: "1000", timestamp: 100 };
    expect(activityOf({ activity: [{ ...base, merchant: "not an address" }] })).toEqual([]);
    expect(activityOf({ activity: [{ ...base, amount: "not a number" }] })).toEqual([]);
    expect(activityOf({ activity: [{ ...base, timestamp: "not a time" }] })).toEqual([]);
  });

  it("falls back to an id from the hash or the merchant and time, never undefined", () => {
    const row = { kind: "paid", merchant: MERCHANT, amount: "1000", timestamp: 100 };
    const [withHash] = activityOf({ activity: [{ ...row, txHash: HASH }] });
    expect(withHash?.id).toBe(HASH);
    const [withoutHash] = activityOf({ activity: [row] });
    expect(withoutHash?.id).toBe(`${MERCHANT}-${new Date(100_000).toISOString()}`);
  });

  it("leaves hash and block off the item when they are not a valid hash or number", () => {
    const row = { kind: "paid", merchant: MERCHANT, amount: "1000", timestamp: 100, txHash: "0x1" };
    const [item] = activityOf({ activity: [row] });
    expect(item?.hash).toBeUndefined();
    expect(item?.block).toBeUndefined();
  });

  it("reads real mixed activity from /v1/audit/vault/0x46f159…2158 (testnet, captured 2026-10-09)", () => {
    const body = {
      activity: [
        {
          id: "69543063-37",
          kind: "paid",
          merchant: "0x1365566191baa9872a64acdce963751d5343ff49",
          agent: "0x227ba9d7b649988c48662ac42360727ba971647e",
          amount: "100000",
          timestamp: 1_791_549_986,
          block: 69_543_063,
          txHash: "0x5bae7893322611b99738d1f688da8200c45e33408d7011aa0272e5faa990aff6",
        },
        {
          id: "69538897-3",
          kind: "deposited",
          merchant: null,
          agent: null,
          amount: "40000000",
          timestamp: 1_791_548_710,
          block: 69_538_897,
          txHash: "0x14c2c71bb12e1f4b094b140089b436e992cdc853efc14156a7c2d566b75ef278",
        },
        {
          id: "69536894-96",
          kind: "paid",
          merchant: "0x1365566191baa9872a64acdce963751d5343ff49",
          agent: "0x227ba9d7b649988c48662ac42360727ba971647e",
          amount: "100000",
          timestamp: 1_791_548_102,
          block: 69_536_894,
          txHash: "0x206bbd5cc3ee0ee092b52076d9da054b53e50b134c173427f87a7dc08821095d",
        },
        {
          id: "69536200-47",
          kind: "agentSet",
          merchant: null,
          agent: "0x227ba9d7b649988c48662ac42360727ba971647e",
          amount: null,
          timestamp: 1_791_547_889,
          block: 69_536_200,
          txHash: "0xf74f5754fca5cb75cb75392f3c9ccc7e572b020634b00d65d70e88e6687b0173",
        },
        {
          id: "69536197-11",
          kind: "merchantCapSet",
          merchant: "0x1365566191baa9872a64acdce963751d5343ff49",
          agent: null,
          amount: "5000000",
          timestamp: 1_791_547_888,
          block: 69_536_197,
          txHash: "0xa46b997349727964984dfd8e0c5a87caf41bf30b4ac556b6d76ba8ae43ff384d",
        },
        {
          id: "69536194-62",
          kind: "deposited",
          merchant: null,
          agent: null,
          amount: "10000000",
          timestamp: 1_791_547_887,
          block: 69_536_194,
          txHash: "0x77288b0db795b972e5e829e82809db1e2fed5eea6a03385a67fe96f5d836bdbc",
        },
      ],
    };
    const items = activityOf(body);
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.kind)).toEqual(["payment", "payment"]);
    expect(items[0]).toMatchObject({
      id: "69543063-37",
      values: {
        amount: "0.10",
        asset: "USDC",
        merchant: "0x1365566191baa9872a64acdce963751d5343ff49",
      },
      hash: "0x5bae7893322611b99738d1f688da8200c45e33408d7011aa0272e5faa990aff6",
      block: "69543063",
    });
  });

  it("reads nothing from a missing, malformed or empty body", () => {
    expect(activityOf(null)).toEqual([]);
    expect(activityOf({})).toEqual([]);
    expect(activityOf({ activity: "not an array" })).toEqual([]);
    expect(activityOf({ activity: [] })).toEqual([]);
  });
});
