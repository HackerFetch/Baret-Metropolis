import { common, sign, walletFrame } from "@baret/content";
import { VerdictTag } from "@baret/ui";
import type { JSX, ReactNode } from "react";
import type { SignRequest as Request } from "../data/types.js";
import { blockedSummary } from "./sign.js";

/**
 * Baret's answer, first and biggest: the verdict tag, its title, the one
 * sentence that says why, and what happens if you sign (when the trial run
 * failed, why it would fail, with the faucet for an account with no MON, so
 * the real reason sits above the fold). Tinted with the
 * verdict's colour; Can't reach Baret wears Blocked's, because it counts as
 * Blocked. The surface's own art (the extension's tag) sits beside it.
 */

/** The verdict's title and one-line summary, for whichever verdict came back. */
export function verdictWords(
  request: Request,
  message = false,
): { title: string; summary: string } {
  const { verdict } = sign;
  return request.verdict === "safe"
    ? {
        title: verdict.safe.title,
        summary: message ? verdict.safe.summaryMessage : verdict.safe.summary,
      }
    : request.verdict === "caution"
      ? { title: verdict.caution.title, summary: verdict.caution.summary }
      : request.verdict === "blocked"
        ? { title: verdict.blocked.title, summary: blockedSummary(request) }
        : { title: verdict.unreachable.title, summary: verdict.unreachable.summary };
}

const TONE: Record<Request["verdict"], string> = {
  safe: "border-[color:var(--safe)] bg-[color:var(--safe-dim)]",
  caution: "border-[color:var(--caution)] bg-[color:var(--caution-dim)]",
  blocked: "border-[color:var(--blocked)] bg-[color:var(--blocked-dim)]",
  unreachable: "border-[color:var(--blocked)] bg-[color:var(--blocked-dim)]",
};

export function VerdictCard({
  request,
  message = false,
  impact,
  art,
  compact = false,
  faucet = false,
}: {
  request: Request;
  message?: boolean;
  /** One sentence: what actually moves if you sign, or why it would fail. */
  impact: string;
  art?: ReactNode;
  compact?: boolean;
  /** The account holds no MON: the faucet link follows the impact line, above the fold. */
  faucet?: boolean;
}): JSX.Element {
  const words = verdictWords(request, message);
  return (
    <div
      className={`grid gap-3 border-l-4 ${compact ? "px-4 py-4" : "px-5 py-5"} ${TONE[request.verdict]} motion-safe:animate-[verdict-in_240ms_ease-out]`}
    >
      <style>
        {
          "@keyframes verdict-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}"
        }
      </style>
      <div className={art ? "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4" : "grid"}>
        <div className="grid gap-2.5">
          <div className="flex">
            <VerdictTag kind={request.verdict} label={common.verdicts[request.verdict].label} />
          </div>
          <p
            className={`font-display font-extrabold uppercase leading-tight text-[color:var(--fg)] ${compact ? "text-xl" : "text-2xl"}`}
          >
            {words.title}
          </p>
          <p className="text-base text-[color:var(--fg)]">{words.summary}</p>
        </div>
        {art}
      </div>
      <div className="grid gap-0.5 border-t border-[color:var(--rule)] pt-3">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[color:var(--fg-muted)]">
          {sign.impact.label}
        </p>
        <p className="text-sm text-[color:var(--fg)] [overflow-wrap:anywhere]">
          {impact}
          {faucet ? (
            <>
              {" "}
              <a
                href={walletFrame.links.faucet}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[color:var(--fg)] underline underline-offset-4"
              >
                {sign.findings.faucet}
              </a>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
