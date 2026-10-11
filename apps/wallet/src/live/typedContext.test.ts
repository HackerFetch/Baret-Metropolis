import { describe, expect, it, vi } from "vitest";

// typedContext is pure; the module's passkey and chain imports are not needed here.
vi.mock("@baret/wallet-core", () => ({}));

import { typedContext } from "./live.js";
import { USDC } from "./storage.js";

const WALLET = `0x${"11".repeat(20)}`;
const MERCHANT = `0x${"22".repeat(20)}`;
const SITE = "https://scrybe.example";
const TYPES = { TransferWithAuthorization: [{ name: "to", type: "address" }] };

describe("a typed message on the sign screen", () => {
  it("reads an EIP-3009 transfer of the wallet's USDC as a payment in whole units", () => {
    const context = typedContext(
      SITE,
      {
        domain: { name: "USDC", version: "2", chainId: 10143, verifyingContract: USDC },
        types: TYPES,
        primaryType: "TransferWithAuthorization",
        message: { from: WALLET, to: MERCHANT, value: "50000" },
      },
      WALLET,
    );
    expect(context).toMatchObject({
      origin: SITE,
      action: "payment",
      impact: "payment",
      values: { amount: "0.05", asset: "USDC", merchant: MERCHANT },
      fee: "0",
      raw: { to: USDC, value: "0", data: "0x", decoded: "TransferWithAuthorization" },
    });
  });

  it("does not guess the units of a token it does not know", () => {
    const token = `0x${"33".repeat(20)}`;
    const context = typedContext(
      SITE,
      {
        domain: { verifyingContract: token },
        types: TYPES,
        primaryType: "TransferWithAuthorization",
        message: { to: MERCHANT, value: "50000" },
      },
      WALLET,
    );
    expect(context.values).toEqual({ amount: "50000", asset: token, merchant: MERCHANT });
  });

  it("names anything else as a message, by its type and its contract or site", () => {
    const permit = typedContext(
      SITE,
      {
        domain: { verifyingContract: USDC },
        types: { Permit: [{ name: "spender", type: "address" }] },
        primaryType: "Permit",
        message: { spender: MERCHANT },
      },
      WALLET,
    );
    expect(permit).toMatchObject({
      action: "message",
      impact: "message",
      values: { kind: "Permit", contract: USDC },
    });
    const bare = typedContext(
      SITE,
      { domain: {}, types: { Vote: [] }, primaryType: "Vote", message: {} },
      WALLET,
    );
    expect(bare.values).toEqual({ kind: "Vote", contract: "scrybe.example" });
  });
});
