/** Extension popup, the accounts sheet. */

export const accounts = {
  title: "Accounts",
  body: "All of these come from the same recovery phrase.",

  row: { active: "Active", balance: "{amount} MON", copy: "Copy the address" },

  actions: {
    add: "Add an account",
    rename: "Rename",
    copy: "Copy the address",
    explorer: "View on the explorer",
  },

  add: {
    title: "Add an account",
    body: "A new address derived from the same recovery phrase. Backing up that phrase covers this one too.",
    field: { label: "Name", placeholder: "Account {n}" },
    action: "Create it",
    working: "Creating",
  },

  rename: { title: "Rename", field: { label: "Name" }, action: "Save", hint: "Only you see this." },

  note: "Each account has its own activity, permissions and balance. Your rules apply to all of them.",
} as const;

export type AccountsContent = typeof accounts;
