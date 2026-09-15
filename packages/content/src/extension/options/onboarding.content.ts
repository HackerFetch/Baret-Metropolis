/**
 * Extension options, the eight-step setup. Classic self-custody with a
 * recovery phrase (decision D-009: the passkey flow lives in the wallet app).
 *
 * The backup step is the one people skip and regret. It gets the most words
 * and the only quiz in the product.
 */

export const extOnboarding = {
  steps: ["Welcome", "Passphrase", "Keys", "Backup", "Funds", "Smart wallet", "Rules", "Done"],

  welcome: {
    title: "A wallet that reads before it signs.",
    body: "Baret decodes every transaction, runs it against live Monad state, and tells you what it found before your key moves.",
    points: ["Checked before signing", "Caps on standing permissions", "Alerts when something moves"],
    action: { label: "Get started" },
    footnote: "Monad testnet. Self-custody. Open source under the MIT licence.",
  },

  passphrase: {
    title: "Choose a passphrase",
    body: "It encrypts the wallet on this device. It is not an account password, so there is no reset and no email to recover it with.",
    fields: {
      passphrase: { label: "Passphrase", hint: "At least 12 characters. A short sentence works well." },
      confirm: { label: "Type it again" },
    },
    strength: { weak: "Too easy to guess", fair: "Acceptable", good: "Good", strong: "Strong" },
    why: {
      title: "Why not a PIN?",
      body: "A four digit PIN can be tried a few thousand times in a second by anyone who copies the encrypted file. A sentence cannot.",
    },
    action: { label: "Continue" },
    errors: {
      tooShort: "Use at least 12 characters.",
      mismatch: "The two do not match.",
      common: "That is one of the most common passphrases in the world. Pick something else.",
    },
  },

  keys: {
    title: "Creating your keys",
    body: "This happens on your device. Nothing is sent anywhere.",
    working: "Generating",
    done: { title: "Your account is ready", body: "Created just now", addressLabel: "Your address" },
    action: { label: "Continue" },
  },

  backup: {
    title: "Write these twelve words down",
    body: "This is the only way back into this account if you lose the device or forget the passphrase. Nobody can recover it for you, including us.",
    reveal: { label: "Show the words", hidden: "Hidden until you are somewhere private" },
    rules: [
      "Write them on paper. A screenshot ends up in a cloud backup.",
      "Never type them into a website, not even one that looks like ours.",
      "Anyone who has these words has this account.",
    ],
    copy: { label: "Copy", warning: "Your clipboard is readable by other software. Paper is safer." },
    confirm: { label: "I have written them down" },
    quiz: {
      title: "Quick check",
      body: "Fill in the missing words so we know the copy you wrote down is right.",
      prompt: "Word {n}",
      error: "That is not the right word. Check what you wrote down.",
      success: "That matches.",
    },
    action: { label: "Continue" },
    skip: {
      label: "Skip this",
      title: "Really skip the backup?",
      body: "If you lose this device or forget your passphrase, this account is gone. There is no support line and no reset.",
      confirm: "Skip anyway",
      cancel: "Let me write them down",
    },
  },

  fund: {
    title: "Get some testnet MON",
    body: "You need a small balance to pay network fees. Testnet MON has no value.",
    addressLabel: "Your address",
    balanceLabel: "Balance",
    action: { label: "Open the faucet" },
    waiting: "Watching for the transfer",
    arrived: "Arrived. You can continue.",
    minimum: "You need at least 0.1 MON to continue.",
    skip: { label: "I will do this later" },
  },

  smartWallet: {
    title: "Setting up your account",
    body: "Baret is checking that the account is funded and ready to sign.",
    states: {
      checking: "Checking the account",
      resolving: "Setting it up",
      done: "Ready",
    },
    action: { label: "Continue" },
  },

  policy: {
    title: "Choose what gets blocked",
    body: "This is the list Baret checks before every signature. Balanced is the right answer for most people. You can change any single rule later.",
    action: { label: "Use this set" },
    customise: { label: "Show me every rule" },
  },

  done: {
    title: "You are protected.",
    body: "Every transaction from here on is decoded, simulated and checked against the rules you just chose.",
    suggestions: [
      { title: "Watch it catch something", body: "Six demo sites, six real attacks.", action: { label: "Open the showcase", href: "/showcase" } },
      { title: "Connect to a real site", body: "Baret shows up in the wallet picker like any other wallet." },
      { title: "Pin the toolbar icon", body: "Chrome hides new extensions behind the puzzle piece." },
    ],
    action: { label: "Open the wallet" },
  },
} as const;

export type ExtOnboardingContent = typeof extOnboarding;
