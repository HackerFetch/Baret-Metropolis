import { findings as findingCopy, sign, walletFrame } from "@baret/content";
import { truncateAddress } from "@baret/ui";
import { bodyOf, hasValues } from "@baret/web-ui/components/CheckBlocks";
import type { CheckFinding } from "@baret/web-ui/lib/check-types";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useId } from "react";
// By file: findings.ts imports types only, so zod stays out of this chunk.
import { FINDING_SPECS } from "../../../guard/src/findings.js";
import { toUnits } from "../data/format.js";
import { fillParts } from "../lib/parts.js";
import { KEEP_CASE } from "../sign/sign.js";
import { Parts } from "./Parts.js";

/** Monad's own words when a call reverts because the account cannot pay for it. */
const BALANCE_REVERT = /balance|insufficient funds/i;

/**
 * What a failed simulation can say beyond its sentence: Monad's reason, and
 * the faucet when the account holds no MON. `monBalance` null or undefined
 * means the balance is not known; then the faucet shows only when Monad's
 * reason itself names the balance. Exported for the tests.
 */
export function simulationNotes(
  item: Pick<CheckFinding, "code" | "details">,
  monBalance: string | null | undefined,
): { reason: string | null; noMon: boolean } {
  if (item.code !== "SIMULATION_FAILED") return { reason: null, noMon: false };
  const raw = item.details?.revertReason;
  const reason = typeof raw === "string" && raw.trim() !== "" ? raw.trim().slice(0, 240) : null;
  const units = typeof monBalance === "string" ? toUnits(monBalance, 18) : null;
  const zero = units === 0n;
  const unknown = units === null;
  return { reason, noMon: zero || (unknown && reason !== null && BALANCE_REVERT.test(reason)) };
}

/**
 * Findings in Baret's own words: the severity, the title, the sentence with
 * the request's values, the fix when every value it needs is there, and why
 * it matters behind a native disclosure (one open at a time, 44 px target). Shared by the sign request and the
 * activity log's details. Addresses are shortened in the title only; the
 * sentence keeps them whole, wrapped.
 */
export function Findings({
  items,
  monBalance,
}: {
  items: readonly CheckFinding[];
  /** Live: the account's MON balance, for a failed simulation's real reason. */
  monBalance?: string | null;
}): JSX.Element {
  // One shared name makes the "why" disclosures exclusive.
  const group = useId();
  if (items.length === 0) return <p className={T.body}>{sign.findings.none}</p>;
  return (
    <ul className="grid gap-5">
      {items.map((item, i) => {
        const words = findingCopy[item.code];
        const severity = FINDING_SPECS[item.code].severity;
        const titleValues = Object.fromEntries(
          Object.entries(item.values).map(([key, value]) => [
            key,
            value.startsWith("0x") && value.length === 42 ? truncateAddress(value) : value,
          ]),
        );
        const { template, values } = bodyOf(words, item);
        const notes = simulationNotes(item, monBalance);
        return (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: an answer can repeat a code (both sides of a compliance check), and the list never reorders.
            key={`${item.code}-${i}`}
            className="grid gap-1.5 border-l-4 border-[color:var(--rule-strong)] pl-4"
          >
            <p className={T.label}>{sign.findings.severity[severity]}</p>
            <p className="font-display text-lg font-bold uppercase tracking-[0.02em] text-[color:var(--fg)]">
              {/* An address keeps its case inside the uppercase title. */}
              <Parts parts={fillParts(words.title, titleValues, KEEP_CASE)} />
            </p>
            <p className={`${T.body} [overflow-wrap:anywhere]`}>{fill(template, values)}</p>
            {notes.noMon ? (
              <p className={`${T.body} [overflow-wrap:anywhere]`}>
                {sign.findings.noMon}{" "}
                <a
                  href={walletFrame.links.faucet}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 text-[color:var(--fg)]"
                >
                  {sign.findings.faucet}
                </a>
              </p>
            ) : null}
            {notes.reason ? (
              <p className={`${T.small} [overflow-wrap:anywhere]`}>
                {fill(sign.findings.revertReason, { reason: notes.reason })}
              </p>
            ) : null}
            {"fix" in words && words.fix && hasValues(words.fix, item.values) ? (
              <p className={`${T.small} [overflow-wrap:anywhere]`}>
                {fill(words.fix, item.values)}
              </p>
            ) : null}
            {"why" in words && words.why ? (
              <details name={group} className="group">
                <summary className="flex min-h-11 w-fit max-w-full cursor-pointer list-none items-center gap-2 text-sm font-medium text-[color:var(--fg)] [&::-webkit-details-marker]:hidden">
                  <span
                    aria-hidden="true"
                    className="font-mono text-base text-[color:var(--fg-muted)] transition-transform duration-[160ms] group-open:rotate-45 motion-reduce:transition-none"
                  >
                    +
                  </span>
                  {sign.findings.why}
                </summary>
                <p className={`${T.small} mt-2 max-w-[60ch] [overflow-wrap:anywhere]`}>
                  {fill(words.why, item.values)}
                </p>
              </details>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
