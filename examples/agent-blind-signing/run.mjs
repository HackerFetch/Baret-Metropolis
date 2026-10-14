/**
 * Two agents are handed the same twenty requests on Monad testnet.
 *
 * The blind agent is what an agent with a key is today: it signs what it is
 * handed. The guarded agent asks Baret first, through the published SDK, and
 * signs only on a Safe verdict that is still fresh and for the right chain.
 *
 * Nothing is signed or sent here: no key is involved. "Signs" means "would
 * sign". Every verdict is a live answer of the API for that exact request.
 *
 *   npm install
 *   node run.mjs [--api https://baret-monad-api.onrender.com] [--pause 400]
 *
 * Exits 1 if the guarded agent would sign a harmful request, refuses an honest
 * one, or signs in any of the failure cases at the end.
 */
import { readFileSync } from "node:fs";
import { GuardUnreachableError, TransactionGuard, verdictRefusal } from "@baret/guard";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const api = arg("api", "https://baret-monad-api.onrender.com").replace(/\/+$/, "");
const pause = Number(arg("pause", "400"));
const CHAIN_ID = 10143; // Monad testnet
const say = (line) => process.stdout.write(`${line}\n`);

const { simulatedFrom, scenarios } = JSON.parse(
  readFileSync(new URL("./scenarios.json", import.meta.url), "utf8"),
);
const guard = new TransactionGuard({ baseUrl: api, timeoutMs: 60_000 });

/** The guarded agent's whole rule: Safe, fresh, right chain. Anything else is a refusal. */
async function guardedAgent(client, request) {
  try {
    const verdict = await client.evaluate(request);
    const stale = verdictRefusal(verdict, { chainId: CHAIN_ID });
    if (stale) return { signs: false, why: stale, verdict };
    return { signs: verdict.decision === "safe", why: verdict.decision, verdict };
  } catch (err) {
    if (err instanceof GuardUnreachableError) return { signs: false, why: "no answer" };
    throw err;
  }
}

const health = await fetch(`${api}/health`).then((r) => r.json());
say(`API ${api}, commit ${health.commit}, ${new Date().toISOString()}`);
say(`Requests simulated from ${simulatedFrom} on Monad testnet (chain ${CHAIN_ID})\n`);
say(
  `${"request".padEnd(54)} ${"kind".padEnd(8)} ${"blind".padEnd(6)} ${"guarded".padEnd(8)} verdict, findings`,
);

const count = {
  honest: 0,
  harmful: 0,
  blindHarm: 0,
  guardedHarm: 0,
  guardedHonest: 0,
  offExpectation: 0,
};
let lastSafe;

for (const s of scenarios) {
  await new Promise((resolve) => setTimeout(resolve, pause));
  const g = await guardedAgent(guard, s.request);
  const codes = g.verdict ? g.verdict.findings.map((f) => f.code) : [];
  const harmful = s.kind === "harmful";
  count[s.kind]++;
  if (harmful) count.blindHarm++;
  if (harmful && g.signs) count.guardedHarm++;
  if (!harmful && g.signs) count.guardedHonest++;
  if (g.why !== s.expected.decision) count.offExpectation++;
  if (g.verdict?.decision === "safe") lastSafe = g.verdict;
  say(
    `${s.name.padEnd(54)} ${s.kind.padEnd(8)} ${"signs".padEnd(6)} ${(g.signs ? "signs" : "refuses").padEnd(8)} ${g.why}${codes.length ? `: ${codes.join(", ")}` : ""}`,
  );
}

// The failure cases: what the guarded agent does when the check itself goes wrong.
say("\nWhen the check itself fails, the guarded agent:");
const failures = [];

const dead = new TransactionGuard({ baseUrl: "http://127.0.0.1:9", timeoutMs: 3_000 });
const unreachable = await guardedAgent(dead, scenarios[0].request);
failures.push(["Baret cannot be reached (an honest request)", unreachable]);

if (lastSafe) {
  const later = new Date(Date.parse(lastSafe.expiresAt) + 1_000);
  const expired = verdictRefusal(lastSafe, { chainId: CHAIN_ID, now: later });
  failures.push([
    "A Safe verdict, one second past its expiry",
    { signs: expired === null, why: expired ?? "still valid" },
  ]);
  const otherChain = verdictRefusal(lastSafe, { chainId: 143 });
  failures.push([
    "A Safe verdict, presented for another chain id",
    { signs: otherChain === null, why: otherChain ?? "still valid" },
  ]);
}
for (const [name, f] of failures) {
  say(`  ${name.padEnd(48)} ${f.signs ? "signs" : "refuses"} (${f.why})`);
}
const failedOpen = failures.filter(([, f]) => f.signs).length;

say(`
Harmful requests: ${count.harmful}. The blind agent would sign ${count.blindHarm}; the guarded agent would sign ${count.guardedHarm}.
Honest requests:  ${count.honest}. The blind agent would sign ${count.honest}; the guarded agent would sign ${count.guardedHonest}.
Verdicts that differ from what the demo sites expect: ${count.offExpectation}.
Failure cases that ended in a signature: ${failedOpen} of ${failures.length}.`);

const ok = count.guardedHarm === 0 && count.guardedHonest === count.honest && failedOpen === 0;
process.exit(ok ? 0 : 1);
