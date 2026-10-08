import { common, onboarding, walletFrame } from "@baret/content";
import { Button } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Problem } from "@baret/wallet-ui/components/Block";
import { Brand } from "@baret/wallet-ui/components/Brand";
import { fromTemplate } from "@baret/wallet-ui/data/rules";
import { useWallet } from "@baret/wallet-ui/data/store";
import { TemplateCards } from "@baret/wallet-ui/rules/TemplateCards";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { ImgWell } from "@baret/web-ui/components/Img";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { TwoToneText } from "@baret/web-ui/components/SectionHeader";
import { TextReveal } from "@baret/web-ui/components/TextReveal";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, type ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { PolicyTemplateName } from "../../../../packages/guard/src/policy-templates.js";
import type { ImgAsset } from "../assets.js";
import { WALLET_ART } from "../assets.js";
import { SampleNotice } from "../components/SampleNotice.js";
import { useLive } from "../live/live.js";
import { routes } from "../routes.js";

/**
 * Setup, full screen, one step at a time: welcome, passkey, funds, rules,
 * done. No recovery phrase anywhere, and the copy is honest about the flip
 * side: the passkey is the only way in. Each step has one main action and
 * its own picture. The passkey prompt and the faucet transfer are stood in
 * for by short waits, started by the reader's own press; nothing runs on its
 * own.
 */

type Step = 0 | 1 | 2 | 3 | 4;

/** The faucet's sample transfer, in MON. */
const FAUCET_AMOUNT = "40.00";
const MINIMUM = 0.1;

