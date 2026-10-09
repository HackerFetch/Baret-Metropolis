import { common, onboarding, walletFrame } from "@baret/content";
import { Button } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Problem } from "@baret/wallet-ui/components/Block";
import { Brand } from "@baret/wallet-ui/components/Brand";
import { useWallet } from "@baret/wallet-ui/data/store";
import { ImgWell } from "@baret/web-ui/components/Img";
import { TwoToneText } from "@baret/web-ui/components/SectionHeader";
import { TextReveal } from "@baret/web-ui/components/TextReveal";
import { T } from "@baret/web-ui/lib/type";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { WALLET_ART } from "../assets.js";
import { SampleNotice } from "../components/SampleNotice.js";
import { useLive } from "../live/live.js";
import { routes } from "../routes.js";

/**
 * Setup is one screen: one passkey prompt makes the wallet, then Home opens
 * with a setup panel for the faucet and the rules (it reads `fresh` from the
 * router state). No recovery phrase anywhere, and the copy is honest about
 * the flip side: the passkey is the only way in.
 *
 * The sample stands in for the passkey prompt with a short wait, started by
 * the reader's own press; nothing runs on its own.
 */

type Attempt = "idle" | "creating" | "unlocking" | "createFailed" | "unlockFailed";

/** The router state Home reads to show its one-time setup panel. */
const FRESH = { fresh: true } as const;

export function Component() {
  const { state } = useWallet();
  const live = useLive();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<Attempt>("idle");
  // Live: a browser without WebAuthn is told before any tap; read once. The
  // sample's stand-in prompt needs no WebAuthn, so it never says this.
  const [unsupported] = useState(
    () => live !== null && typeof window.PublicKeyCredential === "undefined",
  );
  // Settings sends a reset wallet here with ?reset=1; read once.
  const [wasReset] = useState(
    () => new URLSearchParams(window.location.search).get("reset") === "1",
  );
  const { welcome } = onboarding;
  const words = onboarding.passkey;

  // The browser's passkey prompt, stood in for by a short wait.
  // ?sample=passkey-error makes it fail, to show the error state.
  useEffect(() => {
    if (live || attempt !== "creating") return;
    const id = window.setTimeout(() => {
      if (state.sample === "passkey-error") setAttempt("createFailed");
      else navigate(routes.home.path, { state: FRESH });
    }, 1200);
    return () => window.clearTimeout(id);
  }, [live, attempt, state.sample, navigate]);

  // Live: one passkey prompt makes the passkey and the account that comes from it.
  function create(): void {
    setAttempt("creating");
    if (!live) return;
    void live.create(words.userName).then((made) => {
      if (made) navigate(routes.home.path, { state: FRESH });
      else setAttempt("createFailed");
    });
  }

  // Live: "Open with my passkey". With storage cleared or on a new device
  // the browser offers the site's passkeys, and the same one gives the same account.
  function openExisting(): void {
    if (!live) {
      navigate(routes.home.path);
      return;
    }
    setAttempt("unlocking");
    void live.unlock().then((opened) => {
      if (opened) navigate(routes.home.path);
      else setAttempt("unlockFailed");
    });
  }

  const working = attempt === "creating" || attempt === "unlocking" || (live?.busy ?? false);

  // Create reads the onboarding errors, unlock the Locked screen's own.
  const problem = unsupported
    ? words.errors.unsupported
    : attempt === "createFailed"
      ? words.errors[live?.problem ?? "failed"]
      : attempt === "unlockFailed"
        ? walletFrame.locked.errors[live?.problem ?? "cancelled"]
        : null;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[color:var(--rule)] bg-[color:var(--ground-deep)]">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between gap-4 px-4 md:px-8 lg:px-12">
          <Brand />
          <Tag tone="network" size="sm">
            {common.networks.testnet.label}
          </Tag>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-[1120px] grid-cols-[minmax(0,1fr)] gap-10 px-4 pt-6 pb-20 md:px-8 md:pt-8 lg:px-12">
        <SampleNotice />
        {wasReset ? <p className={`${T.body} text-[color:var(--fg)]`}>{onboarding.reset}</p> : null}

        <section className="grid gap-10 md:grid-cols-12 md:items-start md:gap-8">
          <div className="@container grid content-start gap-6 md:col-span-7">
            <TextReveal
              as="h1"
              text={welcome.title}
              immediate
              className={`${T.h1Page} text-balance text-[color:var(--fg)]`}
            />
            <p className={`${T.lead} max-w-[52ch]`}>
              <TwoToneText text={welcome.body} />
            </p>
            <ul className="grid gap-6 border-t border-[color:var(--rule)] pt-6 sm:grid-cols-3 sm:gap-4">
              {welcome.pillars.map((pillar) => (
                <li key={pillar.title} className="grid content-start gap-1">
                  <p className={`${T.h3} text-[color:var(--fg)]`}>{pillar.title}</p>
                  <p className={T.small}>{pillar.body}</p>
                </li>
              ))}
            </ul>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Busy, not disabled, while a prompt is open: the pressed button
                  keeps focus. With no passkey support both stay disabled. */}
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={unsupported}
                aria-disabled={working || undefined}
                className="aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
                onClick={() => {
                  if (!working) create();
                }}
              >
                {welcome.action.label}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                disabled={unsupported}
                aria-disabled={working || undefined}
                className="aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
                onClick={() => {
                  if (!working) openExisting();
                }}
              >
                {welcome.existing.label}
              </Button>
            </div>
            <div className="grid gap-1">
              <p role="status" className="text-sm text-[color:var(--fg)]">
                {working ? (live ? words.working : words.sampleWorking) : ""}
              </p>
              {/* Only a real passkey prompt can ask twice. */}
              {live && attempt === "creating" ? <p className={T.small}>{words.twice}</p> : null}
            </div>
            {problem ? <Problem title={problem.title} body={problem.body} /> : null}
            <p className={T.small}>{welcome.existingNote}</p>
            <p className={T.small}>{welcome.footnote}</p>
          </div>
          <ImgWell
            asset={WALLET_ART.welcome}
            ratio="4/3"
            dim
            sizes="(min-width: 768px) 420px, 100vw"
            className="border border-[color:var(--rule)] md:col-span-5"
          />
        </section>
      </main>
    </div>
  );
}
