/**
 * The extension's frame: what the popup and the options page share around
 * their screens. The sample notice, the sample picker that stands in for the
 * wallet's state until the background is wired, the options sidebar and its
 * account line, the 404, and where the outside links go.
 *
 * Until the background, the keystore and the provider are wired, every
 * screen runs on sample data and says so. The word "demo" stays out
 * (BRAND section 09): this is "sample data".
 */
export const extFrame = {
  sample: {
    tag: "Sample data",
    body: "This extension shows sample data. It isn't connected to Monad yet, and nothing you do here is sent.",
    /** The popup's one-line version, beside the tag. */
    short: "Nothing here is sent.",
    open: "Preview a state",
  },

  /**
   * The picker that stands in for the background: the popup renders the
   * phase the wallet is in, and until the wallet is wired, the reader picks it.
   */
  samples: {
    title: "Preview a state",
    body: "The wallet decides what the popup shows. Until it is wired, pick a state here.",
    account: { legend: "Account", full: "With history", empty: "New and empty" },
    phases: {
      legend: "Screen",
      uninitialized: "First run",
      locked: "Locked",
      ready: "Wallet",
      alert: "Wallet with an alert",
      signing: "Sign request",
      connecting: "Connect request",
    },
    requests: {
      legend: "Sign request",
      safe: "Safe",
      caution: "Caution, first visit",
      blocked: "Blocked",
      unreachable: "Can't reach Baret",
      message: "Message",
      unreadable: "Unreadable message",
      permit: "Hidden allowance",
      firstPayment: "First payment",
      autoPayment: "Paid automatically",
      overCap: "Over a cap",
      notChecked: "Payment not checked",
      queue: "Three at once",
    },
    connects: {
      legend: "Connect request",
      firstTime: "First visit",
      insecure: "No secure connection",
      already: "Already connected",
    },
    apply: "Show it",
  },

  /** Under the locked screen's field while the wallet is a sample. */
  lockedHint: "Sample wallet: any passphrase of 12 characters or more opens it.",
  /** Beside every recovery phrase the sample shows. */
  sampleWords: "Sample words for this preview. They belong to no account and open nothing.",

  nav: {
    /** Accessible name of the options page's navigation landmark. */
    label: "Baret settings",
    open: "Open the menu",
    close: "Close the menu",
  },
  account: { label: "Account", copy: "Copy the address", copied: "Copied" },
  lock: { label: "Lock now" },

  /** The options page's 404, under the shared title (common.notFound). */
  notFound: {
    body: "This page isn't part of Baret's settings. The overview is one step away.",
    back: { label: "Back to the overview", href: "/" },
  },

  /** Values the sample wallet starts with: its accounts' names and a watched address. */
  sampleData: {
    accounts: ["Main account", "Trading", "Agent tests"],
    cold: "Cold storage",
  },

  /** The block explorer a transaction opens in, and the other outside links. */
  links: {
    explorer: "https://testnet.monadexplorer.com",
    faucet: "https://faucet.monad.xyz",
    showcase: "https://baret-metropolis.vercel.app/showcase",
    source: "https://github.com/HackerFetch/Baret-Metropolis",
    limits:
      "https://github.com/HackerFetch/Baret-Metropolis/blob/main/docs/WALLET.md#7-out-of-scope-for-v1-scope-guard",
  },
} as const;

export type ExtFrameContent = typeof extFrame;
