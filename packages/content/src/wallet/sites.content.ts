/**
 * apps/wallet, /sites: the sites that connected to this wallet or sent it a
 * request, built from the wallet's own records in this browser.
 */
export const walletSites = {
  title: "Sites",
  body: "Every site that connected to this wallet or asked it to sign. Built from the records this browser keeps.",
  columns: {
    site: "Site",
    last: "Last request",
    requests: "Requests",
    blocked: "Stopped",
    connected: "Connected",
  },
  connected: { yes: "Connected", no: "Not connected" },
  /** {count} requests from the site. */
  requests: "{count} requests",
  requestsOne: "1 request",
  /** {count} of them stopped by Baret or declined. */
  stopped: "{count} stopped",
  forget: "Forget",
  /** Accessible name of the Forget button: {origin} is the site. */
  forgetLabel: "Forget {origin}",
  forgotten: "{origin} is forgotten. Its records are gone from this browser.",
  note: "Forget clears the site's records from this browser only. Nothing on Monad changes, and an allowance you signed stays until you revoke it.",
  empty: {
    title: "No site has asked yet",
    body: "When a site connects to your wallet or sends a request, it shows here with what it asked.",
    action: { label: "Try a demo site", href: "https://usebaret.com/showcase" },
  },
  loading: "Reading your records.",
  /** The latest request's kind, one word per activity kind a site can cause. */
  kinds: {
    connect: "Connected",
    disconnect: "Disconnected",
    blocked: "Stopped by Baret",
    declined: "Declined",
    expired: "Expired",
    signed: "Signed",
    overridden: "Signed past a rule",
    unchecked: "Signed unchecked",
    other: "Request",
  },
} as const;

export type WalletSitesContent = typeof walletSites;
