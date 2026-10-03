import { claimhub, findings } from "@baret/content";
import { hasValues } from "@baret/web-ui/components/CheckBlocks";
import { describe, expect, it } from "vitest";
import { VIEWS } from "./Glyph.js";
import { isWallet, SAMPLE, sampleCheck, walletFor } from "./sample.js";
import { SOURCE } from "./source.js";

describe("ClaimHub eligibility", () => {
  it("checks the connected wallet when the field is empty, else the address typed", () => {
    expect(walletFor("", SAMPLE.wallet)).toBe(SAMPLE.wallet);
    expect(walletFor("  ", SAMPLE.wallet)).toBe(SAMPLE.wallet);
    expect(walletFor(` ${SAMPLE.spender} `, SAMPLE.wallet)).toBe(SAMPLE.spender);
  });

  it("refuses text that is not an address", () => {
    expect(walletFor("my-wallet.eth", SAMPLE.wallet)).toBeNull();
    expect(walletFor("0x1234", SAMPLE.wallet)).toBeNull();
    expect(isWallet(SAMPLE.distributor)).toBe(true);
  });
});

describe("ClaimHub sample", () => {
  it("passes the honest claim: Safe, HUB in and nothing out", () => {
    expect(sampleCheck("safe")).toEqual({
      source: "sample",
      verdict: "safe",
      findings: [],
      changes: [{ direction: "in", value: "2,410", unit: "HUB" }],
      approvals: [],
    });
  });

  it("blocks the attack twice: an unlimited USDC allowance to a listed spender", () => {
    const result = sampleCheck("danger");
    expect(result.verdict).toBe("blocked");
    expect(result.findings.map((f) => f.code)).toEqual([
      "ERC20_APPROVAL_UNLIMITED",
      "KNOWN_MALICIOUS_ADDRESS",
    ]);
    for (const finding of result.findings) {
      expect(hasValues(findings[finding.code].body, finding.values)).toBe(true);
    }
    expect(result.changes).toEqual([]);
    expect(result.approvals).toEqual([
      { unit: "USDC", spender: SAMPLE.spender, unlimited: true, amount: null },
    ]);
  });

  it("answers from the sample", async () => {
    const result = await SOURCE(
      { mode: "danger", wallet: SAMPLE.wallet },
      new AbortController().signal,
    );
    expect(result).toEqual(sampleCheck("danger"));
  });
});

describe("ClaimHub pages", () => {
  it("has one page per nav item after the first, in nav order", () => {
    expect(claimhub.site.nav).toHaveLength(VIEWS.length);
    expect(claimhub.site.pages.views.map((v) => v.id)).toEqual(VIEWS.slice(1));
  });
});