function Steps({ current }: { current: Step }): JSX.Element {
  return (
    <ol className="grid grid-cols-5 gap-2">
      {onboarding.steps.map((step, i) => (
        <li
          key={step}
          aria-current={i === current ? "step" : undefined}
          className={`grid gap-2 border-t-2 pt-2 ${i <= current ? "border-[color:var(--fg)]" : "border-[color:var(--rule)]"}`}
        >
          <span
            className={`font-mono text-label uppercase ${i === current ? "text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]"}`}
          >
            <span className={T.num}>{i + 1}</span> <span className="hidden sm:inline">{step}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function StepFrame({
  title,
  body,
  picture,
  children,
}: {
  title: string;
  body: string;
  picture: ImgAsset;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="grid gap-10 md:grid-cols-12 md:items-start md:gap-8">
      <div className="@container grid content-start gap-6 md:col-span-7">
        <TextReveal
          as="h1"
          text={title}
          immediate
          className={`${T.h1Page} text-balance text-[color:var(--fg)]`}
        />
        <p className={`${T.lead} max-w-[52ch]`}>
          <TwoToneText text={body} />
        </p>
        {children}
      </div>
      <ImgWell
        asset={picture}
        ratio="4/3"
        dim
        sizes="(min-width: 768px) 420px, 100vw"
        className="border border-[color:var(--rule)] md:col-span-5"
      />
    </section>
  );
}

export function Component() {
  const { state, dispatch } = useWallet();
  const live = useLive();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [passkey, setPasskey] = useState<"idle" | "working" | "ready" | "failed">("idle");
  const [funds, setFunds] = useState<"idle" | "watching" | "arrived" | "timeout">("idle");
  // Settings sends a reset wallet here with ?reset=1; read once.
  const [wasReset] = useState(
    () => new URLSearchParams(window.location.search).get("reset") === "1",
  );
  const [template, setTemplate] = useState<PolicyTemplateName>("balanced");
  const { welcome, fund, policy: rules, done } = onboarding;
  const words = onboarding.passkey;

  // The browser's passkey prompt, stood in for by a short wait.
  // ?sample=passkey-error makes it fail, to show the error state.
  useEffect(() => {
    if (live || passkey !== "working") return;
    const outcome = state.sample === "passkey-error" ? "failed" : "ready";
    const id = window.setTimeout(() => setPasskey(outcome), 1200);
    return () => window.clearTimeout(id);
  }, [live, passkey, state.sample]);

  // Live: one passkey prompt makes the passkey and the account that comes from it.
  function createPasskey(): void {
    setPasskey("working");
    if (!live) return;
    void live.create(state.accountName).then((made) => setPasskey(made ? "ready" : "failed"));
  }

  // Live: "I already have a passkey". With storage cleared or on a new device
  // the browser offers the site's passkeys, and the same one gives the same account.
  function useExisting(): void {
    if (!live) {
      navigate(routes.home.path);
      return;
    }
    void live.unlock().then((opened) => {
      if (opened) navigate(routes.home.path);
    });
  }

  const mon = state.assets.find((asset) => asset.symbol === "MON");
  const held = live ? (mon?.balance ?? "0.00") : FAUCET_AMOUNT;
  const funded = live && mon !== undefined && !/^[0.]*$/.test(mon.balance);

  // Live: the balance is read from Monad until the faucet's transfer shows, for 90 seconds.
  useEffect(() => {
    if (!live || funds !== "watching") return;
    if (funded) {
      setFunds("arrived");
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => {
      if (Date.now() - started > 90_000) setFunds("timeout");
      else void live.refresh();
    }, 3000);
    return () => window.clearInterval(id);
  }, [live, funds, funded]);

  // The faucet's transfer, once the reader has opened the faucet.
  // ?sample=fund-timeout makes the balance unreadable instead.
  useEffect(() => {
    if (live || funds !== "watching") return;
    const outcome = state.sample === "fund-timeout" ? "timeout" : "arrived";
    const id = window.setTimeout(() => setFunds(outcome), 1600);
    return () => window.clearTimeout(id);
  }, [live, funds, state.sample]);

  const go = (next: Step) => {
    setStep(next);
    window.scrollTo({ top: 0 });
  };

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
        <Steps current={step} />

        {step === 0 ? (
          <StepFrame title={welcome.title} body={welcome.body} picture={WALLET_ART.welcome}>
            <ul className="grid gap-6 border-t border-[color:var(--rule)] pt-6 sm:grid-cols-3 sm:gap-4">
              {welcome.pillars.map((pillar) => (
                <li key={pillar.title} className="grid content-start gap-1">
                  <p className={`${T.h3} text-[color:var(--fg)]`}>{pillar.title}</p>
                  <p className={T.small}>{pillar.body}</p>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="primary" size="lg" onClick={() => go(1)}>
                {welcome.action.label}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                disabled={live?.busy ?? false}
                onClick={useExisting}
              >
                {welcome.existing.label}
              </Button>
            </div>
            {live?.problem && passkey === "idle" ? (
              <Problem
                title={words.errors[live.problem].title}
                body={words.errors[live.problem].body}
              />
            ) : null}
            <p className={T.small}>{welcome.footnote}</p>
          </StepFrame>
        ) : null}

        {step === 1 ? (
          <StepFrame
            title={passkey === "ready" ? words.success.title : words.title}
            body={passkey === "ready" ? words.success.body : words.body}
            picture={WALLET_ART.passkey}
          >
            <p role="status" className="text-sm text-[color:var(--fg)]">
              {passkey === "working" ? words.working : ""}
            </p>
            {passkey === "failed" ? (
              <Problem
                title={words.errors[live?.problem ?? "failed"].title}
                body={words.errors[live?.problem ?? "failed"].body}
              />
            ) : null}
            <div className="flex">
              {passkey === "ready" ? (
                <Button type="button" variant="primary" size="lg" onClick={() => go(2)}>
                  {words.success.action.label}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  disabled={passkey === "working"}
                  onClick={createPasskey}
                >
                  {passkey === "failed" ? words.errors.failed.action.label : words.action.label}
                </Button>
              )}
            </div>
          </StepFrame>
        ) : null}

        {step === 2 ? (
          <StepFrame title={fund.title} body={fund.body} picture={WALLET_ART.fund}>
            <dl className="grid border-t border-[color:var(--rule)]">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[color:var(--rule)] py-3">
                <dt className="text-sm text-[color:var(--fg-muted)]">{fund.balanceLabel}</dt>
                <dd className="font-display text-2xl font-extrabold tabular-nums text-[color:var(--fg)]">
                  {funds === "arrived" ? held : "0.00"} MON
                </dd>
              </div>
              <div className="grid gap-1 border-b border-[color:var(--rule)] py-3">
                <dt className="text-sm text-[color:var(--fg-muted)]">{fund.addressLabel}</dt>
                <dd className="flex flex-wrap items-center justify-between gap-2">
                  <code className="font-mono text-sm text-[color:var(--fg)] [overflow-wrap:anywhere]">
                    {state.address}
                  </code>
                  <CopyButton
                    text={state.address}
                    label={fund.copy}
                    done={walletFrame.account.copied}
                  />
                </dd>
              </div>
            </dl>
            <p role="status" className="text-sm text-[color:var(--fg)]">
              {funds === "watching"
                ? fund.waiting
                : funds === "arrived"
                  ? fill(fund.arrived, { amount: held })
                  : ""}
            </p>
            {funds === "timeout" ? (
              <Problem
                title={fund.errors.balance.title}
                body={fund.errors.balance.body}
                action={
                  <Button type="button" variant="ghost" onClick={() => setFunds("watching")}>
                    {fund.errors.balance.action.label}
                  </Button>
                }
              />
            ) : null}
            <div className="flex flex-wrap gap-3">
              {funds === "arrived" ? (
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  disabled={Number(held) < MINIMUM}
                  onClick={() => go(3)}
                >
                  {fund.next.label}
                </Button>
              ) : (
                <a
                  href={walletFrame.links.faucet}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setFunds("watching")}
                  className="chamfer-sm inline-flex h-12 items-center bg-[color:var(--accent)] px-6 font-display text-lg font-extrabold uppercase tracking-[0.08em] text-[color:var(--on-accent)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
                >
                  {fund.action.label}
                </a>
              )}
              <Button type="button" variant="ghost" size="lg" onClick={() => go(3)}>
                {fund.skip.label}
              </Button>
            </div>
            <p className={T.small}>{funds === "arrived" ? fund.minimum : fund.skip.note}</p>
          </StepFrame>
        ) : null}

        {step === 3 ? (
          <StepFrame title={rules.title} body={rules.body} picture={WALLET_ART.rules}>
            <TemplateCards value={template} onPick={setTemplate} />
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => {
                  dispatch({
                    type: "saveRules",
                    policy: fromTemplate(template, state.policy.allowedAssets),
                    template,
                    at: new Date().toISOString(),
                  });
                  go(4);
                }}
              >
                {rules.action.label}
              </Button>
              <LinkButton href={routes.policies.path} label={rules.customise.label} size="lg" />
            </div>
          </StepFrame>
        ) : null}

        {step === 4 ? (
          <StepFrame title={done.title} body={done.body} picture={WALLET_ART.done}>
            <ul className="grid border-t border-[color:var(--rule)]">
              {done.suggestions.map((suggestion) => (
                <li
                  key={suggestion.title}
                  className="grid gap-2 border-b border-[color:var(--rule)] py-4"
                >
                  <p className="font-display text-lg font-bold uppercase text-[color:var(--fg)]">
                    {suggestion.title}
                  </p>
                  <p className={T.small}>{suggestion.body}</p>
                  <div className="flex">
                    <LinkButton
                      href={
                        "href" in suggestion.action
                          ? suggestion.action.href
                          : walletFrame.links.showcase
                      }
                      label={suggestion.action.label}
                      icon={"href" in suggestion.action ? "none" : "arrow-up-right"}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex">
              <LinkButton
                href={done.action.href}
                label={done.action.label}
                variant="primary"
                size="lg"
              />
            </div>
          </StepFrame>
        ) : null}
      </main>
    </div>
  );
}
