/**
 * apps/wallet, the rules page (route /policies). Order: current rules,
 * actions, preview, history, help. The 25-field editor renders here.
 *
 * Field labels, hints, group names, template descriptions and the editor's
 * save strings all come from shared/policy. Nothing here repeats them.
 *
 * Two things this page must never say:
 *  - that a template does anything its fields do not express;
 *  - that any rule turns off fail-closed. Can't reach Baret always counts as
 *    Blocked, and the rule for findings only decides what Caution does.
 */

export const policies = {
  title: "Your rules",
  body: "Baret runs every sign request past these rules before you can sign. They are yours, and a change applies to the next request.",

  /** The label is honest: once any rule differs from the template, it reads Custom. */
  current: {
    title: "Current rules",
    matches: "Matches the {template} template.",
    custom: {
      label: "Custom",
      note: "Started from {template}. {count} rules changed.",
      noteOne: "Started from {template}. {count} rule changed.",
    },
  },

  /** How a rule's value reads in the editor and in the history of changes. */
  values: {
    on: "On",
    off: "Off",
    /** A threshold left empty: the rule is off. */
    none: "No limit",
  },

  actions: {
    useTemplate: "Start from this template",
    edit: "Change a rule",
    reset: "Go back to {template}",
    export: "Export rules",
    import: "Import rules",
  },

  preview: {
    title: "Before you save",
    body: "Your last {count} requests, checked again under these rules.",
    bodyOne: "Your last request, checked again under these rules.",
    run: "Run the preview",
    running: "Checking your recent requests again",
    same: "Same outcome for all of them.",
    stricter: "{count} that went through would now be blocked.",
    looser: "{count} that were blocked would now go through.",
    empty: "Nothing to run the rules over yet. Send something first.",
  },

  history: {
    title: "Changes to your rules",
    row: "{rule} changed from {previous} to {value}",
    empty: "No changes since setup.",
    /** Live: changes are kept in this page's memory, so a reload empties the list. */
    emptyLive: "No changes since this page was opened. The list clears when the page reloads.",
  },

  help: {
    title: "How the rules work",
    items: [
      {
        title: "Start from a template",
        body: "Pick the one closest to how you use this account, then change single rules. The label reads Custom as soon as you do.",
      },
      {
        title: "What a finding does",
        body: "One rule decides this. On, a Caution verdict can be signed after you read the finding. Off, any finding blocks the request.",
      },
      {
        title: "Missing data never passes",
        body: "If a check can't run, or a rule is missing its data, the request counts as Blocked. No rule changes that.",
      },
      {
        title: "Loss limits cover one request",
        body: "They compare your balance before and after a single request. Payment caps are what add up spending per hour and per day.",
      },
    ],
  },

  errors: {
    save: {
      title: "Your rules were not saved",
      body: "Your previous rules still apply. Try again.",
      action: { label: "Try again" },
    },
    /** JSON that does not parse: the switch to the form waits until it does. */
    json: "Baret can't read this JSON, so the form can't show it. Fix it here first. Your rules did not change.",
    import: {
      title: "Baret can't read that file",
      body: "It is not a rule set Baret recognises. Nothing changed.",
    },
    preview: {
      title: "Can't reach Baret",
      body: "The preview could not run. Your rules did not change.",
      action: { label: "Try again" },
    },
  },
} as const;

export type PoliciesContent = typeof policies;
