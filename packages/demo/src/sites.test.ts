import { analyzeRequestSchema } from "@baret/guard";
import { decodeFunctionData, getAddress, maxUint256, parseAbi } from "viem";
import { describe, expect, it } from "vitest";
import { claimhub, DEMO, launchpad, orbityield, pixeldrop } from "./sites.js";
import { agents, SCRYBE, scrybe } from "./x402.js";

const USER = "0x1111111111111111111111111111111111111111";
const ABI = parseAbi([
  "function mint(uint256 count) payable",
  "function setApprovalForAll(address operator, bool approved)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

const addresses = (o: unknown): string[] =>
  typeof o === "string"
    ? /^0x[0-9a-fA-F]{40}$/.test(o)
      ? [o]
      : []
    : o && typeof o === "object"
      ? Object.values(o).flatMap(addresses)
      : [];

describe("demo sites", () => {
  it("keeps every address checksummed", () => {
    for (const a of [...addresses(DEMO), SCRYBE.payTo, SCRYBE.otherWallet]) {
      expect(getAddress(a), a).toBe(a);
    }
  });

  it("prices a mint and points the attack at the drainer", () => {
    const mint = pixeldrop.mint(USER, 3);
    expect(mint).toMatchObject({ to: DEMO.pixeldrop.collection, value: "30000000000000000" });
    expect(decodeFunctionData({ abi: ABI, data: mint.data }).args).toEqual([3n]);
    expect(
      decodeFunctionData({ abi: ABI, data: pixeldrop.attackApproveAll(USER).data }).args,
    ).toEqual([DEMO.drainer, true]);
  });

  it("sends the honest and the attack version of a site to different contracts", () => {
    expect(orbityield.stake(USER, 1n).to).toBe(DEMO.orbityield.pool);
    expect(orbityield.attackStake(USER, 1n).to).toBe(DEMO.orbityield.silentPool);
    expect(launchpad.contribute(USER, 1n).to).toBe(DEMO.launchpad.sale);
    expect(launchpad.attackContribute(USER, 1n).to).toBe(DEMO.launchpad.proxySale);
    expect(claimhub.claim(USER).to).toBe(DEMO.claimhub.distributor);
  });

  it("makes ClaimHub's attack an unlimited allowance on the real USDC", () => {
    const t = claimhub.attackApprove(USER);
    expect(t.to).toBe(DEMO.usdc);
    expect(decodeFunctionData({ abi: ABI, data: t.data }).args).toEqual([DEMO.drainer, maxUint256]);
  });
});

describe("x402", () => {
  const valid = (body: object) =>
    analyzeRequestSchema.safeParse({ network: "testnet", ...body }).success;

  it("builds requests the analyze contract accepts", () => {
    for (const p of [
      scrybe.pay(USER),
      scrybe.pay(USER, 4),
      agents.pay(USER),
      agents.wrongPayee(USER),
      agents.lookalikeToken(USER),
    ]) {
      expect(valid(p)).toBe(true);
    }
    for (const t of [
      agents.unlimitedAllowance(USER),
      agents.operatorApproval(USER),
      agents.flaggedAddress(USER),
    ]) {
      expect(valid({ transaction: t })).toBe(true);
    }
  });

  it("carries one history entry per earlier payment, all inside the last hour", () => {
    const now = 1_800_000_000;
    const p = scrybe.pay(USER, 5, now);
    expect(p.payment.spendHistory).toHaveLength(5);
    for (const s of p.payment.spendHistory) {
      expect(s.timestamp).toBeLessThan(now);
      expect(s.timestamp).toBeGreaterThan(now - 3600);
      expect(s.amount).toBe(SCRYBE.price.toString());
    }
  });

  it("differs from the honest payment only where the action says", () => {
    const honest = agents.pay(USER);
    expect(honest.typedData.message.to).toBe(honest.payment.payTo);
    expect(agents.wrongPayee(USER).typedData.message.to).toBe(SCRYBE.otherWallet);
    expect(agents.wrongPayee(USER).payment.payTo).toBe(SCRYBE.payTo);
    const fake = agents.lookalikeToken(USER);
    expect(fake.typedData.domain.verifyingContract).toBe(DEMO.fakeUsdc);
    expect(fake.payment.asset).toBe(DEMO.usdc);
  });
});
