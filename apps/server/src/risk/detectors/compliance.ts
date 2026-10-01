import type { GuardPolicyField } from "@baret/guard";
import type { Detector, FindingDraft } from "../../analysis/context.js";

/**
 * Cleanverse identity credentials on both sides of a transfer.
 *
 * requireComplianceCheck applies to the user and every recipient; the country
 * and level rules apply to recipients only. `details.side` says which account
 * a finding is about, so the client can pick `body` or `bodySelf`.
 */
export const compliance: Detector = (ctx) => {
  const p = ctx.policy;
  const active =
    p.requireComplianceCheck || p.allowedCountries.length > 0 || p.minComplianceTier !== null;
  if (!active || ctx.recipients.length === 0) return [];

  const deciding: GuardPolicyField = p.requireComplianceCheck
    ? "requireComplianceCheck"
    : p.allowedCountries.length > 0
      ? "allowedCountries"
      : "minComplianceTier";

  if (!ctx.compliance.data) {
    return [{ code: "COMPLIANCE_DATA_UNAVAILABLE", values: {}, rule: deciding }];
  }

  const out: FindingDraft[] = [];
  const accounts = [
    ...(p.requireComplianceCheck ? [{ address: ctx.user, side: "self" as const }] : []),
    ...ctx.recipients
      .filter((r) => r !== ctx.user)
      .map((address) => ({ address, side: "recipient" as const })),
  ];

  for (const { address, side } of accounts) {
    const credential = ctx.compliance.data.get(address) ?? null;
    if (!credential) {
      out.push({
        code: "COMPLIANCE_NO_CREDENTIAL",
        values: { recipient: address },
        details: { side },
        rule: deciding,
      });
      continue;
    }
    if (credential.expiresAt <= ctx.now) {
      // An expired credential only blocks through the identity rule itself.
      if (p.requireComplianceCheck) {
        out.push({
          code: "COMPLIANCE_EXPIRED",
          values: { recipient: address },
          details: { side, expiresAt: credential.expiresAt },
          rule: "requireComplianceCheck",
        });
        continue;
      }
    }
    if (side === "self") continue;
    if (p.allowedCountries.length > 0 && !p.allowedCountries.includes(credential.country)) {
      out.push({
        code: "COMPLIANCE_COUNTRY_DISALLOWED",
        values: { recipient: address, country: credential.country },
        details: { side },
        rule: "allowedCountries",
      });
    }
    if (p.minComplianceTier !== null && credential.tier < p.minComplianceTier) {
      out.push({
        code: "COMPLIANCE_TIER_INSUFFICIENT",
        values: {
          recipient: address,
          tier: String(credential.tier),
          limit: String(p.minComplianceTier),
        },
        details: { side },
        rule: "minComplianceTier",
      });
    }
  }
  return out;
};
