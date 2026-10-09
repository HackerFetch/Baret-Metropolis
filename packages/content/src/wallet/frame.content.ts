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
    /** In a request window, once a site's request is in: {origin} is that site. */
    requestFrom:
      "{origin} is waiting for your answer. Open your wallet with your passkey to read the request, or decline it now.",
    decline: "Decline the request",
    declined: "Request declined. Nothing was signed or shared.",
    /** In a request window on a device with no passkey for this wallet yet. */
    create: "Create my wallet",
    createNote:
      "No Baret wallet on this device yet? Create one with a passkey, then read the request.",
    /** Live: the 15 minute session ran out, so the wallet locked itself. */
    expired: {
      title: "Your session ended",
      body: "The wallet locked itself at {time}, 15 minutes after you last unlocked it. Your passkey starts a new session.",
      unsent: "Anything you had not signed was not sent.",
    },
    /** Live: why the passkey did not open the wallet, one per failure kind. */
    errors: {
      cancelled: {
        title: "Still locked",
        body: "The passkey prompt closed without an answer. If your browser offered no passkey, this site has none yet: create your wallet first.",
      },
      notCompatible: {
        title: "This passkey can't open the account",
        body: "This passkey provider can't give Mera what it needs. Try the device or password manager you made the wallet with.",
      },
      unsupported: {
        title: "This browser can't use passkeys",
        body: "Open the wallet in a recent Chrome, Safari, Edge or Firefox, on a device with a screen lock.",
      },
    },
  },
  /**
   * Live only: the session an unlock opens. Inside it every signature goes
   * without a prompt; at {time} the wallet locks itself.
   */
  session: {
    line: "Signing without a prompt until {time}.",
    /** With the passkey asked on every signature. */
    lineAsk: "Your session ends at {time}. Every signature asks for your passkey.",
    soon: "Your session ends at {time}. Then the wallet locks and asks for your passkey.",
    renew: "Unlock again for 15 more minutes",
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
  /**
   * Live: a request window a site opened. The site sends its request by
   * postMessage; {origin} is the site, as the browser reports it.
   */
  request: {
    waiting: "Waiting for the site to send its request.",
    /** Live, but no site opened this window. */
    none: "This window opens when a site asks your Baret wallet for something. Go back to the site and press its button.",
    answered: "Your answer went back to {origin}. You can close this window.",
    close: "Close this window",
  },
  /** The picker that loads each sample request on the request screens. */
  samples: {
    legend: "Sample request",
    note: "Pick a sample to see how each verdict reads.",
    /** The connect window shows no verdict, so its note speaks of requests. */
    noteConnect: "Pick a sample to see how each request reads.",
  },
} as const;

export type WalletFrameContent = typeof walletFrame;
