/**
 * apps/wallet, the policy editor. Field labels come from shared/policy.
 *
 * This screen is the product's differentiator, so the framing matters: these
 * are the reader's rules, written down, not our risk score.
 */

export const policies = {
  title: "Your rules",
  body: "Baret checks every transaction against this list. Nothing here is a score and nothing here is our opinion. Change a rule and it applies to the next transaction.",

  current: {
    label: "Current rule set",
    custom: "Custom, started from {template}",
    changed: "{count} rules changed from the template",
  },

  actions: {
    useTemplate: "Use this set",
    customise: "Change a rule",
    reset: "Back to the template",
    export: "Export",
    import: "Import",
  },

  preview: {
    title: "What changes if you save this",
    nothing: "Nothing changes. This matches what you already have.",
    stricter: "{count} things that pass today would be blocked.",
    looser: "{count} things that are blocked today would pass.",
    recheck: "Check my last 20 transactions against this",
  },

  history: {
    title: "Rule changes",
    row: "{field} changed from {from} to {to}",
    empty: "You have not changed anything since setup.",
  },

  help: {
    title: "How to think about this",
    items: [
      {
        title: "Start looser than you think",
        body: "A rule set that blocks everything gets turned off. Balanced blocks the attacks that actually empty wallets and stays quiet otherwise.",
      },
      {
        title: "Tighten after you see traffic",
        body: "Run it for a week, read your activity log, then tighten the rules that never fired and loosen the ones that fired for no reason.",
      },
      {
        title: "Loss limits are per transaction",
        body: "They compare your balance before and after a single transaction. They do not track a daily total, which is what the spending caps are for.",
      },
      {
        title: "Missing data counts as a failure",
        body: "If Baret cannot check a rule, it treats the rule as failed. Turning on Let warnings through changes that.",
      },
    ],
  },
} as const;

export type PoliciesContent = typeof policies;
