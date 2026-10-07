import { decodeAbiParameters, encodeFunctionResult, getAddress, parseAbiParameters } from "viem";
import { describe, expect, it } from "vitest";
import production from "../config.production.json" with { type: "json" };
import staging from "../config.staging.json" with { type: "json" };
import {
  decodePendingResult,
  encodePendingCall,
  encodeReport,
  parseConfig,
  parseFeed,
  receiverAbi,
  selectWindow,
  windowCount,
  windowIndex,
} from "./feed";

const A = "0x1111111111111111111111111111111111111111";
const B = "0x2222222222222222222222222222222222222222";
const C = "0xAbCdEfabcdefABCDEFabcdefabcdefABCDEFabcd";

const base = {
  schedule: "0 */10 * * * *",
  feedUrl: "https://example.com/feed.json",
  chainName: "monad-testnet",
  receiverAddress: A,
  gasLimit: "2000000",
  windowSize: 20,
  rotationSeconds: 600,
  severity: 3,
  reasonCode: "SCAMSNIFFER_BLACKLIST",
};

describe("parseConfig", () => {
  it("accepts the two config files in the repo", () => {
    expect(parseConfig(staging).chainName).toBe("monad-testnet");
    expect(parseConfig(production).chainName).toBe("monad-testnet");
  });

  it("checksums the receiver", () => {
    expect(parseConfig({ ...base, receiverAddress: C.toLowerCase() }).receiverAddress).toBe(
      getAddress(C),
    );
  });

  it.each([
    ["a network that is not Monad", { chainName: "some-other-testnet" }],
    ["a feed that is not https", { feedUrl: "http://example.com/feed.json" }],
    ["a receiver that is not an address", { receiverAddress: "0x1234" }],
    ["a window above the read limit", { windowSize: 101 }],
    ["an empty window", { windowSize: 0 }],
    ["a severity the registry refuses", { severity: 5 }],
    ["a severity that would clear entries", { severity: 0 }],
    ["a reason code that is a sentence", { reasonCode: "on a scam list" }],
    ["a gas limit that is a number", { gasLimit: 2000000 }],
    ["no rotation", { rotationSeconds: 0 }],
    ["no schedule", { schedule: "" }],
  ])("refuses %s", (_name, change) => {
    expect(() => parseConfig({ ...base, ...change })).toThrow(/^config\./);
  });

  it("refuses what is not an object", () => {
    expect(() => parseConfig(null)).toThrow();
    expect(() => parseConfig("x")).toThrow();
  });
});

describe("parseFeed", () => {
  it("lower-cases, removes repeats and sorts", () => {
    expect(parseFeed(JSON.stringify([B, C, A, B.toUpperCase().replace("0X", "0x")]))).toEqual([
      A,
      B,
      C.toLowerCase(),
    ]);
  });

  it("gives every node the same list whatever order the feed came in", () => {
    expect(parseFeed(JSON.stringify([A, B, C]))).toEqual(parseFeed(JSON.stringify([C, A, B])));
  });

  it("skips a few malformed entries and the zero address", () => {
    const many = Array.from(
      { length: 19 },
      (_, i) => `0x${(i + 1).toString(16).padStart(40, "0")}`,
    );
    const feed = parseFeed(JSON.stringify([...many, "not-an-address"]));
    expect(feed).toHaveLength(19);
    expect(parseFeed(JSON.stringify([A, `0x${"0".repeat(40)}`]))).toEqual([A]);
  });

  it.each([
    ["a page that is not JSON", "<html>rate limited</html>"],
    ["an object", JSON.stringify({ addresses: [A] })],
    ["an empty list", "[]"],
    ["a list that is mostly not addresses", JSON.stringify([A, "x", "y", 3])],
    ["only the zero address", JSON.stringify([`0x${"0".repeat(40)}`])],
  ])("refuses %s", (_name, body) => {
    expect(() => parseFeed(body)).toThrow(/^threat feed/);
  });
});

describe("the window", () => {
  const feed = Array.from({ length: 45 }, (_, i) => `0x${(i + 1).toString(16).padStart(40, "0")}`);
  const config = { windowSize: 20, rotationSeconds: 600 };

  it("splits the feed into whole windows and one short one", () => {
    expect(windowCount(45, 20)).toBe(3);
    expect(windowCount(40, 20)).toBe(2);
    expect(windowCount(0, 20)).toBe(1);
  });

  it("stays on one window for a rotation, then moves on and comes around", () => {
    expect(windowIndex(0, 600, 3)).toBe(0);
    expect(windowIndex(599_999, 600, 3)).toBe(0);
    expect(windowIndex(600_000, 600, 3)).toBe(1);
    expect(windowIndex(1_200_000, 600, 3)).toBe(2);
    expect(windowIndex(1_800_000, 600, 3)).toBe(0);
  });

  it("reaches every entry exactly once per pass", () => {
    const seen = [0, 1, 2].flatMap((step) => selectWindow(feed, step * 600_000, config).addresses);
    expect(seen).toEqual(feed);
  });

  it("returns a short last window", () => {
    const last = selectWindow(feed, 1_200_000, config);
    expect(last).toMatchObject({ index: 2, windows: 3 });
    expect(last.addresses).toHaveLength(5);
  });
});

describe("what goes to the chain", () => {
  it("encodes the report the registry decodes", () => {
    const targets = [getAddress(A), getAddress(B)];
    const [decodedTargets, severities, reasons] = decodeAbiParameters(
      parseAbiParameters("address[], uint8[], string[]"),
      encodeReport(targets, { severity: 3, reasonCode: "SCAMSNIFFER_BLACKLIST" }),
    );
    expect(decodedTargets).toEqual(targets);
    expect(severities).toEqual([3, 3]);
    expect(reasons).toEqual(["SCAMSNIFFER_BLACKLIST", "SCAMSNIFFER_BLACKLIST"]);
  });

  it("asks the receiver with the pending selector and reads its answer", () => {
    const call = encodePendingCall([A, C.toLowerCase()]);
    expect(call.startsWith("0x")).toBe(true);
    // 4-byte selector, offset, length, two addresses.
    expect((call.length - 2) / 2).toBe(4 + 32 * 4);

    const answer = encodeFunctionResult({
      abi: receiverAbi,
      functionName: "pending",
      result: [getAddress(C)],
    });
    expect(decodePendingResult(answer)).toEqual([getAddress(C)]);
  });

  it("keeps a full window inside the 5 KB read limit", () => {
    const full = Array.from(
      { length: 100 },
      (_, i) => `0x${(i + 1).toString(16).padStart(40, "0")}`,
    );
    expect((encodePendingCall(full).length - 2) / 2).toBeLessThan(5_000);
  });
});
