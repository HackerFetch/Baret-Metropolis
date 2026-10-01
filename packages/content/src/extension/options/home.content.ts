/**
 * Extension options, Overview. The wide version of the popup home: what the
 * wallet holds, who can spend from it, whether Baret itself is answering, and
 * what happened last. Every card links to the page that manages it.
 *
 * `status` is about the extension, `health` is about the wallet. When Baret is
 * unreachable the status line says what that means: every sign request is
 * treated as Blocked until it answers.
 */

export const optionsHome = {
  title: "Overview",
  lead: "What this wallet holds, who can spend from it, and whether Baret is checking your sign requests.",

  balance: { label: "Total balance", usd: "Estimated in USD" },

  status: {
    title: "Baret status",
    reachable: {
      ok: "Baret is answering",
      bad: "Can't reach Baret. Every sign request is treated as Blocked until it answers.",
    },
    rules: { template: "{template} rules active", custom: "Custom rules active" },
    lastCheck: { label: "Last check", value: "{time}", never: "No checks yet" },
    action: { label: "Try again" },
  },

  assets: {
    title: "Assets",
    columns: { asset: "Asset", balance: "Balance", value: "Value", contract: "Contract" },
    empty: {
      title: "No tokens yet",
      body: "Tokens sent to your address show up here. Testnet MON is free from the Monad faucet.",
      action: { label: "Copy your address" },
    },
  },

  watched: {
    title: "Watched addresses",
    body: "Baret watches your addresses on Monad. If funds leave one without your signature, you get an alert.",
    columns: { address: "Address", name: "Name", lastMovement: "Last movement" },
    never: "No movement yet",
    alerts: "{count} movements you did not sign",
    action: { label: "See the alerts", href: "/activity" },
  },

  permissions: {
    title: "Permissions",
    body: "Allowances, collection access and payment caps that can spend from this wallet, largest first.",
    unlimited: "No limit",
    viewAll: { label: "Manage permissions", href: "/permissions" },
    empty: {
      title: "Nothing can spend from this wallet",
      body: "Allowances you grant and caps you give agents show up here.",
    },
  },

  sites: {
    title: "Connected sites",
    row: "Connected {date}, last request {time}",
    viewAll: { label: "Manage sites", href: "/sites" },
    empty: {
      title: "No sites connected",
      body: "Sites you connect show up here. You can disconnect any of them at any time.",
    },
  },

  recent: {
    title: "Recent activity",
    viewAll: { label: "See all activity", href: "/activity" },
    empty: {
      title: "No activity yet",
      body: "Connect to a Monad site or send some MON. Every verdict shows up here, including the ones you decline.",
    },
  },

  health: {
    title: "Wallet checkup",
    items: [
      { label: "Recovery phrase", ok: "Backed up", bad: "Not backed up yet" },
      { label: "Allowances with no limit", ok: "None", bad: "{count} with no limit" },
      { label: "Unused permissions", ok: "None", bad: "{count} unused for 30 days" },
    ],
    action: { label: "Fix this" },
  },

  errors: {
    balance: {
      title: "Balance not available",
      body: "The Monad node did not answer, so these numbers may be out of date. Try again.",
      action: { label: "Try again" },
    },
  },
} as const;

export type OptionsHomeContent = typeof optionsHome;
