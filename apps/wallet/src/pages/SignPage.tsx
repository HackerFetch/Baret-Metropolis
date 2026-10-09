import { common, sign, walletFrame } from "@baret/content";
import type { WalletCall } from "@baret/wallet-core";
import { unreachable } from "@baret/wallet-ui/data/analyze";
import { SIGN_REQUESTS } from "@baret/wallet-ui/data/sample";
import { ready, useWallet } from "@baret/wallet-ui/data/store";
import type { SignRequest as Request } from "@baret/wallet-ui/data/types";
import { SignRequest } from "@baret/wallet-ui/sign/SignRequest";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { type LiveRequest, useLive } from "../live/live.js";
import { sessionTime } from "../live/session.js";
import { signWithSettings } from "../live/signWithSettings.js";
import { RequestFrame, SamplePicker, SiteStatus } from "../request/RequestFrame.js";
import { useSiteRequest } from "../request/siteRequest.js";
import { routes } from "../routes.js";
import { unchecked } from "./unchecked.js";

/**
 * /sign, the window a site opens to ask for a signature.
 *
 * Live, a site opened it (request/siteRequest.tsx): the site's one call is
 * checked with Baret and shown like a transfer from Send, and the answer goes
 * back to the site: signed with its hash, or refused with the reason and the
 * finding codes. Live with no site, the window says how it is opened.
 *
 * On the sample it loads one of four sample requests, one per verdict, each
 * from one of the showcase's demo sites. Picking a sample, or starting again
 * from a result, restarts the request from its check.
 */

const OPTIONS = SIGN_REQUESTS.map((request) => ({
  value: request.id,
  label: common.verdicts[request.verdict].label,
}));

const MAX_FINDINGS = 50;

/** Why a declined request was refused, as the site reads it. */
function reasonOf(verdict: Request["verdict"]): "blocked" | "unreachable" | "declined" {
  if (verdict === "blocked") return "blocked";
  if (verdict === "unreachable") return "unreachable";
  return "declined";
}

/** The site's request: checked with Baret, then signed or refused. */
function SiteSign(): JSX.Element {
  const { state, dispatch } = useWallet();
  const live = useLive();
  const site = useSiteRequest();
  const incoming = site.request?.type === "sign" ? site.request : null;
  const origin = site.origin;
  const call = useMemo<WalletCall | null>(
    () =>
      incoming
        ? { to: incoming.call.to, value: BigInt(incoming.call.value), data: incoming.call.data }
        : null,
    [incoming],
  );
  // Until Baret answers, the call reads as unchecked (fail-closed).
  const [review, setReview] = useState<Request | null>(null);
  const [pending, setPending] = useState(true);
  const [declined, setDeclined] = useState(false);
  const signable = useRef<LiveRequest["signable"]>(null);
  const asked = useRef(false);

  /** Asks Baret about the site's call and shows what came back. */
  async function ask(): Promise<Request | null> {
    if (!live || !call || !origin) return null;
    const answer = await live.siteRequest(origin, call);
    signable.current = answer.signable;
    setReview(answer.request);
    return answer.request;
  }

  // One check per request; a lock and unlock in between asks again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ask reads the same call and origin
  useEffect(() => {
    if (!call || !origin || asked.current) return;
    asked.current = true;
    void ask().then(() => setPending(false));
  }, [call, origin]);

  if (!incoming || !call || !origin) return <SiteStatus status="waiting" />;

  const shown =
    review ??
    unchecked(
      unreachable({
        id: incoming.id,
        origin,
        action: "contractCall",
        values: { contract: call.to },
        claim: null,
        impact: "unknown",
        fee: "0",
        raw: { to: call.to, value: incoming.call.value, data: call.data, decoded: null },
        expires: 300,
        wallet: state.address,
      }),
    );

  function decline(): void {
    setDeclined(true);
    // One per code, with the values its sentence takes, so the site words it fully.
    const byCode = new Map<string, { code: string; values: Record<string, string> }>();
    for (const finding of shown.findings) {
      if (!byCode.has(finding.code))
        byCode.set(finding.code, { code: finding.code, values: { ...finding.values } });
    }
    const findings = [...byCode.values()];
    site.reply({
      type: "refused",
      id: incoming?.id ?? "",
      reason: reasonOf(shown.verdict),
      // Refusing gives the site nothing, not even the address: only a
      // connect or a signature the reader approved carries it.
      address: null,
      findings: findings.slice(0, MAX_FINDINGS),
    });
  }

  /** Signs and sends what Baret cleared, after the passkey when the setting asks for it. */
  async function signLive(
    outcome: "sent" | "overridden",
    sending: () => void,
    progress: (step: "signing" | "sending") => void,
  ) {
    const cleared = signable.current;
    if (!live || !cleared) throw new Error("nothing was cleared to sign");
    return signWithSettings(
      live,
      state.settings.passkeyEverySignature,
      cleared,
      outcome,
      sending,
      progress,
    );
  }

  // An open session signs without a prompt, and the request says until when.
  const sessionNote =
    state.sessionEndsAt && !state.settings.passkeyEverySignature
      ? fill(sign.session.note, { time: sessionTime(state.sessionEndsAt) })
      : null;

  return (
    <>
      {declined ? null : (
        <SignRequest
          request={shown}
          pending={pending}
          onCheckAgain={ask}
          onSign={signLive}
          onDecline={decline}
          explorer={(hash: string) => `${walletFrame.links.explorer}/tx/${hash}`}
          // The wallet does not sign a block: the way past is the rule.
          canOverride={false}
          {...(sessionNote ? { sessionNote } : {})}
          // KIMI words a checked answer only: its id is Baret's requestId.
          {...(live && shown.verdict !== "unreachable" ? { explainId: shown.id } : {})}
          onLog={(item) => {
            dispatch({ type: "log", item });
            // Only a sent call carries a receipt hash; a contract call logs as
            // "signed", a transfer as "sent" (sign.ts logFor).
            if (item.hash && state.address) {
              site.reply({
                type: "signed",
                id: incoming.id,
                address: state.address as `0x${string}`,
                hash: item.hash as `0x${string}`,
              });
            }
          }}
          passkey={state.settings.passkeyEverySignature}
          // No link to the rules here: leaving /sign would drop the site's
          // request while the site still waits for an answer.
        />
      )}
      {site.answered ? <SiteStatus status="answered" origin={origin} /> : null}
    </>
  );
}

/** The sample: four requests, one per verdict. */
function Sample(): JSX.Element {
  const { state, dispatch } = useWallet();
  const [id, setId] = useState<Request["id"]>("safe");
  const [run, setRun] = useState(0);
  const picked = SIGN_REQUESTS.find((r) => r.id === id) ?? SIGN_REQUESTS[0];
  const request = picked && !ready(state, "analyzer") ? unchecked(picked) : picked;
  return (
    <RequestFrame picker={<SamplePicker options={OPTIONS} value={id} onChange={setId} />}>
      {request ? (
        <SignRequest
          key={`${id}-${run}`}
          request={request}
          onAgain={() => setRun((n) => n + 1)}
          onLog={(item) => dispatch({ type: "log", item })}
          passkey={state.settings.passkeyEverySignature}
          editRules={(label, className) => (
            <Link to={routes.policies.path} className={className}>
              {label}
            </Link>
          )}
        />
      ) : null}
    </RequestFrame>
  );
}

export function Component() {
  const live = useLive();
  const { site } = useSiteRequest();
  if (!live) return <Sample />;
  return (
    <RequestFrame picker={null}>{site ? <SiteSign /> : <SiteStatus status="none" />}</RequestFrame>
  );
}
