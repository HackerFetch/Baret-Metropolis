import type { AnalyzeResponse } from "@baret/guard";
import { describe, expect, it } from "vitest";
import {
  grantId,
  grantOf,
  grantsFrom,
  isPayment,
  paymentFrom,
  problemFrom,
  withGrants,
} from "./records.js";

const OWNER = "0x5aE13F1028144842f0384d09091067D6184F8197";
const TOKEN = "0x534b2f3A21130d7a60830c2Df862319e593943A3";
const SPENDER = "0x8D42f14012426F6a844BF0f5E6ab7889F8Cd79Eb";
const NFT = "0xC3fAFF337A197d7BFa49bB3210C0C057dd188688";
const NONCE = `0x${"07".repeat(32)}`;
const by = {
  owner: OWNER,
  account: "main",
  origin: "claimhub.example",
  at: "2026-10-11T10:00:00.000Z",
};

type Approval = AnalyzeResponse["approvals"][number];
const erc20 = (over: Partial<Approval> = {}): Approval => ({
  owner: OWNER,
  kind: "erc20",
  contract: TOKEN,
  symbol: "USDC",
  decimals: 6,
  spender: SPENDER,
  amount: "2500000",
  unlimited: false,
  ...over,
});

describe("grants from a signed transaction", () => {
  it("lists an allowance with its amount, and no limit as null", () => {
    const [limited] = grantsFrom([erc20()], by);
    expect(limited).toMatchObject({
      kind: "allowance",
      asset: "USDC",
      amount: "2.5",
      spender: SPENDER,
      holder: SPENDER,
      account: "main",
      origin: "claimhub.example",
      status: "active",
    });
    const [open] = grantsFrom([erc20({ unlimited: true })], by);
    expect(open).toMatchObject({ kind: "allowance", amount: null });
  });

  it("lists collection access, and names a contract with no symbol by its address", () => {
    const [grant] = grantsFrom(
      [
        erc20({
          kind: "operator",
          contract: NFT,
          symbol: null,
          decimals: null,
          amount: null,
          unlimited: true,
        }),
      ],
      by,
    );
    expect(grant).toMatchObject({ kind: "operator", operator: SPENDER, contract: "0xC3fA...8688" });
  });

  it("lists nothing for a revoke, a permit or somebody else's approval", () => {
    expect(grantsFrom([erc20({ amount: "0" })], by)).toEqual([]);
    expect(grantsFrom([erc20({ kind: "permit" })], by)).toEqual([]);
    expect(grantsFrom([erc20({ owner: SPENDER })], by)).toEqual([]);
  });

  it("keeps one row per contract and holder, and its id says what to read and revoke", () => {
    const first = grantsFrom([erc20()], by);
    const again = grantsFrom([erc20({ unlimited: true })], {
      ...by,
      at: "2026-10-11T11:00:00.000Z",
    });
    const list = withGrants(withGrants([], first), again);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ amount: null, granted: "2026-10-11T11:00:00.000Z" });
    expect(grantOf(list[0]?.id ?? "")).toEqual({
      kind: "allowance",
      contract: TOKEN.toLowerCase(),
      holder: SPENDER.toLowerCase(),
    });
    expect(grantOf("p-usdc")).toBeNull();
    expect(grantOf(grantId("operator", NFT, SPENDER, "acc-2"))?.kind).toBe("operator");
  });
});

describe("x402 payments from a signed message", () => {
  const typed = {
    domain: { name: "USDC", version: "2", chainId: 10143, verifyingContract: TOKEN },
    primaryType: "TransferWithAuthorization",
    message: { from: OWNER, to: SPENDER, value: "50000", nonce: NONCE },
  };
  const at = { origin: "scrybe.example", at: "2026-10-11T10:00:00.000Z", usdc: TOKEN };

  it("knows a payment from any other message", () => {
    expect(isPayment(typed)).toBe(true);
    expect(isPayment({ ...typed, primaryType: "Permit" })).toBe(false);
    expect(isPayment({ ...typed, message: { ...typed.message, to: "nobody" } })).toBe(false);
    expect(isPayment({ ...typed, message: { ...typed.message, nonce: "1" } })).toBe(false);
  });

  it("records it as checked, keyed the way the token keys it", () => {
    expect(paymentFrom(typed, { ...at, payer: OWNER })).toEqual({
      id: `${OWNER.toLowerCase()}:${NONCE}`,
      at: at.at,
      merchant: SPENDER,
      amount: "0.05",
      asset: "USDC",
      facilitator: "scrybe.example",
      stage: "checked",
      hash: null,
    });
    const other = { ...typed, domain: { verifyingContract: NFT } };
    expect(paymentFrom(other, { ...at, payer: OWNER })).toMatchObject({
      amount: "50000",
      asset: "0xC3fA...8688",
    });
  });

  it("names why a payment was not made", () => {
    const kind = (code: string | null) => problemFrom(typed, { ...at, code }).kind;
    expect(kind("X402_DESTINATION_MISMATCH")).toBe("mismatch");
    expect(kind("X402_ASSET_NOT_ALLOWED")).toBe("asset");
    expect(kind("X402_HOURLY_CAP_EXCEEDED")).toBe("overCap");
    expect(kind("UNLIMITED_APPROVAL")).toBe("declined");
    expect(kind(null)).toBe("declined");
  });
});
