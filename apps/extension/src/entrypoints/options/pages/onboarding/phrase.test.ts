/**
 * The recovery phrase reader, and the promise the setup makes about its own
 * sample words: they are on the list but fail the checksum, so they open no
 * account anywhere.
 */

import { describe, expect, it } from "vitest";
import { checkPhrase, hasValidChecksum, splitPhrase } from "./phrase.js";
import { SAMPLE_PHRASE, VERIFY_POSITIONS } from "./words.js";

/** The BIP39 reference vector: all-zero entropy, a valid phrase. */
const VECTOR = `${"abandon ".repeat(11)}about`;

describe("recovery phrase", () => {
  it("accepts the reference vector", async () => {
    expect(await hasValidChecksum(splitPhrase(VECTOR))).toBe(true);
    expect(await checkPhrase(`  ${VECTOR.toUpperCase()}\n`)).toEqual({
      ok: true,
      words: splitPhrase(VECTOR),
    });
  });

  it("shows sample words that fail the checksum", async () => {
    expect(SAMPLE_PHRASE).toHaveLength(12);
    expect(new Set(SAMPLE_PHRASE).size).toBe(12);
    expect(await hasValidChecksum(SAMPLE_PHRASE)).toBe(false);
    expect(await checkPhrase(SAMPLE_PHRASE.join(" "))).toEqual({ ok: false, error: "invalid" });
  });

  it("asks for words that exist", () => {
    for (const position of VERIFY_POSITIONS) {
      expect(SAMPLE_PHRASE[position - 1]).toBeTruthy();
    }
  });

  it("reports the first problem in order", async () => {
    expect(await checkPhrase("crane tunnel")).toEqual({ ok: false, error: "wordCount", count: 2 });
    expect(await checkPhrase("")).toEqual({ ok: false, error: "wordCount", count: 0 });
    const typo = [...SAMPLE_PHRASE.slice(0, 4), "cemnt", ...SAMPLE_PHRASE.slice(5)].join(" ");
    expect(await checkPhrase(typo)).toEqual({ ok: false, error: "unknownWord", position: 5 });
  });
});
