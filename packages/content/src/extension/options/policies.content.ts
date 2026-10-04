/**
 * Extension options, Rules. The full editor for the 25 rules Baret checks.
 *
 * Field labels, hints, group names (the category tabs), the Strict, Balanced
 * and Permissive descriptions, the Custom label and the fail-closed note all
 * come from shared/policy. This file holds only the editor around them: views,
 * the JSON editor, the diff before saving, the preview, and import and export.
 */

export const optionsPolicies = {
  title: "Rules",
  lead: "The 25 rules Baret checks every sign request against. You choose them, Baret runs them, and a change applies from the next request.",

  templates: {
    title: "Start from a set",
    body: "Pick a set, then change any rule you like. The other rules stay as they are.",
    current: "{template} rules",
    differs: "{count} rules differ from {template}.",
    differsOne: "1 rule differs from {template}.",
    switch: {
      title: "Switch to {template}?",
      body: "Every rule takes its {template} setting. You see each change before anything is saved.",
      action: "Show the changes",
      cancel: "Keep my rules",
    },
  },

  views: { form: "Rules", json: "JSON", diff: "Changes" },

  categories: { all: "All rules" },

  search: { placeholder: "Find a rule", empty: "No rule matches that search." },

  json: {
    hint: "For developers. This is the exact object Baret evaluates. Paste a full set to replace every rule.",
    format: "Format",
    copy: "Copy JSON",
    errors: {
      syntax: "That is not valid JSON. Check line {line}.",
      unknownKey: "Baret has no rule called {key}. Remove it or check the spelling.",
      invalidValue: "{key} must be {expected}.",
      missingKey: "{key} is missing. Add it, or set it in the Rules view.",
    },
    /** What {expected} reads for each kind of rule. */
    expected: {
      switch: "true or false",
      number: "a number, or null for no limit",
      amount: 'an amount in quotes, such as "10.5", or null for no limit',
      level: "one of new, established or identified",
      list: "a list of text values in square brackets",
    },
  },

  diff: {
    title: "Review before you save",
    summary: "{count} rules change",
    summaryOne: "1 rule changes",
    none: "No changes. The screen matches your saved rules.",
    row: "{rule}: {before} becomes {after}",
    stricter: "Stricter",
    looser: "Looser",
    revert: "Undo this change",
  },

  preview: {
    title: "Try them on recent requests",
    body: "Runs the rules on screen over your last {count} sign requests. Nothing is signed and nothing changes on-chain.",
    bodyOne:
      "Runs the rules on screen over your last sign request. Nothing is signed and nothing changes on-chain.",
    action: { label: "Run the preview" },
    working: "Checking {count} requests",
    workingOne: "Checking 1 request",
    result: {
      same: "No difference. The same {count} requests pass.",
      sameOne: "No difference. The same request passes.",
      stricter: "{count} requests that passed would now be blocked.",
      stricterOne: "1 request that passed would now be blocked.",
      looser: "{count} requests that were blocked would now pass.",
      looserOne: "1 request that was blocked would now pass.",
    },
    view: "Show them",
    empty: "No recent sign requests to test against yet.",
  },

  save: {
    review: "Review and save",
    confirm: "Save {count} changes",
    confirmOne: "Save 1 change",
    saved: "Saved. The next sign request uses these rules.",
    unsaved: "{count} unsaved changes",
    unsavedOne: "1 unsaved change",
    discard: "Discard changes",
    leave: {
      title: "Leave without saving?",
      body: "Your {count} changes are lost. Your saved rules stay as they are.",
      bodyOne: "Your change is lost. Your saved rules stay as they are.",
      action: "Discard and leave",
      cancel: "Stay here",
    },
  },

  payments: {
    body: "The Payments page shows what each merchant has spent against these caps.",
    action: { label: "Open Payments", href: "/payments" },
  },

  transfer: {
    export: {
      label: "Export rules",
      hint: "Saves your rules as a JSON file on this device. Keep it as a backup or share it with a teammate.",
    },
    import: {
      label: "Import rules",
      hint: "Loads a JSON file into the editor. You review every change before anything is saved.",
    },
  },

  errors: {
    load: {
      title: "Your rules did not load",
      body: "Reload the page. Nothing was changed.",
      action: { label: "Reload" },
    },
    save: {
      title: "The rules were not saved",
      body: "Your previous rules are still active. Try again.",
      action: { label: "Try again" },
    },
    preview: {
      title: "The preview did not run",
      body: "Can't reach Baret. Your rules are unchanged. Try again when it answers.",
      action: { label: "Try again" },
    },
    import: {
      title: "That file is not a Baret rule set",
      body: "Nothing was changed. Export a set from Baret to see the format it expects.",
    },
  },
} as const;

export type OptionsPoliciesContent = typeof optionsPolicies;
