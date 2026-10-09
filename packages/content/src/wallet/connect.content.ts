/**
 * apps/wallet, the connection request. The body is also used by the extension
 * popup, which adds its own account picker, so nothing here names a route.
 *
 * The pattern: say what the site will be able to do, say what it will not,
 * and give the second list the same weight as the first. The site address is
 * the one the browser reports, never the name the site gives itself.
 */

export const connect = {
  title: "Connection request",
  subtitle: "{origin} wants to connect",
  originNote: "The site address as your browser reports it.",
  note: "Connecting moves nothing. It shares your address.",

  can: {
    title: "This site will be able to",
    points: [
      "See your wallet address",
      "See your balance and activity, which are public on Monad",
      "Send you sign requests, which Baret checks first",
    ],
  },

  /** Rendered crossed out, as prominent as the list above. */
  cannot: {
    title: "It will not be able to",
    points: [
      "Move funds without your signature",
      "See your passkey or your keys",
      "Sign anything for you",
    ],
  },

  remember: {
    label: "Don't ask again for this site",
    hint: "Sign requests still come to you. You can disconnect the site at any time.",
  },

  actions: { approve: "Connect", reject: "Decline" },

  warnings: {
    firstTime: {
      title: "First time on this site",
      body: "Check the address bar letter by letter. Look-alike addresses are the most common trap.",
    },
    insecure: {
      title: "This site has no secure connection",
      body: "Anyone on the network between you and the site can read or change what it sends. Decline unless you know why.",
    },
  },

  result: {
    connected: "Connected to {origin}.",
    /** Approved without "Don't ask again": nothing is kept. */
    connectedOnce: "Connected to {origin} for now. It asks again next time.",
    /** A site's own window: the site keeps the connection, not this wallet. */
    connectedSite:
      "Connected to {origin}. The site keeps this connection until you disconnect it there.",
    declined: "Declined. {origin} was told you said no.",
    expired: "The request timed out, so {origin} was not connected.",
  },
} as const;

export type ConnectContent = typeof connect;
