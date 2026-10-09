import { describe, expect, it } from "vitest";
import { parseSiteRequest, parseWalletAnswer, WINDOW_CHANNEL } from "./window.js";

const ADDRESS = "0x1365566191bAA9872A64AcDce963751d5343ff49";
const HASH = `0x${"ab".repeat(32)}`;

const connect = { channel: WINDOW_CHANNEL, type: "connect", id: "req_1-a" };
const sign = {
  channel: WINDOW_CHANNEL,
  type: "sign",
  id: "req-2",
  chainId: 10143,
  call: { to: ADDRESS, value: "1000000000000000000", data: "0xa9059cbb" },
};

describe("parseSiteRequest", () => {
  it("accepts a connect request and a sign request", () => {
    expect(parseSiteRequest(connect)).toEqual(connect);
    expect(parseSiteRequest(sign)).toEqual(sign);
    expect(
      parseSiteRequest({ ...sign, call: { ...sign.call, value: "0", data: "0x" } }),
    ).not.toBeNull();
  });

  it("rejects anything that is not a plain object", () => {
    for (const data of [null, undefined, "connect", 1, [connect], new Map()]) {
      expect(parseSiteRequest(data)).toBeNull();
    }
  });

  it("rejects a wrong channel or an unknown type", () => {
    expect(parseSiteRequest({ ...connect, channel: "baret-wallet/2" })).toBeNull();
    expect(parseSiteRequest({ ...connect, type: "ready" })).toBeNull();
  });

  it("rejects an extra key, at the top or in the call", () => {
    expect(parseSiteRequest({ ...connect, origin: "https://baret.app" })).toBeNull();
    expect(parseSiteRequest({ ...sign, call: { ...sign.call, gas: "1" } })).toBeNull();
  });

  it("rejects a bad id", () => {
    for (const id of ["", "a".repeat(65), "has space", "semi;colon", 7]) {
      expect(parseSiteRequest({ ...connect, id })).toBeNull();
    }
  });

  it("rejects a bad address", () => {
    for (const to of ["0x1234", ADDRESS.slice(2), `${ADDRESS}00`, `0x${"g".repeat(40)}`]) {
      expect(parseSiteRequest({ ...sign, call: { ...sign.call, to } })).toBeNull();
    }
  });

  it("rejects a value that is not a decimal string", () => {
    for (const value of ["0x10", "-1", "1.5", "1e18", "", "9".repeat(79), 1]) {
      expect(parseSiteRequest({ ...sign, call: { ...sign.call, value } })).toBeNull();
    }
  });

  it("rejects another chain id", () => {
    for (const chainId of [143, 1, "10143"]) {
      expect(parseSiteRequest({ ...sign, chainId })).toBeNull();
    }
  });

  it("rejects oversized or malformed data", () => {
    const big = `0x${"00".repeat(50_000)}`;
    expect(parseSiteRequest({ ...sign, call: { ...sign.call, data: big } })).toBeNull();
    expect(parseSiteRequest({ ...sign, call: { ...sign.call, data: "0xabc" } })).toBeNull();
    expect(parseSiteRequest({ ...sign, call: { ...sign.call, data: "abcd" } })).toBeNull();
  });
});

describe("parseWalletAnswer", () => {
  const refused = {
    channel: WINDOW_CHANNEL,
    type: "refused",
    id: "req-2",
    reason: "blocked",
    address: ADDRESS,
    findings: [
      { code: "UNLIMITED_APPROVAL", values: { asset: "dUSDC" } },
      { code: "DRAINER_2", values: {} },
    ],
  };

  it("accepts each answer", () => {
    const ready = { channel: WINDOW_CHANNEL, type: "ready" };
    const connected = { channel: WINDOW_CHANNEL, type: "connected", id: "r", address: ADDRESS };
    const signed = {
      channel: WINDOW_CHANNEL,
      type: "signed",
      id: "r",
      address: ADDRESS,
      hash: HASH,
    };
    expect(parseWalletAnswer(ready)).toEqual(ready);
    expect(parseWalletAnswer(connected)).toEqual(connected);
    expect(parseWalletAnswer(signed)).toEqual(signed);
    expect(parseWalletAnswer(refused)).toEqual(refused);
    expect(
      parseWalletAnswer({ ...refused, reason: "declined", address: null, findings: [] }),
    ).not.toBeNull();
  });

  it("rejects a wrong channel, an extra key or a non-object", () => {
    expect(parseWalletAnswer({ ...refused, channel: "other" })).toBeNull();
    expect(parseWalletAnswer({ channel: WINDOW_CHANNEL, type: "ready", id: "r" })).toBeNull();
    expect(parseWalletAnswer("ready")).toBeNull();
    expect(parseWalletAnswer(null)).toBeNull();
  });

  it("rejects a bad id, address or hash", () => {
    expect(parseWalletAnswer({ ...refused, id: "" })).toBeNull();
    expect(parseWalletAnswer({ ...refused, address: "0x12" })).toBeNull();
    const signed = { channel: WINDOW_CHANNEL, type: "signed", id: "r", address: ADDRESS };
    expect(parseWalletAnswer({ ...signed, hash: "0x12" })).toBeNull();
  });

  it("rejects an unknown reason and bad findings", () => {
    expect(parseWalletAnswer({ ...refused, reason: "nope" })).toBeNull();
    expect(
      parseWalletAnswer({ ...refused, findings: [{ code: "lowercase", values: {} }] }),
    ).toBeNull();
    expect(parseWalletAnswer({ ...refused, findings: ["DRAINER"] })).toBeNull();
    expect(
      parseWalletAnswer({ ...refused, findings: [{ code: "X", values: { "bad key": "v" } }] }),
    ).toBeNull();
    expect(
      parseWalletAnswer({ ...refused, findings: [{ code: "X", values: { asset: 1 } }] }),
    ).toBeNull();
    expect(
      parseWalletAnswer({ ...refused, findings: [{ code: "X", values: {}, extra: 1 }] }),
    ).toBeNull();
    expect(
      parseWalletAnswer({ ...refused, findings: [{ code: "X", values: { a: "x".repeat(201) } }] }),
    ).toBeNull();
    expect(parseWalletAnswer({ ...refused, findings: "DRAINER" })).toBeNull();
    expect(
      parseWalletAnswer({ ...refused, findings: Array(51).fill({ code: "X", values: {} }) }),
    ).toBeNull();
  });
});
