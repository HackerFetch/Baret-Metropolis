import { describe, expect, it } from "vitest";
import { correction, encode, versionFor } from "./qr.js";

/**
 * The encoder was compared with node-qrcode 1.5.4 (byte mode, level M) for
 * fifteen texts across versions 1 to 10, with every mask forced and with the
 * mask left to the penalty rules: no module differed. The fixture below is
 * that reference encoder's output for the sample address, row by row in hex.
 */
const ADDRESS = "0x7a3f9e21c84b5d06f13a2e9b7c40d58e6f21c21e";
const REFERENCE = {
  version: 3,
  mask: 2,
  rows: [
    "1fce427f",
    "104dad41",
    "1752145d",
    "1751a85d",
    "175e575d",
    "105a2141",
    "1fd5557f",
    "00195200",
    "17c2fd7c",
    "04bb0a53",
    "1f61b518",
    "0f317081",
    "0d6fa92c",
    "179c56d1",
    "156eacae",
    "1c2927da",
    "05c69c87",
    "159e4379",
    "107f3834",
    "15ac7312",
    "1645f9fe",
    "001d0715",
    "1fcb6f5a",
    "1057711b",
    "175d2df7",
    "1754102b",
    "175460da",
    "10466702",
    "1fd63c9c",
  ],
};

function hexRows(modules: readonly (readonly boolean[])[]): string[] {
  return modules.map((row) =>
    BigInt(`0b${row.map((dark) => (dark ? "1" : "0")).join("")}`)
      .toString(16)
      .padStart(Math.ceil(row.length / 4), "0"),
  );
}

describe("the QR encoder", () => {
  it("computes Reed-Solomon correction like the standard's worked example", () => {
    // HELLO WORLD at version 1-M: its 16 data codewords and their 10 EC codewords.
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
    expect(correction(data, 10)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });

  it("picks the smallest version that holds the bytes, up to version 10", () => {
    expect(versionFor(14)).toBe(1);
    expect(versionFor(15)).toBe(2);
    expect(versionFor(42)).toBe(3);
    expect(versionFor(213)).toBe(10);
    expect(versionFor(214)).toBeNull();
  });

  it("encodes the sample address exactly like the reference encoder", () => {
    const code = encode(ADDRESS);
    expect(code?.version).toBe(REFERENCE.version);
    expect(code?.mask).toBe(REFERENCE.mask);
    expect(hexRows(code?.modules ?? [])).toEqual(REFERENCE.rows);
  });

  it("draws the three finder patterns and the timing lines", () => {
    const modules = encode(ADDRESS)?.modules ?? [];
    const size = modules.length;
    const finder = ["1111111", "1000001", "1011101", "1011101", "1011101", "1000001", "1111111"];
    for (const [top, left] of [
      [0, 0],
      [0, size - 7],
      [size - 7, 0],
    ] as const) {
      const drawn = finder.map((_, r) =>
        modules[top + r]
          ?.slice(left, left + 7)
          .map((dark) => (dark ? "1" : "0"))
          .join(""),
      );
      expect(drawn).toEqual(finder);
    }
    for (let i = 8; i < size - 8; i++) {
      expect(modules[6]?.[i]).toBe(i % 2 === 0);
      expect(modules[i]?.[6]).toBe(i % 2 === 0);
    }
  });

  it("refuses text longer than version 10 holds", () => {
    expect(encode("x".repeat(214))).toBeNull();
  });
});
