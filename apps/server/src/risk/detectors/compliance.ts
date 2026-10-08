import type { GuardPolicyField } from "@baret/guard";
import { getAddress } from "viem";
import type { Detector, FindingDraft } from "../../analysis/context.js";

/**
 * Cleanverse identity credentials on both sides of a transfer.
 *
 * Two things can ask for them. The user's rules: requireComplianceCheck
 * applies to the user and every recipient; the country and level rules apply
 * to recipients only. And the asset: a compliant token (CVA) moves only
 * between credential holders, so sending one is checked on both sides whatever
 * the rules say, and a missing credential is reported here instead of as a
 * bare failed simulation.
 *
 * `details.side` says which account a finding is about, so the client can
 * pick `body` or `bodySelf`. `details.asset` is set when the asset, not a
 * rule, is what demands the credential.
 */
/** `NotVerified(address party, uint8 reason)`, the typed refusal of Baret's CompliantPaymentGuard. */
const NOT_VERIFIED = "0x0c2b355f";
const GUARD_REASONS = ["NoCredential", "NotActive", "TierTooLow"] as const;

/**
 * A payment the CompliantPaymentGuard refused in simulation: the contract
 * checked both identities on-chain before moving anything and named the
 * party that failed. The asset never moved, so there is no transfer for the
 * rest of this detector to read; the contract's own answer is reported.
 */
function refusedByGuard(ctx: Parameters<Detector>[0]): FindingDraft[] {
  const data = ctx.simulation.revertData;
  if (!data?.toLowerCase().startsWith(NOT_VERIFIED) || data.length !== 138) return [];
  const party = getAddress(`0x${data.slice(34, 74)}`);
  const reason = GUARD_REASONS[Number(BigInt(`0x${data.slice(74)}`))];
  if (!reason) return [];
  return [
    {
      code: "COMPLIANCE_NO_CREDENTIAL",
      values: { recipient: party },
      details: {
        side: party === ctx.user ? "self" : "recipient",
        reason,
        refusedBy: ctx.tx?.to ?? null,
      },
      rule: "requireComplianceCheck",
    },
  ];
}

export const compliance: Detector = (ctx) => {
  const refused = refusedByGuard(ctx);
  if (refused.length > 0) return refused;
  const p = ctx.policy;
  const byAsset = ctx.gatedAssets[0] ?? null;
  const byRule =
    p.requireComplianceCheck || p.allowedCountries.length > 0 || p.minComplianceTier !== null;
  if ((!byRule && !byAsset) || ctx.recipients.length === 0) return [];

  const deciding: GuardPolicyField =
    p.requireComplianceCheck || !byRule
      ? "requireComplianceCheck"
      : p.allowedCountries.length > 0
        ? "allowedCountries"
        : "minComplianceTier";
  const asset = byAsset ? { asset: byAsset } : {};

  if (!ctx.compliance.data) {
    return [{ code: "COMPLIANCE_DATA_UNAVAILABLE", values: {}, details: asset, rule: deciding }];
  }

  const bothSides = p.requireComplianceCheck || byAsset !== null;
  const out: FindingDraft[] = [];
  const accounts = [
    ...(bothSides ? [{ address: ctx.user, side: "self" as const }] : []),
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
        details: { side, ...asset },
        rule: deciding,
      });
      continue;
    }
    if (credential.expiresAt !== null && credential.expiresAt <= ctx.now) {
      // An expired credential blocks through the identity rule or the asset.
      if (bothSides) {
        out.push({
          code: "COMPLIANCE_EXPIRED",
          values: { recipient: address },
          details: { side, expiresAt: credential.expiresAt, ...asset },
          rule: "requireComplianceCheck",
        });
        continue;
      }
    }
    if (side === "self") continue;
    if (p.allowedCountries.length > 0) {
      // No country on the credential is not a pass: the rule cannot be shown to hold.
      const outside = credential.countries.find((c) => !p.allowedCountries.includes(c));
      if (outside !== undefined || credential.countries.length === 0) {
        out.push({
          code: "COMPLIANCE_COUNTRY_DISALLOWED",
          values: { recipient: address, country: outside ?? "an unknown country" },
          details: { side, countries: credential.countries },
          rule: "allowedCountries",
        });
      }
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
