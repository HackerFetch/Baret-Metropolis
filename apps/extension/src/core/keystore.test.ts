import { describe, expect, it } from "vitest";
import { accountOf, isPhrase, isVault, newPhrase, open, seal } from "./keystore.js";

/** The BIP-39 test vector every wallet agrees on. */
const PHRASE = "test test test test test test test test test test test junk";
const FIRST = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const PASS = "correct horse battery";
const FAST = 1000;

describe("keystore", () => {
  it("derives the accounts every other wallet derives from the same words", () => {
    expect(accountOf(PHRASE).address).toBe(FIRST);
    expect(accountOf(PHRASE, 1).address).toBe("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
  });

  it("makes a new twelve-word phrase each time", () => {
    const one = newPhrase();
    expect(one.split(" ")).toHaveLength(12);
    expect(isPhrase(one)).toBe(true);
    expect(newPhrase()).not.toBe(one);
  });

  it("opens with the passphrase and with nothing else", async () => {
    const vault = await seal(PHRASE, PASS, FAST);
    expect(await open(vault, PASS)).toBe(PHRASE);
    expect(await open(vault, "correct horse batterx")).toBeNull();
    expect(await open(vault, "")).toBeNull();
  });

  it("keeps nothing readable in the vault, and never seals the same way twice", async () => {
    const one = await seal(PHRASE, PASS, FAST);
    const two = await seal(PHRASE, PASS, FAST);
    expect(JSON.stringify(one)).not.toContain("test");
    expect(one.data).not.toBe(two.data);
    expect(one.salt).not.toBe(two.salt);
  });

  it("refuses a short passphrase and words that are not a phrase", async () => {
    await expect(seal(PHRASE, "short", FAST)).rejects.toThrow(/too short/);
    await expect(seal("not a phrase at all", PASS, FAST)).rejects.toThrow(/recovery phrase/);
    expect(isPhrase("test test test")).toBe(false);
  });

  it("does not open a vault that was changed or is not one", async () => {
    const vault = await seal(PHRASE, PASS, FAST);
    const flipped = vault.data.startsWith("A")
      ? `B${vault.data.slice(1)}`
      : `A${vault.data.slice(1)}`;
    expect(await open({ ...vault, data: flipped }, PASS)).toBeNull();
    expect(await open({ ...vault, iterations: FAST + 1 }, PASS)).toBeNull();
    expect(await open(null, PASS)).toBeNull();
    expect(await open({ v: 2 }, PASS)).toBeNull();
    expect(isVault(vault)).toBe(true);
    expect(isVault({ ...vault, iterations: 0 })).toBe(false);
  });
});
