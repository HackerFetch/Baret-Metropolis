/**
 * The setup's sample values and timings. Nothing here is a secret: the
 * twelve words below fail the recovery phrase checksum on purpose
 * (phrase.test.ts proves it), so no wallet accepts them and they can never
 * hold funds. The waits stand in for the keystore, the faucet and the
 * account check, and each one starts from the reader's own press.
 */

/**
 * The sample recovery phrase the backup step shows. Its checksum is 13
 * where SHA-256 of its entropy asks for 7, so it is not a valid phrase.
 */
export const SAMPLE_PHRASE = [
  "crane",
  "tunnel",
  "lumber",
  "ladder",
  "cement",
  "helmet",
  "hammer",
  "timber",
  "bridge",
  "orange",
  "harbor",
  "brick",
] as const;

/** The two words the backup check asks for, counted from 1. */
export const VERIFY_POSITIONS = [3, 9] as const;

/**
 * Passphrases of 12 characters or more that top the public leak lists.
 * Compared in lower case with the spaces taken out.
 */
export const COMMON_PASSPHRASES: ReadonlySet<string> = new Set([
  "password1234",
  "password12345",
  "password123456",
  "passwordpassword",
  "123456789012",
  "1234567890123",
  "111111111111",
  "000000000000",
  "aaaaaaaaaaaa",
  "abcdefghijkl",
  "qwertyuiop12",
  "qwertyuiop123",
  "qwertyqwerty",
  "1q2w3e4r5t6y",
  "iloveyou1234",
  "letmeinletmein",
  "correcthorsebatterystaple",
]);

/** The shortest passphrase the setup accepts. */
export const MIN_PASSPHRASE = 12;

/** The native token's symbol, beside every amount. */
export const SYMBOL = "MON";

/** The faucet's sample transfer, and the least the account needs to continue. */
export const FAUCET_AMOUNT = "40.00";
export const EMPTY_BALANCE = "0.00";
export const MINIMUM = 0.1;

/** How long each stand-in wait lasts, in milliseconds. */
export const WAIT = {
  /** Creating and encrypting the key. */
  key: 2500,
  /** The faucet's transfer arriving. */
  faucet: 2000,
  /** Between two lines of the account check. */
  check: 900,
} as const;
