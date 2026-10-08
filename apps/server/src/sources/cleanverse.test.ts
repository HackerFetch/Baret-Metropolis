import { describe, expect, it } from "vitest";
import { COUNTRY_CODES, countriesFromBitmap, decodeRecord } from "./cleanverse.js";

const word = (v: bigint | string) => (typeof v === "string" ? v : v.toString(16)).padStart(64, "0");

/** A record as the A-Pass contract returns it. Words 2 to 8 are not read. */
function record(fields: {
  status?: bigint;
  tier?: bigint;
  expiresAt?: bigint;
  countries?: bigint;
}) {
  const words = Array.from({ length: 10 }, () => word(0n));
  words[0] = word(fields.status ?? 1n);
  words[1] = word(fields.tier ?? 5n);
  words[5] = word(fields.expiresAt ?? 0n);
  words[6] = word(0x6a76f1ban);
  words[9] = word(fields.countries ?? 0n);
  return `0x${words.join("")}` as const;
}

describe("the country word", () => {
  it("is a bitmap over ISO 3166-1 alpha-2 in alphabetical order", () => {
    expect(COUNTRY_CODES).toHaveLength(249);
    expect([...COUNTRY_CODES].sort()).toEqual(COUNTRY_CODES);
    expect(countriesFromBitmap(0n)).toEqual([]);
    expect(countriesFromBitmap(3n)).toEqual(["AD", "AE"]);
  });

  it("decodes a record read from Monad testnet the way Cleanverse's API reports it", () => {
    // Wallet 0x63ab…1da0 on 2026-10-08: the API answered tier 59, AT, CN, FR, TZ.
    const onchain = BigInt("0x0000001000000000000000000000000000000000000004000000800000000800");
    expect(countriesFromBitmap(onchain)).toEqual(["AT", "CN", "FR", "TZ"]);
  });
});

describe("decodeRecord", () => {
  it("reads tier, countries and a credential with no expiry", () => {
    expect(decodeRecord(record({ tier: 59n, countries: 3n }))).toEqual({
      tier: 59,
      expiresAt: null,
      countries: ["AD", "AE"],
    });
  });

  it("reads an expiry when there is one", () => {
    expect(decodeRecord(record({ expiresAt: 1_800_000_000n }))?.expiresAt).toBe(1_800_000_000);
  });

  it("treats a frozen or revoked credential as none", () => {
    expect(decodeRecord(record({ status: 2n }))).toBeNull();
    expect(decodeRecord(record({ status: 0n }))).toBeNull();
  });

  it("refuses a record of another size or with values out of range", () => {
    expect(() => decodeRecord("0x")).toThrow();
    expect(() => decodeRecord(`0x${word(1n)}`)).toThrow();
    expect(() => decodeRecord(record({ tier: 2n ** 200n }))).toThrow();
  });
});
