import { decodeFunctionData, getAddress, maxUint256 } from "viem";
import { describe, expect, it } from "vitest";
import {
  DEMO_USDC_ABI,
  NOVASWAP,
  NOVASWAP_ROUTER_ABI,
  novaswap,
  quoteMonForUsdc,
} from "./novaswap.js";

const USER = "0x1111111111111111111111111111111111111111";

describe("NovaSwap demo", () => {
  it("keeps every address checksummed", () => {
    for (const a of [NOVASWAP.usdc, NOVASWAP.router, NOVASWAP.lookalike, NOVASWAP.sink]) {
      expect(getAddress(a)).toBe(a);
    }
  });

  it("makes the look-alike start and end like the router", () => {
    const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-3)}`.toLowerCase();
    expect(short(NOVASWAP.lookalike)).toBe(short(NOVASWAP.router));
    expect(NOVASWAP.lookalike.toLowerCase()).not.toBe(NOVASWAP.router.toLowerCase());
  });

  it("quotes at 3.2 dUSDC per MON", () => {
    expect(quoteMonForUsdc(10n ** 18n)).toBe(3_200_000n);
  });

  it("builds the honest swap with MON attached and the quote as the minimum", () => {
    const t = novaswap.swapMonForUsdc(USER, 10n ** 18n);
    expect(t).toMatchObject({ from: USER, to: NOVASWAP.router, value: "1000000000000000000" });
    const call = decodeFunctionData({ abi: NOVASWAP_ROUTER_ABI, data: t.data });
    expect(call).toEqual({ functionName: "swapMonForUsdc", args: [3_200_000n] });
  });

  it("builds the attack as an unlimited allowance to the look-alike", () => {
    const t = novaswap.attackApprove(USER);
    expect(t.to).toBe(NOVASWAP.usdc);
    const call = decodeFunctionData({ abi: DEMO_USDC_ABI, data: t.data });
    expect(call).toEqual({ functionName: "approve", args: [NOVASWAP.lookalike, maxUint256] });
  });

  it("builds the honest allowance for exactly the amount sold", () => {
    const call = decodeFunctionData({
      abi: DEMO_USDC_ABI,
      data: novaswap.approveExact(USER, 9_600_000n).data,
    });
    expect(call.args).toEqual([NOVASWAP.router, 9_600_000n]);
  });
});
