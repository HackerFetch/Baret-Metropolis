/**
 * Setup, full screen and outside the sidebar, one step at a time: welcome,
 * passphrase, your key, backup, funds, the account check, rules, done.
 * Classic self-custody: a passphrase for this device and a recovery phrase
 * for any other. The reader who already has a phrase (the welcome's quiet
 * link, or the popup's restore button, which opens ?restore=1) types it in,
 * sets a passphrase, and goes straight to funds: a restored account has no
 * new key to show and nothing new to back up. Every wait is a stand-in
 * started by the reader's own press; the key is the sample account's.
 *
 * Each step is its own history entry (the step rides in the location state),
 * so the browser's Back moves one step instead of leaving setup. A Back
 * button under the indicator does the same on the steps where going back
 * loses nothing: the passphrase, funds, the account check and rules.
 */

import { common } from "@baret/content";
import { Button } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Brand } from "@baret/wallet-ui/components/Brand";
import { ArrowLeft } from "lucide-react";
import { type JSX, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { useGate } from "../../../data/gate.js";
import { SampleNotice } from "../parts/kit.js";
import { routes } from "../routes.js";
import { Account } from "./onboarding/Account.js";
import { Backup } from "./onboarding/Backup.js";
import { Done } from "./onboarding/Done.js";
import { MovedContext, Steps } from "./onboarding/Frame.js";
import { Funds } from "./onboarding/Funds.js";
import { Key } from "./onboarding/Key.js";
import { Passphrase } from "./onboarding/Passphrase.js";
import { Restore } from "./onboarding/Restore.js";
import { Rules } from "./onboarding/Rules.js";
import { Welcome } from "./onboarding/Welcome.js";

type Screen =
  | "welcome"
  | "restore"
  | "passphrase"
  | "key"
  | "backup"
  | "fund"
  | "account"
  | "rules"
  | "done";

/** Where each screen sits on the eight-step indicator. Restore stands in for the welcome. */
const STEP: Record<Screen, number> = {
  welcome: 0,
  restore: 0,
  passphrase: 1,
  key: 2,
  backup: 3,
  fund: 4,
  account: 5,
  rules: 6,
  done: 7,
};

/** The two steps a restored account skips: your key and the backup. */
const RESTORED_SKIPS = [STEP.key, STEP.backup] as const;

/** Where setup is, kept in the history entry so Back and Forward walk the steps. */
interface SetupState {
  readonly step: Screen;
  readonly restored: boolean;
}

/** Steps with a Back button: going back from them undoes nothing. */
const BACKABLE: readonly Screen[] = ["passphrase", "fund", "account", "rules"];

function firstScreen(): Screen {
  return new URLSearchParams(window.location.search).get("restore") === "1" ? "restore" : "welcome";
}

function readState(value: unknown): SetupState | null {
  if (typeof value !== "object" || value === null) return null;
  const { step, restored } = value as Partial<SetupState>;
  return typeof step === "string" && step in STEP ? { step, restored: restored === true } : null;
}

export function Component(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  // Live: the keystore makes the wallet at the passphrase step. A phrase the
  // reader typed to restore waits here until then, in memory only.
  const gate = useGate();
  const typedPhrase = useRef<string | null>(null);
  const saved = readState(location.state);
  const screen = saved?.step ?? firstScreen();
  const restored = saved?.restored ?? false;
  // A pushed step means the reader has left the first screen.
  const moved = saved !== null;

  const go = (next: Screen, nextRestored = restored) => {
    const state: SetupState = { step: next, restored: nextRestored };
    navigate({ pathname: location.pathname, search: location.search }, { state });
    window.scrollTo({ top: 0 });
  };

  const back = () => {
    navigate(-1);
    window.scrollTo({ top: 0 });
  };

  // A restored account came through the passphrase straight to funds: its
  // way back would set the passphrase again, so funds offers none there.
  const showBack = moved && BACKABLE.includes(screen) && !(screen === "fund" && restored);

  return (
    <div className="min-h-dvh">
      {/* React 19 hoists a <title> rendered anywhere into the head. */}
      <title>{routes.onboarding.title}</title>
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
        <Steps current={STEP[screen]} skipped={restored ? RESTORED_SKIPS : []} />
        {showBack ? (
          <div className="-mt-4 -ml-3 flex">
            <Button type="button" variant="ghost" size="md" onClick={back}>
              <ArrowLeft aria-hidden="true" strokeWidth={1.5} />
              {common.actions.back}
            </Button>
          </div>
        ) : null}
        <MovedContext value={moved}>
          {screen === "welcome" ? (
            <Welcome onStart={() => go("passphrase")} onRestore={() => go("restore")} />
          ) : null}
          {screen === "restore" ? (
            <Restore
              onRestored={(phrase) => {
                typedPhrase.current = phrase;
                go("passphrase", true);
              }}
              onBack={moved ? back : () => go("welcome")}
            />
          ) : null}
          {screen === "passphrase" ? (
            <Passphrase
              onSet={(passphrase) => {
                const next = () => go(restored ? "fund" : "key");
                if (!gate) return void next();
                const phrase = restored ? typedPhrase.current : null;
                // A restore whose words were lost to a reload: the reader types them again.
                if (restored && !phrase) return void go("restore");
                return gate.create(passphrase, phrase ?? undefined).then((made) => {
                  if ("error" in made) return made.error;
                  typedPhrase.current = null;
                  next();
                  return null;
                });
              }}
            />
          ) : null}
          {screen === "key" ? <Key onNext={() => go("backup")} /> : null}
          {screen === "backup" ? <Backup onNext={() => go("fund")} /> : null}
          {screen === "fund" ? <Funds onNext={() => go("account")} /> : null}
          {screen === "account" ? <Account onNext={() => go("rules")} /> : null}
          {screen === "rules" ? <Rules onNext={() => go("done")} /> : null}
          {screen === "done" ? <Done /> : null}
        </MovedContext>
      </main>
    </div>
  );
}
