/**
 * Extension popup, the Accounts overlay.
 *
 * {count} in `add.field.placeholder` is the number the new account gets.
 * {amount} is the MON balance.
 */

export const accounts = {
  title: "Accounts",
  body: "All of these come from one recovery phrase.",

  row: { active: "Active", balance: "{amount} MON", copy: "Copy address" },

  actions: {
    add: "Add account",
    rename: "Rename",
    copy: "Copy address",
    explorer: "Open in explorer",
  },

  add: {
    title: "Add an account",
    body: "It comes from your recovery phrase, so your backup already covers it.",
    field: { label: "Name", placeholder: "Account {count}" },
    action: "Add account",
    working: "Adding",
  },

  rename: {
    title: "Rename account",
    field: { label: "Name" },
    action: "Save",
    hint: "Names stay on this device.",
  },

  note: "Each account has its own balance, activity and allowances. Your rules cover all of them.",

  errors: {
    add: {
      title: "Couldn't add the account",
      body: "Nothing changed. Try again.",
      action: { label: "Try again" },
    },
    nameEmpty: "Give the account a name.",
  },
} as const;

export type AccountsContent = typeof accounts;
