/**
 * apps/wallet, the frame every app screen sits in: the sidebar on a desktop,
 * the top bar and menu on a phone, the account line, and the sample notice.
 *
 * Until the wallet is wired to Mera, Monad and the Baret server, every screen
 * runs on sample data, and the frame says so on every screen. The word "demo"
 * stays out of the wallet (BRAND section 09): this is "sample data".
 */
export const walletFrame = {
  nav: {
    /** Accessible name of the wallet's navigation landmark. */
    label: "Wallet",
    open: "Open the menu",
    close: "Close the menu",
  },
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
  },
  sample: {
    tag: "Sample data",
    body: "This wallet shows sample data. It is not connected to Monad yet, and nothing you do here is sent.",
  },
  /** Where the wallet's outside links go. */
  links: { faucet: "https://faucet.monad.xyz" },
  /** Values the sample account starts with. */
  sampleData: { accountName: "Main account" },
  /** The picker that loads each sample request on the request screens. */
  samples: {
    legend: "Sample request",
    note: "Pick a sample to see how each verdict reads.",
  },
} as const;

export type WalletFrameContent = typeof walletFrame;
