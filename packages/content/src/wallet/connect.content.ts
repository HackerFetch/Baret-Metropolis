/**
 * apps/wallet, the connect request popup. Also used by the extension.
 *
 * The pattern that works: say what the site gets, say what it does not get,
 * and make the second list as prominent as the first.
 */

export const connect = {
  title: "Connection request",
  subtitle: "{origin} wants to connect",

  gets: {
    title: "This site will see",
    points: ["Your wallet address", "Your balance and activity, which are public anyway"],
  },

  doesNotGet: {
    title: "This site cannot",
    points: [
      "Move anything without a signature from you",
      "See your keys or your passkey",
      "Sign on your behalf, ever",
    ],
  },

  remember: { label: "Do not ask again for this site", hint: "You can undo this in Sites." },

  actions: { approve: "Connect", reject: "Reject" },

  warnings: {
    firstTime: {
      title: "You have not connected here before",
      body: "Check the address bar. Look-alike domains are the most common way people get caught.",
    },
    flagged: {
      title: "This site has been reported",
      body: "It is on a blocklist for phishing. Connecting alone does not move anything, but nothing good is on the other side of this.",
    },
    insecure: {
      title: "This site is not using a secure connection",
      body: "Anything between you and it can be read or changed on the way.",
    },
  },

  results: {
    connected: "Connected to {origin}.",
    rejected: "Rejected. The site was told you declined.",
  },
} as const;

export type ConnectContent = typeof connect;
