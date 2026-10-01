import { findings, policy } from "@baret/content/shared";
import { describe, expect, it } from "vitest";
import { FINDING_CODES, FINDING_SPECS, type FindingCode } from "./findings.js";
import { GUARD_POLICY_FIELDS, guardPolicySchema } from "./policy.js";
import { POLICY_TEMPLATES } from "./policy-templates.js";

describe("contract with @baret/content", () => {
  it("has exactly the finding codes the copy has", () => {
    expect([...FINDING_CODES].sort()).toEqual(Object.keys(findings).sort());
  });

  it("has exactly the policy fields the rule editor has", () => {
    expect([...GUARD_POLICY_FIELDS].sort()).toEqual(Object.keys(policy.fields).sort());
  });

  it("links each code to the same fields as the copy does", () => {
    for (const code of FINDING_CODES) {
      const fromCopy = Object.entries(policy.fields)
        .filter(([, f]) => (f.codes as readonly string[]).includes(code))
        .map(([k]) => k)
        .sort();
      expect([...FINDING_SPECS[code].rule.fields].sort(), code).toEqual(fromCopy);
    }
  });

  it("reaches every field from at least one code", () => {
    const reached = new Set(
      Object.values(FINDING_SPECS).flatMap((s) => s.rule.fields as readonly string[]),
    );
    for (const field of GUARD_POLICY_FIELDS) expect(reached.has(field), field).toBe(true);
  });

  it("names a real emitter for every code", () => {
    for (const code of FINDING_CODES) {
      expect(findings[code as FindingCode].emitter).toBeTruthy();
    }
  });
});

describe("templates", () => {
  it.each(Object.entries(POLICY_TEMPLATES))("%s parses", (_name, template) => {
    expect(guardPolicySchema.parse(template)).toEqual(template);
  });

  it("orders strictness the way the copy describes", () => {
    const { strict, balanced, permissive } = POLICY_TEMPLATES;
    expect(strict.allowWarnings).toBe(false);
    expect(strict.blockUnknownContractExposure).toBe(true);
    expect(balanced.blockUnknownContractExposure).toBe(false);
    expect(balanced.blockUnlimitedApprovals).toBe(true);
    expect(permissive.blockUnlimitedApprovals).toBe(false);
    expect(permissive.blockKnownMalicious).toBe(true);
    expect(permissive.requireSuccessfulSimulation).toBe(true);
    expect(Number(strict.maxPerTxCap)).toBeLessThan(Number(balanced.maxPerTxCap));
    expect(Number(balanced.maxDailyCap)).toBeLessThan(Number(permissive.maxDailyCap));
  });
});
