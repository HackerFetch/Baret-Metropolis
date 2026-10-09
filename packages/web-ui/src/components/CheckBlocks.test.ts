import { describe, expect, it } from "vitest";
import { bodyOf, hasValues } from "./CheckBlocks.js";

const BASE = {
  body: "{recipient} has no credential, and your rules require one.",
  bodySelf: "Your account has no credential, and your rules require one.",
  bodyAsset: "{recipient} has no credential. {asset} can only move between verified wallets.",
  bodySelfAsset: "Your account has no credential. {asset} can only move between verified wallets.",
};

describe("bodyOf", () => {
  it("reads the plain body with no details", () => {
    const { template, values } = bodyOf(BASE, { values: { recipient: "0xabc" } });
    expect(template).toBe(BASE.body);
    expect(values).toEqual({ recipient: "0xabc" });
  });

  it("picks bodySelf when details.side is self", () => {
    const { template } = bodyOf(BASE, {
      values: { recipient: "0xabc" },
      details: { side: "self" },
    });
    expect(template).toBe(BASE.bodySelf);
  });

  it("picks bodyAsset and folds details.asset into {asset} when the asset, not a rule, demands it", () => {
    const { template, values } = bodyOf(BASE, {
      values: { recipient: "0xabc" },
      details: { asset: "aUSDC" },
    });
    expect(template).toBe(BASE.bodyAsset);
    expect(values).toEqual({ recipient: "0xabc", asset: "aUSDC" });
  });

  it("picks bodySelfAsset when both details are set", () => {
    const { template } = bodyOf(BASE, {
      values: {},
      details: { side: "self", asset: "aUSDC" },
    });
    expect(template).toBe(BASE.bodySelfAsset);
  });

  it("falls back down the chain when a variant is missing", () => {
    const noSelfAsset = { body: BASE.body, bodyAsset: BASE.bodyAsset };
    expect(
      bodyOf(noSelfAsset, { values: {}, details: { side: "self", asset: "aUSDC" } }).template,
    ).toBe(noSelfAsset.bodyAsset);
    const noAssetAtAll = { body: BASE.body, bodySelf: BASE.bodySelf };
    expect(bodyOf(noAssetAtAll, { values: {}, details: { asset: "aUSDC" } }).template).toBe(
      noAssetAtAll.body,
    );
  });

  it("ignores a non-string details.asset", () => {
    const { template, values } = bodyOf(BASE, { values: {}, details: { asset: 5 } });
    expect(template).toBe(BASE.body);
    expect(values).toEqual({});
  });
});

describe("hasValues", () => {
  it("is true when every placeholder has a non-empty value", () => {
    expect(hasValues("Send {amount} to {recipient}", { amount: "5", recipient: "0x1" })).toBe(true);
  });

  it("is false when a placeholder's value is missing or empty", () => {
    expect(hasValues("Send {amount} to {recipient}", { amount: "5" })).toBe(false);
    expect(hasValues("Send {amount} to {recipient}", { amount: "5", recipient: "" })).toBe(false);
  });

  it("is true for a template with no placeholders", () => {
    expect(hasValues("Nothing to fill in.", {})).toBe(true);
  });
});
