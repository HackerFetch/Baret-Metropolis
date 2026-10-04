import { CONNECTS, type ConnectSampleId, REQUESTS, type RequestSample } from "../data/sample.js";
import type { Scenario } from "../data/store.js";

/**
 * Where a page starts while the wallet is a sample. The background decides
 * the popup's phase once it is wired; until then the URL can name it, so a
 * reviewer (or a screenshot) can open any state directly:
 *
 *   popup.html?phase=signing&request=blocked
 *   popup.html?phase=connecting&connect=insecure
 *   options.html?sample=empty#/activity
 *   popup.html?offline=1           (Baret does not answer)
 *   popup.html?sample=loading      (the first check never answers)
 *
 * Anything missing or unknown falls back to the first run of a new wallet in
 * the popup, and to the account with history in the options page.
 */

export const PHASES = [
  "uninitialized",
  "locked",
  "ready",
  "alert",
  "signing",
  "connecting",
] as const;

export type StartPhase = (typeof PHASES)[number];

export interface Start {
  readonly scenario: Scenario;
  readonly phase: StartPhase;
  readonly request: RequestSample;
  readonly connect: ConnectSampleId;
  /**
   * The sample server's answer to the reachability check: true by default,
   * false for the offline preview, null for the loading one (never answers).
   */
  readonly reachable: boolean | null;
}

function pick<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

const REQUEST_IDS = [...(Object.keys(REQUESTS) as RequestSample[]), "queue"] as const;
const CONNECT_IDS = Object.keys(CONNECTS) as ConnectSampleId[];

export function readStart(search: string, fallbackPhase: StartPhase = "uninitialized"): Start {
  const params = new URLSearchParams(search);
  const sample = params.get("sample");
  return {
    scenario: sample === "empty" ? "empty" : "full",
    phase: pick(params.get("phase"), PHASES, fallbackPhase),
    request: pick(params.get("request"), REQUEST_IDS, "safe"),
    connect: pick(params.get("connect"), CONNECT_IDS, "firstTime"),
    reachable: params.get("offline") === "1" ? false : sample === "loading" ? null : true,
  };
}

/**
 * The query that carries a scenario to the other page (the popup opens options
 * in a tab), and the reachability preview when one is given.
 */
export function scenarioQuery(scenario: Scenario, reachable: boolean | null = true): string {
  const params = new URLSearchParams();
  if (scenario === "empty") params.set("sample", "empty");
  else if (reachable === null) params.set("sample", "loading");
  if (reachable === false) params.set("offline", "1");
  const query = params.toString();
  return query ? `?${query}` : "";
}
