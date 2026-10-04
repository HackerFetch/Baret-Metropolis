/**
 * Extension options, the eight-step setup. Classic self-custody: a passphrase
 * that encrypts the key on this device, and a recovery phrase that restores it
 * anywhere (decision D-009: the passkey flow lives in the wallet app).
 *
 * One hook and one button per step. The backup step gets the most words and
 * the only check in the product, because it is the step people skip and
 * regret. Template names and descriptions come from shared/policy, never from
 * here. `restore` is the path the popup's "I already have a recovery phrase"
 * button opens.
 */

export const extOnboarding = {
  steps: ["Welcome", "Passphrase", "Your key", "Backup", "Funds", "Account", "Rules", "Done"],

  welcome: {
    title: "A wallet that reads before you sign.",
    body: "Baret simulates each sign request on Monad and checks it against your rules. You get a verdict in plain words before your key moves.",
    points: [
      "Simulated before you sign",
      "A cap and a revoke button on every permission",
      "An alert when funds move without you",
    ],
    action: { label: "Set up Baret" },
    restore: { label: "I already have a recovery phrase" },
    footnote: "Monad testnet. Self-custody. Open source under the MIT licence.",
  },

  restore: {
    title: "Restore your account",
    body: "Type your twelve words in order. Baret rebuilds your key on this device, then you set a passphrase for it.",
    field: { label: "Recovery phrase", hint: "Twelve words, separated by spaces." },
    warning:
      "Type your recovery phrase only here, in your own Baret. Never on a website, in a chat or in a form.",
    action: { label: "Restore this account" },
    errors: {
      wordCount: "That is {count} words. A recovery phrase has twelve.",
      unknownWord: "Word {position} is not on the recovery word list. Check the spelling.",
      invalid: "These words do not form a valid recovery phrase. Check the order and try again.",
    },
  },

  passphrase: {
    title: "Choose a passphrase",
    body: "It encrypts your key on this device and opens Baret each time. Nobody else has a copy, so nobody can reset it for you.",
    fields: {
      passphrase: {
        label: "Passphrase",
        hint: "At least 12 characters. A short sentence you will remember works well.",
      },
      confirm: { label: "Type it again" },
    },
    strength: { weak: "Too easy to guess", fair: "Workable", good: "Good", strong: "Strong" },
    /** Names the meter under the passphrase field. */
    strengthLabel: "Strength",
    why: {
      title: "Why a sentence and not a PIN?",
      body: "Anyone who copies the encrypted file can try every short PIN until one works. A long sentence has far too many combinations to try.",
    },
    action: { label: "Set this passphrase" },
    errors: {
      tooShort: "Use at least 12 characters.",
      mismatch: "The two entries do not match. Type it again.",
      common:
        "That one is on public lists of common passphrases. Pick something only you would write.",
    },
  },

  keys: {
    title: "Creating your key",
    body: "Baret creates your key on this device and encrypts it with your passphrase. The key is never sent anywhere.",
    working: "Creating your key",
    done: {
      title: "Your account is ready",
      body: "Created just now, on this device.",
      addressLabel: "Your address",
      addressHint: "Share it to receive MON. It reveals nothing secret.",
    },
    action: { label: "Continue to the backup" },
    errors: {
      failed: {
        title: "The key was not created",
        body: "Nothing was saved. Try again, and if it fails a second time, reload this page and start over.",
        action: { label: "Try again" },
      },
    },
  },

  backup: {
    title: "Write down your recovery phrase",
    body: "These twelve words restore your account on any device. Your passphrase only opens Baret on this one.",
    why: {
      title: "Why this is the only way back",
      body: "Your key was created on this device and Baret keeps no copy. No reset link, support line or email can bring it back. These words can.",
    },
    reveal: {
      label: "Show the words",
      hidden: "Hidden until you choose to show them. Check that nobody can see your screen.",
    },
    rules: [
      "Write them on paper, in order. A screenshot can end up in a cloud backup.",
      "Never type them into a website, even one that looks like Baret.",
      "Anyone who has these words controls this account and everything in it.",
    ],
    copy: {
      label: "Copy",
      warning: "Other apps on this computer can read your clipboard. Paper stays offline.",
    },
    confirm: { label: "I wrote them down, in order" },
    verify: {
      title: "Confirm your copy",
      body: "Type the two words Baret asks for, from your paper. It is a quick check that your copy matches.",
      prompt: "Word {position}",
      error: "That is not word {position}. Check your paper and try again.",
      success: "Both words match.",
    },
    action: { label: "Continue" },
    skip: {
      label: "Skip the backup",
      title: "Skip the backup?",
      body: "If you lose this device or forget your passphrase, this account and its funds are gone for good. You can back up later from Settings, as long as Baret still opens.",
      confirm: "Skip it",
      cancel: "Write them down now",
    },
  },

  fund: {
    title: "Add some testnet MON",
    body: "Every Monad transaction pays a small network fee in MON. Testnet MON is free from the Monad faucet and has no value.",
    addressLabel: "Your address",
    balanceLabel: "Balance",
    action: {
      label: "Open the Monad faucet",
      note: "It opens in a new tab. Paste your address there.",
    },
    waiting: "Watching your address for MON",
    arrived: "{amount} arrived.",
    minimum: "You need at least 0.1 MON to continue.",
    next: { label: "Continue" },
    errors: {
      notYet: {
        title: "Nothing has arrived yet",
        body: "If the faucet turned you down, send testnet MON to this address from another account.",
      },
      unreadable: {
        title: "Baret cannot read your balance",
        body: "The Monad node did not answer. Check your connection and try again.",
        action: { label: "Try again" },
      },
    },
  },

  smartWallet: {
    title: "Checking your account",
    body: "Before you use it, Baret confirms the account is funded and can sign on Monad.",
    states: {
      checking: "Reading the balance",
      resolving: "Confirming the account can sign",
      done: "Ready",
    },
    action: { label: "Continue" },
    errors: {
      failed: {
        title: "The account check did not finish",
        body: "Baret could not read your account from Monad. Nothing was sent. Try again.",
        action: { label: "Try again" },
      },
    },
  },

  policy: {
    title: "Pick your starting rules",
    body: "Baret checks every sign request against these rules. Start from a set and change any single rule later.",
    selected: "Selected",
    action: { label: "Use these rules" },
    customise: { label: "See all 25 rules" },
    note: "Nothing here is final. You can change any rule on the Rules page.",
  },

  done: {
    title: "Baret now checks every sign request.",
    body: "Here is what happens from now on, before anything is signed.",
    checks: [
      "Each request is simulated on Monad, so you see what it changes.",
      "Allowances and collection access requests are checked against your rules.",
      "Automatic payments stay inside your caps. Anything over a cap stops and asks you.",
      "If funds leave without your signature, you get an alert.",
      "If Baret cannot finish a check, the request is treated as Blocked.",
    ],
    suggestions: [
      {
        title: "See it catch a trap",
        body: "The showcase has six fake sites, each built around a known attack.",
        action: { label: "Open the showcase" },
      },
      {
        title: "Connect to a Monad site",
        body: "Baret appears in the site's wallet list like any other wallet.",
      },
      {
        title: "Pin Baret to your toolbar",
        body: "Browsers hide new extensions behind the extensions menu. Pinned, Baret shows its alerts at a glance.",
      },
    ],
    action: { label: "Go to the overview", href: "/" },
  },
} as const;

export type ExtOnboardingContent = typeof extOnboarding;
