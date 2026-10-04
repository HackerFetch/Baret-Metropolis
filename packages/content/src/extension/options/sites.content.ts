/**
 * Extension options, Sites and the per-site detail page. Every site that ever
 * asked this wallet to connect, whether you allowed it or not.
 *
 * Pausing, blocking and disconnecting happen in the wallet. None of them
 * touches an allowance on-chain, and the copy says so every time.
 */

export const sites = {
  title: "Sites",
  lead: "Every site that has asked to connect, what it can do now, and how to take that back.",

  search: { placeholder: "Search by site" },

  filters: [
    { id: "all", label: "All" },
    { id: "connected", label: "Connected" },
    { id: "paused", label: "Paused" },
    { id: "blocked", label: "Blocked" },
    { id: "spending", label: "Can spend" },
  ],

  /** The name a screen reader gives the filter group. */
  filter: { legend: "Show" },

  columns: {
    site: "Site",
    status: "Status",
    firstSeen: "First request",
    lastUsed: "Last request",
    permissions: "Can spend",
    requests: "Requests",
  },

  status: {
    connected: {
      label: "Connected",
      hint: "Sees your address and can send you sign requests.",
    },
    paused: {
      label: "Paused",
      hint: "Its requests are declined until you resume it. Allowances it already holds still work on-chain.",
    },
    blocked: {
      label: "Blocked",
      hint: "Cannot connect, send sign requests or ask for payments.",
    },
    notConnected: {
      label: "Not connected",
      hint: "It asked once. You declined, or you disconnected it later.",
    },
  },

  empty: {
    title: "No sites yet",
    body: "When a site asks to connect, it shows up here, whether you allow it or not.",
  },

  emptyFiltered: {
    title: "No sites match",
    body: "Clear the search or pick another filter.",
    action: { label: "Clear filters" },
  },

  errors: {
    load: {
      title: "The site list did not load",
      body: "Reload the page. Nothing was changed.",
      action: { label: "Reload" },
    },
  },

  detail: {
    lead: "What this site can do, what it has asked for, and how to take it back.",
    origin: "This is the address your browser reported, not a name the site chose for itself.",
    firstSeen: "First request {date}",
    connected: "Connected {date}",
    lastUsed: "Last request {date}",
    account: "Connected with {account}",

    can: {
      title: "What this site can do",
      read: "See your address and your public balance",
      request: "Send you sign requests to review",
      spend: "Spend up to {amount} {asset} without a new signature",
      unlimited: "Spend all of your {asset} without a new signature",
      payments: "Take payments within your caps",
      operator: "Move every item in {contract} without a new signature",
      none: "It cannot spend anything without a new signature.",
    },

    cannot: {
      title: "What it cannot do",
      items: [
        "Move more than you allowed",
        "See your key, your recovery phrase or your passphrase",
      ],
    },

    activity: {
      title: "Requests from this site",
      empty: "It has not sent a sign request yet.",
      viewAll: { label: "See all activity", href: "/activity" },
    },

    payments: {
      title: "Payments to this site",
      body: "Its caps and what it has spent are on the Payments page.",
      action: { label: "Open Payments", href: "/payments" },
    },

    actions: {
      title: "Manage this site",
      pause: {
        label: "Pause this site",
        hint: "Declines its requests until you resume. Nothing changes on-chain.",
      },
      resume: {
        label: "Resume",
        hint: "Its requests reach you again, each checked before you sign.",
      },
      disconnect: {
        label: "Disconnect",
        hint: "It has to ask again next time. Nothing changes on-chain.",
      },
      block: {
        label: "Block this site",
        hint: "Declines every connect, sign and payment request from it.",
      },
      unblock: {
        label: "Unblock",
        hint: "It can ask to connect again. It stays disconnected until you allow it.",
      },
      revoke: {
        label: "Revoke its permissions",
        hint: "One transaction per permission. Each costs a network fee.",
      },
      forget: {
        label: "Forget this site",
        hint: "Removes it and its history from this device. It can ask to connect again.",
      },
    },

    disconnect: {
      title: "Disconnect {origin}?",
      body: "It has to ask again before it can see your address. Allowances it already holds stay until you revoke them.",
      action: "Disconnect",
      cancel: "Stay connected",
    },

    block: {
      title: "Block {origin}?",
      body: "Baret declines every request from it without asking you. Allowances it already holds still work on-chain until you revoke them.",
      action: "Block it",
      cancel: "Don't block",
    },

    revoke: {
      title: "Revoke {count} permissions from {origin}?",
      titleOne: "Revoke 1 permission from {origin}?",
      body: "This sends {count} transactions, one per permission. You sign each one, and each costs a network fee.",
      bodyOne: "This sends 1 transaction. You sign it, and it costs a network fee.",
      action: "Revoke {count}",
      cancel: "Keep them",
    },

    forget: {
      title: "Forget {origin}?",
      body: "Its connection and request history are deleted from this device. Allowances on-chain are not touched.",
      action: "Forget it",
      cancel: "Keep it",
    },

    /** One line in the page's status region after each action. */
    done: {
      paused: "{origin} is paused. Its requests are declined until you resume it.",
      resumed: "{origin} is connected again. Its requests reach you for review.",
      disconnected: "{origin} is disconnected. It has to ask again next time.",
      blocked: "{origin} is blocked. Baret declines every request from it.",
      unblocked: "{origin} is unblocked. It can ask to connect again.",
      revoked: "Revoked. {origin} can no longer spend from this wallet.",
      forgotten: "{origin} and its history are deleted from this device.",
    },

    errors: {
      notFound: {
        title: "No record of this site",
        body: "It has never asked this wallet for anything.",
        action: { label: "Back to all sites", href: "/sites" },
      },
    },
  },
} as const;

export type SitesContent = typeof sites;
