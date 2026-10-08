/**
 * Runs every showcase scenario against a Baret server and compares the
 * verdict and the finding codes with what the site expects.
 *
 *   pnpm --filter @baret/server verify:demo -- --api https://baret-monad-api.onrender.com --from 0x...
 *
 * `--from` is the wallet the requests are simulated from (no key needed). It
 * needs a few MON, and at least 1 real test USDC and 1 fake USDC for the
 * payment scenarios. Exits 1 when any scenario disagrees.
 *
 * The two Cleanverse scenarios are simulated from a third party's verified
 * wallet (packages/demo/src/cleanverse.ts) and need the server to have the
 * Cleanverse contract addresses; `--skip-cleanverse` leaves them out.
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
import { type AnalyzeResponse, analyzeResponseSchema, createPolicy } from "@baret/guard";
import { type Address, getAddress, parseEther } from "viem";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const api = (arg("api") ?? "http://localhost:8080").replace(/\/+$/, "");
const fromArg = arg("from");
if (!fromArg) {
  console.error("usage: verify-demo --from 0x<funded testnet wallet> [--api <url>]");
  process.exit(2);
}
const from: Address = getAddress(fromArg);
const USDC = "0x534b2f3A21130d7a60830c2Df862319e593943A3";

interface Scenario {
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
    codes: ["ERC20_APPROVAL_UNLIMITED", "KNOWN_MALICIOUS_ADDRESS"],
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
    codes: ["NFT_OPERATOR_GRANTED"],
  },
  {
    name: "Agents     send to a flagged wallet",
    request: agents.flaggedAddress(from),
    with: { policyTemplate: "balanced" },
    verdict: "blocked",
    codes: ["KNOWN_MALICIOUS_ADDRESS"],
  },
];

if (!process.argv.includes("--skip-cleanverse")) {
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

const sorted = (xs: string[]) => [...xs].sort().join(",");
let failed = 0;

// `--only <text>` runs the scenarios whose name contains the text; `--pause <ms>`
// waits between requests, for a server reading from a rate-limited RPC.
const only = arg("only")?.toLowerCase();
const pause = Number(arg("pause") ?? 0);
const picked = only ? scenarios.filter((s) => s.name.toLowerCase().includes(only)) : scenarios;

for (const s of picked) {
  if (pause > 0) await new Promise((resolve) => setTimeout(resolve, pause));
  const body =
    "typedData" in s.request
      ? { network: "testnet", ...s.request, ...s.with }
      : { network: "testnet", transaction: s.request, userWallet: s.wallet ?? from, ...s.with };
  let line: string;
  try {
    const res = await fetch(`${api}/v1/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const parsed = analyzeResponseSchema.safeParse(await res.json());
    if (!res.ok || !parsed.success) {
      line = `FAIL  HTTP ${res.status}${parsed.success ? "" : ", body off the contract"}`;
      failed++;
    } else {
      const got = parsed.data.findings.map((f) => f.code);
      const ok = parsed.data.decision === s.verdict && sorted(got) === sorted(s.codes);
      if (!ok) failed++;
      line = ok
        ? `ok    ${parsed.data.decision}`
        : `FAIL  got ${parsed.data.decision} [${got.join(", ")}], expected ${s.verdict} [${s.codes.join(", ")}]`;
    }
  } catch (err) {
    failed++;
    line = `FAIL  ${err instanceof Error ? err.message : String(err)}`;
  }
  console.log(`${s.name.padEnd(56)} ${line}`);
}

console.log(`\n${picked.length - failed} of ${picked.length} scenarios agree with ${api}`);
process.exit(failed === 0 ? 0 : 1);
