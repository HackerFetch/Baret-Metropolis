/**
 * The showcase scenarios, each with the verdict and the finding codes its site
 * expects: six sites and the agents playground, honest and attack, and the two
 * Cleanverse transfers. Built with `@baret/demo` from the wallet the requests
 * are simulated from. Read by verify-demo.ts, which sends them to a server,
 * and by export-scenarios.ts, which writes them out for the agent example.
 */
import {
  agents,
  CLEANVERSE,
  claimhub,
  cleanverse,
  type DemoPayment,
  type DemoTx,
  launchpad,
  novaswap,
  orbityield,
  pixeldrop,
  scrybe,
} from "@baret/demo";
import { type AnalyzeResponse, createPolicy } from "@baret/guard";
import { type Address, getAddress, parseEther } from "viem";

const USDC = "0x534b2f3A21130d7a60830c2Df862319e593943A3";

export interface Scenario {
  name: string;
  request: DemoTx | DemoPayment;
  /** The wallet whose balances the rules protect. Default: `--from`. */
  wallet?: Address;
  /** Extra request fields: a template name or full rules. */
  with?: object;
  verdict: AnalyzeResponse["decision"];
  codes: string[];
}

const mon = (n: string) => parseEther(n);
const capped = (cap: string) => ({
  policy: { ...createPolicy("balanced", { allowedAssets: [USDC] }), maxHourlyCap: cap },
});

export function demoScenarios(from: Address, options: { cleanverse: boolean }): Scenario[] {
  const scenarios: Scenario[] = [
    {
      name: "NovaSwap   honest swap",
      request: novaswap.swapMonForUsdc(from, mon("0.5")),
      verdict: "safe",
      codes: [],
    },
    {
      name: "NovaSwap   attack: unlimited approval to the look-alike",
      request: novaswap.attackApprove(from),
      verdict: "blocked",
      // The drainer was ground to copy the router's first and last characters.
      codes: ["ERC20_APPROVAL_UNLIMITED", "KNOWN_MALICIOUS_ADDRESS", "LOOKALIKE_ADDRESS"],
    },
    {
      name: "PixelDrop  honest mint of 2",
      request: pixeldrop.mint(from, 2),
      verdict: "safe",
      codes: [],
    },
    {
      name: "PixelDrop  attack: whole collection to the drainer",
      request: pixeldrop.attackApproveAll(from),
      verdict: "blocked",
      codes: ["NFT_OPERATOR_GRANTED", "KNOWN_MALICIOUS_ADDRESS"],
    },
    {
      name: "OrbitYield honest stake",
      request: orbityield.stake(from, mon("1")),
      verdict: "safe",
      codes: [],
    },
    {
      name: "OrbitYield attack: silent pool, small",
      request: orbityield.attackStake(from, mon("0.1")),
      verdict: "blocked",
      codes: ["UNKNOWN_CONTRACT_EXPOSURE", "VALUE_KEPT_BY_UNKNOWN_CONTRACT"],
    },
    { name: "ClaimHub   honest claim", request: claimhub.claim(from), verdict: "safe", codes: [] },
    {
      name: "ClaimHub   attack: unlimited USDC to the drainer",
      request: claimhub.attackApprove(from),
      verdict: "blocked",
      codes: ["ERC20_APPROVAL_UNLIMITED", "KNOWN_MALICIOUS_ADDRESS"],
    },
    {
      name: "LaunchPad  honest contribution",
      request: launchpad.contribute(from, mon("0.2")),
      verdict: "safe",
      codes: [],
    },
    {
      name: "LaunchPad  proxy sale",
      request: launchpad.attackContribute(from, mon("0.2")),
      verdict: "blocked",
      codes: ["UNKNOWN_CONTRACT_EXPOSURE", "UNKNOWN_CONTRACT_EXPOSURE", "DELEGATECALL_DETECTED"],
    },
    {
      name: "Scrybe     first answer, cap 0.25",
      request: scrybe.pay(from, 0),
      with: capped("0.25"),
      verdict: "safe",
      codes: [],
    },
    {
      name: "Scrybe     sixth answer in the hour, cap 0.25",
      request: scrybe.pay(from, 5),
      with: capped("0.25"),
      verdict: "blocked",
      codes: ["X402_HOURLY_CAP_EXCEEDED"],
    },
    {
      name: "Agents     pay a merchant",
      request: agents.pay(from),
      with: { policyTemplate: "balanced" },
      verdict: "safe",
      codes: [],
    },
    {
      name: "Agents     unlimited allowance",
      request: agents.unlimitedAllowance(from),
      with: { policyTemplate: "balanced" },
      verdict: "blocked",
      codes: ["ERC20_APPROVAL_UNLIMITED", "UNKNOWN_CONTRACT_EXPOSURE"],
    },
    {
      name: "Agents     pay the wrong address",
      request: agents.wrongPayee(from),
      with: { policyTemplate: "balanced" },
      verdict: "caution",
      codes: ["X402_DESTINATION_MISMATCH"],
    },
    {
      name: "Agents     pay with a look-alike token",
      request: agents.lookalikeToken(from),
      with: { policyTemplate: "balanced" },
      verdict: "blocked",
      codes: ["X402_ASSET_MISMATCH", "X402_NON_CANONICAL_ASSET"],
    },
    {
      name: "Agents     hand over a collection",
      request: agents.operatorApproval(from),
      with: { policyTemplate: "balanced" },
      verdict: "blocked",
      // The operator is a wallet, not a marketplace contract.
      codes: ["NFT_OPERATOR_GRANTED", "APPROVAL_TO_WALLET"],
    },
    {
      name: "Agents     send to a flagged wallet",
      request: agents.flaggedAddress(from),
      with: { policyTemplate: "balanced" },
      verdict: "blocked",
      codes: ["KNOWN_MALICIOUS_ADDRESS"],
    },
  ];

  if (options.cleanverse) {
    const holder = getAddress(CLEANVERSE.verifiedHolder);
    scenarios.push(
      {
        name: "Cleanverse aUSDC to a verified wallet",
        request: cleanverse.transfer(holder, getAddress(CLEANVERSE.verifiedRecipient), 1_000_000n),
        wallet: holder,
        with: { policyTemplate: "balanced" },
        verdict: "safe",
        codes: [],
      },
      {
        // `--from` has no A-Pass: the asset refuses, and Baret names the reason.
        name: "Cleanverse aUSDC to a wallet with no credential",
        request: cleanverse.transfer(holder, from, 1_000_000n),
        wallet: holder,
        with: { policyTemplate: "balanced" },
        verdict: "blocked",
        codes: ["SIMULATION_FAILED", "COMPLIANCE_NO_CREDENTIAL"],
      },
    );
  }
  return scenarios;
}

/** The body of `POST /v1/analyze` for a scenario. */
export function analyzeBody(s: Scenario, from: Address): object {
  return "typedData" in s.request
    ? { network: "testnet", ...s.request, ...s.with }
    : { network: "testnet", transaction: s.request, userWallet: s.wallet ?? from, ...s.with };
}
