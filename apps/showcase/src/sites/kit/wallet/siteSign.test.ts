import { DEMO } from "@baret/demo";
import { decodeFunctionData, maxUint256, parseAbi } from "viem";
import { describe, expect, it } from "vitest";
import { signCalls as claimCalls } from "../../claimhub/source.js";
import { signCalls as contributeCalls } from "../../launchpad/source.js";
import { signCalls as stakeCalls } from "../../orbityield/source.js";
import { signCalls as mintCalls, buildRequest as mintRequest } from "../../pixeldrop/source.js";

const WALLET = "0x5aE13F1028144842f0384d09091067D6184F8197";
const ABI = parseAbi([
  "function setApprovalForAll(address operator, bool approved)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

describe('what a site\'s "Sign with your wallet" sends', () => {
  it("starts with the request Baret's panel checks", () => {
    expect(mintCalls("safe", 2, WALLET)).toEqual([mintRequest("safe", 2, WALLET)]);
    expect(mintCalls("danger", 2, WALLET)[0]).toEqual(mintRequest("danger", 2, WALLET));
  });

  it("sends one call for a payment: the honest pool or sale, or the other one", () => {
    expect(stakeCalls("safe", 5n, WALLET)).toMatchObject([
      { to: DEMO.orbityield.pool, value: "5" },
    ]);
    expect(stakeCalls("danger", 5n, WALLET)).toMatchObject([
      { to: DEMO.orbityield.silentPool, value: "5" },
    ]);
    expect(contributeCalls("safe", 7n, WALLET)).toMatchObject([
      { to: DEMO.launchpad.sale, value: "7" },
    ]);
    expect(contributeCalls("danger", 7n, WALLET)).toMatchObject([
      { to: DEMO.launchpad.proxySale, value: "7" },
    ]);
    expect(claimCalls("safe", WALLET)).toMatchObject([
      { to: DEMO.claimhub.distributor, value: "0" },
    ]);
  });

  it("closes what an attack's approval opened, as the last step", () => {
    const [open, close] = mintCalls("danger", 1, WALLET);
    expect(decodeFunctionData({ abi: ABI, data: open?.data ?? "0x" }).args).toEqual([
      DEMO.drainer,
      true,
    ]);
    expect(close?.to).toBe(DEMO.pixeldrop.collection);
    expect(decodeFunctionData({ abi: ABI, data: close?.data ?? "0x" }).args).toEqual([
      DEMO.drainer,
      false,
    ]);

    const [allow, revoke] = claimCalls("danger", WALLET);
    expect(decodeFunctionData({ abi: ABI, data: allow?.data ?? "0x" }).args).toEqual([
      DEMO.drainer,
      maxUint256,
    ]);
    expect(revoke?.to).toBe(DEMO.usdc);
    expect(decodeFunctionData({ abi: ABI, data: revoke?.data ?? "0x" }).args).toEqual([
      DEMO.drainer,
      0n,
    ]);
  });
});
