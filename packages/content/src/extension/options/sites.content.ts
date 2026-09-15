/** Extension options, connected sites and the per-site detail page. */

export const sites = {
  title: "Sites",
  body: "Every site you have connected to, what it can do, and how to take it away.",

  search: { placeholder: "Search by domain" },

  filters: [
    { id: "all", label: "All" },
    { id: "active", label: "Connected" },
    { id: "blocked", label: "Blocked" },
    { id: "spending", label: "Can spend" },
  ],

  columns: { site: "Site", connected: "Connected", lastUsed: "Last used", permissions: "Can spend", status: "Status" },

  status: { connected: "Connected", blocked: "Blocked", disconnected: "Disconnected" },

  empty: {
    title: "No sites connected",
    body: "When you connect to a site it appears here. You can disconnect at any time and it cannot reconnect without asking.",
  },

  detail: {
    connected: "Connected {date}",
    lastUsed: "Last used {date}",
    account: "Connected with {account}",

    permissions: {
      title: "What this site can do",
      read: "See your address and your public balance",
      request: "Ask you to sign things",
      spend: "Spend {amount} {asset} without asking again",
      none: "It cannot spend anything without asking.",
    },

    activity: { title: "What it has done", empty: "It has never asked you to sign anything." },

    policy: {
      title: "Rules for this site",
      body: "Leave this empty to use your normal rules. Set something here to be stricter or looser for this one site.",
      using: "Using your normal rules",
      custom: "Using its own rules, {count} different",
      edit: "Set rules for this site",
      clear: "Go back to my normal rules",
    },

    actions: {
      disconnect: { label: "Disconnect", hint: "It has to ask again next time. Nothing on-chain changes." },
      block: { label: "Block this site", hint: "It cannot ask again until you unblock it." },
      unblock: { label: "Unblock" },
      revoke: { label: "Revoke what it can spend", hint: "Sends a transaction. Costs a network fee." },
    },

    disconnect: {
      title: "Disconnect {origin}",
      body: "It will have to ask for permission again. Anything it can already spend stays until you revoke that separately.",
      action: "Disconnect",
    },

    block: {
      title: "Block {origin}",
      body: "It will not be able to ask you for anything. Use this for a site that keeps asking or that you no longer trust.",
      action: "Block it",
    },
  },
} as const;

export type SitesContent = typeof sites;
