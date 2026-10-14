/**
 * Runs every showcase scenario against a Baret server and compares the
 * verdict and the finding codes with what the site expects.
 *
 *   pnpm --filter @baret/server verify:demo -- --api https://baret-monad-api.onrender.com --from 0x...
 *
 * `--from` is the wallet the requests are simulated from (no key needed). It
 * needs a few MON, and at least 1 real test USDC and 1 fake USDC for the
 * payment scenarios. It must not hold a Cleanverse A-Pass (the deploy wallet
 * does): the last scenario sends aUSDC to it and expects the asset to refuse.
 * Exits 1 when any scenario disagrees.
 *
 * The two Cleanverse scenarios are simulated from a third party's verified
 * wallet (packages/demo/src/cleanverse.ts) and need the server to have the
 * Cleanverse contract addresses; `--skip-cleanverse` leaves them out.
 */
import { analyzeResponseSchema } from "@baret/guard";
import { type Address, getAddress } from "viem";
import { analyzeBody, demoScenarios } from "./demo-scenarios.js";

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
const scenarios = demoScenarios(from, { cleanverse: !process.argv.includes("--skip-cleanverse") });

const sorted = (xs: string[]) => [...xs].sort().join(",");
let failed = 0;

// `--only <text>` runs the scenarios whose name contains the text; `--pause <ms>`
// waits between requests, for a server reading from a rate-limited RPC.
const only = arg("only")?.toLowerCase();
const pause = Number(arg("pause") ?? 0);
const picked = only ? scenarios.filter((s) => s.name.toLowerCase().includes(only)) : scenarios;

for (const s of picked) {
  if (pause > 0) await new Promise((resolve) => setTimeout(resolve, pause));
  const body = analyzeBody(s, from);
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
