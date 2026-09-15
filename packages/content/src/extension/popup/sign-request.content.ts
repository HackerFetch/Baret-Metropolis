/**
 * Extension popup, the sign request.
 *
 * The screen itself is the same component as the wallet, so the verdict, the
 * findings, the changes list and the override all come from wallet/sign. This
 * file only holds what exists because it is an extension: a queue of pending
 * requests, message signing, and the x402 payment variant.
 */

export const signRequest = {
  queue: {
    label: "{index} of {total}",
    next: "Next request",
    body: "More than one site is waiting. They are handled one at a time.",
  },

  /** Signing a message is not a transaction and needs its own framing. */
  message: {
    title: "Signature request",
    subtitle: "{origin} wants you to sign a message",
    body: "This does not move anything on its own. It proves you control this address.",
    contentLabel: "What you are signing",
    unreadable:
      "This message is not readable text. That is normal for some sites and is also how blind signing attacks work.",
    warning: {
      title: "Be careful with unreadable messages",
      body: "A signature can authorise a transfer later, without ever appearing as a transaction. Only sign this if you started the action.",
    },
    actions: { sign: "Sign the message", decline: "Decline" },
  },

  /** The typed-data variant, where a permit hides. */
  typedData: {
    title: "Signature request",
    subtitle: "{origin} wants a structured signature",
    permitWarning: {
      title: "This is an approval, not a login",
      body: "Signing gives {spender} permission to move your {asset}. It costs nothing now and it never appears in your history.",
    },
    fields: "What it contains",
  },

  /** Automatic payments over HTTP 402. */
  payment: {
    title: "Payment request",
    subtitle: "{origin} is asking for {amount}",
    auto: {
      title: "Paid automatically",
      body: "{amount} to {origin}. It matched what the site asked for and fits inside your cap.",
      counter: "{spent} of {cap} this {period}",
      undo: "Change the cap",
    },
    manual: {
      title: "First payment to this site",
      body: "{origin} wants {amount}. Approve once and set a cap, or decline and nothing is sent.",
      capField: {
        label: "Cap for this site",
        hint: "The most it may spend per hour without asking again.",
      },
      actions: { approve: "Approve and set a cap", decline: "Decline" },
    },
    blocked: {
      overCap: {
        title: "Over your cap",
        body: "{origin} has used {spent} of {cap} this {period}. This payment would go over, so it was not sent.",
        actions: [{ label: "Raise the cap" }, { label: "Leave it" }],
      },
      mismatch: {
        title: "This payment does not match the request",
        body: "The site asked to be paid at {expected} and this transaction pays {actual}. Nothing was sent.",
      },
      asset: {
        title: "Wrong token",
        body: "This token is named {asset} but it is not the {asset} you allow. Nothing was sent.",
      },
    },
  },

  /** Shown once, the first time a site triggers a signature. */
  firstTime: {
    title: "First request from this site",
    body: "You have not signed anything here before. Check the address bar.",
  },

  windowNote: "This window closes when you decide. Closing it counts as declining.",
} as const;

export type SignRequestContent = typeof signRequest;
