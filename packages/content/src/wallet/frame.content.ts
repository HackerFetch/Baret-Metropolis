/**
 * apps/wallet, the frame every app screen sits in: the sidebar on a desktop,
 * the top bar and menu on a phone, the account line, and the sample notice.
 *
 * Until the wallet is wired to Mera, Monad and the Baret server, every screen
 * runs on sample data, and the frame says so on every screen. The word "demo"
 * stays out of the wallet (BRAND section 09): this is "sample data".
 */
export const walletFrame = {
  /**
   * Tab titles, one per route (apps/wallet/src/routes.ts). Each names the
   * wallet, so a request window opened by a site still says whose it is.
   */
  meta: {
    titles: {
      home: "Baret Wallet",
      send: "Send · Baret Wallet",
      receive: "Receive · Baret Wallet",
      history: "Activity · Baret Wallet",
      policies: "Your rules · Baret Wallet",
      delegation: "Agent delegation · Baret Wallet",
      settings: "Settings · Baret Wallet",
      onboarding: "Set up your wallet · Baret Wallet",
      connect: "Connection request · Baret Wallet",
      sign: "Sign request · Baret Wallet",
      notFound: "Not found · Baret Wallet",
    },
  },
  nav: {
    /** Accessible name of the wallet's navigation landmark. */
    label: "Wallet",
    open: "Open the menu",
    close: "Close the menu",
    /** The sidebar labels, one per app screen. */
    labels: {
      home: "Home",
      send: "Send",
      receive: "Receive",
      history: "Activity",
      policies: "Rules",
      delegation: "Agents",
      settings: "Settings",
    },
  },
  /** The first stop on every app screen, past the sidebar to the screen. */
  skip: "Skip to content",
  account: {
    label: "Account",
    copy: "Copy the address",
    copied: "Copied",
  },
  lock: { label: "Lock the wallet" },
  /** The screen a locked wallet shows instead of the app. */
  locked: {
    title: "The wallet is locked",
    body: "Your passkey opens it again. Until then, nothing in it can be read or signed.",
    action: "Unlock with your passkey",
    /** In a request window: the request waits behind the lock. */
    request: "A site is waiting for an answer. Unlock to read the request, or decline it now.",
    decline: "Decline the request",
    declined: "Request declined. Nothing was signed or shared.",
  },
  sample: {
    tag: "Sample data",
    body: "This wallet shows sample data. It is not connected to Monad yet, and nothing you do here is sent.",
  },
  /** Where the wallet's outside links go. */
  links: {
    faucet: "https://faucet.monad.xyz",
    showcase: "https://baret-metropolis.vercel.app/showcase",
    source: "https://github.com/HackerFetch/Baret-Metropolis",
    /** The Monad testnet explorer, for a transaction hash in the history. */
    explorer: "https://testnet.monadexplorer.com",
    limits:
      "https://github.com/HackerFetch/Baret-Metropolis/blob/main/docs/WALLET.md#7-out-of-scope-for-v1-scope-guard",
  },
  /** Values the sample account starts with. */
  sampleData: { accountName: "Main account" },
  /** The picker that loads each sample request on the request screens. */
  samples: {
    legend: "Sample request",
    note: "Pick a sample to see how each verdict reads.",
    /** The connect window shows no verdict, so its note speaks of requests. */
    noteConnect: "Pick a sample to see how each request reads.",
  },
} as const;

export type WalletFrameContent = typeof walletFrame;
