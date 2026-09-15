/**
 * Extension options, the full rule editor.
 * Field labels, group names and template descriptions are shared with the
 * wallet (shared/policy). This file holds the editor chrome.
 */

export const optionsPolicies = {
  title: "Your rules",
  body: "Baret checks every transaction against this list before it signs. These are your rules, not a risk score we invented.",

  templates: {
    title: "Start from a set",
    body: "Pick one, then change anything you like. Changing a rule does not lose the rest.",
    current: "You are using {name}",
    modified: "You are using {name} with {count} changes",
  },

  tabs: { form: "Rules", json: "JSON", diff: "Changes" },

  json: {
    hint: "This is the exact object Baret evaluates. Paste one in to replace everything.",
    invalid: "That is not valid JSON.",
    invalidField: "The field {field} is not one Baret knows about.",
    invalidValue: "{field} must be {expected}.",
    format: "Tidy it up",
  },

  diff: {
    title: "What you changed",
    none: "Nothing is different from the template.",
    row: "{field}: {from} becomes {to}",
    revert: "Undo this one",
  },

  preview: {
    title: "What this would change",
    body: "Checks your last {count} transactions against the rules on screen. Nothing is sent and nothing changes on-chain.",
    action: { label: "Run the check" },
    working: "Checking",
    result: {
      same: "No difference. The same {count} transactions pass.",
      stricter: "{count} that passed would now be blocked.",
      looser: "{count} that were blocked would now pass.",
    },
    view: "See which ones",
  },

  save: {
    action: "Save",
    saved: "Saved. It applies to the next transaction.",
    unsaved: "You have unsaved changes.",
    discard: "Discard them",
  },

  transfer: {
    export: { label: "Export", hint: "A JSON file you can keep or share with a teammate." },
    import: {
      label: "Import",
      hint: "Replaces everything on this screen. You can still cancel before saving.",
    },
  },
} as const;

export type OptionsPoliciesContent = typeof optionsPolicies;
