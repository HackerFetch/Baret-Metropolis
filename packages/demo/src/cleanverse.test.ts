import { decodeFunctionData, getAddress, parseAbi } from "viem";
import { describe, expect, it } from "vitest";
import { CLEANVERSE, cleanverse } from "./cleanverse.js";

describe("cleanverse", () => {
  it("builds an aUSDC transfer", () => {
    const from = getAddress(CLEANVERSE.verifiedHolder);
    const to = getAddress(CLEANVERSE.verifiedRecipient);
    const tx = cleanverse.transfer(from, to, 1_000_000n);

    expect(tx).toMatchObject({ from, to: CLEANVERSE.aUsdc, value: "0" });
    const call = decodeFunctionData({
      abi: parseAbi(["function transfer(address to, uint256 amount) returns (bool)"]),
      data: tx.data,
    });
    expect(call.args).toEqual([to, 1_000_000n]);
  });

  it("keeps checksummed addresses on Monad testnet", () => {
    expect(CLEANVERSE.chainId).toBe(10143);
    for (const a of [CLEANVERSE.apass, CLEANVERSE.policy, CLEANVERSE.aUsdc]) {
      expect(getAddress(a)).toBe(a);
    }
  });
});
