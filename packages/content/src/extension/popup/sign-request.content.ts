/**
 * Extension popup, the sign request phase.
 *
 * The screen is the wallet's sign request. Header, the site's claim, verdict,
 * impact, what changes, findings (including the batched-call prefix), rules,
 * raw data, countdown, override, the Can't reach Baret panel and the result
 * all come from wallet/sign. This file holds only what exists because this is
 * an extension:
 *  - the queue, when several requests wait at once
 *  - message signing (personal_sign), which has nothing to simulate
 *  - typed data, and the allowance a permit hides inside it
 *  - the x402 payment variant and its first-payment caps
 *  - the first-time site warning
 *  - the window note
 *
 * Fail-closed: a request Baret could not check gets the wallet's Can't reach
 * Baret state, which counts as Blocked. Nothing here offers a way around it.
 *
 * Placeholders follow the shared vocabulary. {origin} is the site that holds
 * the caps, {merchant} is who receives a payment. {amount} is a number and
 * {asset} its token. {cap} and {actual} (spent so far) arrive with their unit.
 */

export const signRequest = {
  queue: {
    label: "1 of {count}",
    body: "{count} requests are waiting. You decide on them one at a time.",
    next: "Next request",
    declineAll: "Decline all",
  },

  /** personal_sign. A message is not a transaction and cannot be simulated. */
  message: {
    title: "Sign a message",
    subtitle: "{origin} asks you to sign this text",
    body: "Signing sends no transaction. Sites often use it to confirm this address is yours.",
    check: "A message can't be simulated. Baret shows it exactly as the site sent it.",
    contentLabel: "The message",
    unreadable: {
      title: "This isn't readable text",
      body: "It's raw data, and it can authorize things you can't see. Sign only if you started this.",
    },
    actions: { sign: "Sign message", decline: "Decline" },
  },

  /** eth_signTypedData_v4. Where a permit hides. */
  typedData: {
    title: "Sign structured data",
    subtitle: "{origin} asks you to sign these fields",
    body: "Baret decodes each field below. The site can use this signature later without asking again.",
    fieldsLabel: "What you're signing",
    permit: {
      title: "This grants an allowance",
      body: "It looks like a plain signature, but it lets {spender} spend your {asset}.",
      validUntil: "Valid until",
    },
    actions: { sign: "Sign data", decline: "Decline" },
  },

  /** A site asked for payment over HTTP 402. The header title becomes this. */
  payment: {
    label: "x402",
    title: "Payment request",

    /** The first payment to a site sets the caps for every later one. */
    firstPayment: {
      title: "First payment to this site",
      body: "Set caps for {origin} before you pay. You can revoke them any time in Allowances.",
      caps: { perPayment: "Per payment", hour: "Per hour", day: "Per day" },
      rule: "Anything over a cap stops and asks you first.",
      autoOn: "Later payments inside these caps go through without this window.",
      autoOff: "Automatic payments are off, so you approve each one.",
      errors: {
        empty: "Set all three caps.",
        belowPayment: "The per-payment cap can't be lower than this payment.",
        order: "The hourly cap can't be higher than the daily cap.",
      },
      actions: { approve: "Pay {amount} {asset}", decline: "Decline" },
    },

    /** A later payment that passed every check and fit every cap. */
    auto: {
      title: "Paid automatically",
      body: "{amount} {asset} to {merchant}. It passed every check and stayed inside your caps.",
      meter: "{actual} of {cap} today",
      edit: "Edit caps",
    },

    overCap: {
      title: "Over your cap",
      perPayment: "This payment is more than the {cap} per-payment cap for {origin}.",
      hour: "This payment would take {origin} past its {cap} hourly cap.",
      day: "This payment would take {origin} past its {cap} daily cap.",
      body: "Nothing is sent unless you raise the cap.",
      actions: { raise: "Raise the cap", decline: "Decline" },
    },

    /** An automatic payment Baret could not check. It never goes out. */
    notChecked: {
      title: "Payment not sent",
      body: "Baret couldn't check this payment, so it stopped it. Nothing was paid.",
    },
  },

  /** Shown the first time a site sends a sign request. */
  firstTime: {
    title: "First request from this site",
    body: "You haven't signed anything for {origin} before. Check the address bar for a look-alike name.",
  },

  windowNote: "Closing this window counts as declining.",
} as const;

export type SignRequestContent = typeof signRequest;
