/**
 * Writes the showcase scenarios as plain JSON: the exact bodies of
 * `POST /v1/analyze`, with what each site expects. The agent example
 * (examples/agent-blind-signing) reads the file, so it needs nothing from this
 * workspace but the published SDK.
 *
 *   pnpm --filter @baret/server export:scenarios -- --from 0x... --out ../../examples/agent-blind-signing/scenarios.json
 *
 * `--from` is the wallet the requests are simulated from; see verify-demo.ts
 * for what it has to hold.
 */
import { writeFileSync } from "node:fs";
import { getAddress } from "viem";
import { analyzeBody, demoScenarios } from "./demo-scenarios.js";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const fromArg = arg("from");
const out = arg("out");
if (!fromArg || !out) {
  console.error("usage: export-scenarios --from 0x<funded testnet wallet> --out <file.json>");
  process.exit(2);
}
const from = getAddress(fromArg);

const scenarios = demoScenarios(from, { cleanverse: true }).map((s) => ({
  name: s.name.replace(/\s+/g, " "),
  // What the request does to the signer: nothing a site would not say, or harm.
  kind: s.verdict === "safe" ? "honest" : "harmful",
  expected: { decision: s.verdict, codes: s.codes },
  request: analyzeBody(s, from),
}));

writeFileSync(out, `${JSON.stringify({ simulatedFrom: from, scenarios }, null, 2)}\n`);
console.log(`${scenarios.length} scenarios written to ${out}`);
