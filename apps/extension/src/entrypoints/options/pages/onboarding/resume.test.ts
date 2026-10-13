/**
 * Where setup picks up when it is opened again: the backup while it was never
 * confirmed, funds once it was (a restored wallet counts as backed up), and
 * the passphrase first on every step that needs the open wallet.
 */

import { describe, expect, it } from "vitest";
import { NEEDS_OPEN, needsUnlock, resumeAt, type Screen } from "./resume.js";

const ALL: readonly Screen[] = [
  "welcome",
  "restore",
  "passphrase",
  "key",
  "backup",
  "fund",
  "account",
  "rules",
  "done",
];

describe("finish setup", () => {
  it("goes back to the backup while it was never confirmed", () => {
    expect(resumeAt(false)).toEqual({ step: "backup", restored: false });
  });

  it("goes to funds once the backup was confirmed, or the wallet was restored", () => {
    expect(resumeAt(true)).toEqual({ step: "fund", restored: true });
  });
});

describe("the passphrase on a resumed step", () => {
  it("is asked on the backup, funds and the account check while the wallet is locked", () => {
    expect(NEEDS_OPEN).toEqual(["backup", "fund", "account"]);
    for (const screen of ALL) {
      expect(needsUnlock(screen, { locked: true })).toBe(NEEDS_OPEN.includes(screen));
    }
  });

  it("is never asked while the wallet is open", () => {
    for (const screen of ALL) expect(needsUnlock(screen, { locked: false })).toBe(false);
  });

  it("is never asked on the sample, which has no keystore", () => {
    for (const screen of ALL) expect(needsUnlock(screen, null)).toBe(false);
  });
});
