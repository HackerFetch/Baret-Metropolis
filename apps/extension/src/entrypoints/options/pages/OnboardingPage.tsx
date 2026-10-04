/**
 * Setup, full screen and outside the sidebar, one step at a time: welcome,
 * passphrase, your key, backup, funds, the account check, rules, done.
 * Classic self-custody: a passphrase for this device and a recovery phrase
 * for any other. The reader who already has a phrase (the welcome's quiet
 * link, or the popup's restore button, which opens ?restore=1) types it in,
 * sets a passphrase, and goes straight to funds: a restored account has no
 * new key to show and nothing new to back up. Every wait is a stand-in
 * started by the reader's own press; the key is the sample account's.
 */

import { common } from "@baret/content";
import { Tag } from "@baret/ui/primitives/Tag";
import { Brand } from "@baret/wallet-ui/components/Brand";
import { type JSX, useState } from "react";
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

function firstScreen(): Screen {
  return new URLSearchParams(window.location.search).get("restore") === "1" ? "restore" : "welcome";
}

export function Component(): JSX.Element {
  const [screen, setScreen] = useState<Screen>(firstScreen);
  const [restored, setRestored] = useState(false);
  const [moved, setMoved] = useState(false);

  const go = (next: Screen) => {
    setScreen(next);
    setMoved(true);
    window.scrollTo({ top: 0 });
  };

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
        <MovedContext value={moved}>
          {screen === "welcome" ? (
            <Welcome onStart={() => go("passphrase")} onRestore={() => go("restore")} />
          ) : null}
          {screen === "restore" ? (
            <Restore
              onRestored={() => {
                setRestored(true);
                go("passphrase");
              }}
              onBack={() => go("welcome")}
            />
          ) : null}
          {screen === "passphrase" ? (
            <Passphrase onSet={() => go(restored ? "fund" : "key")} />
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
