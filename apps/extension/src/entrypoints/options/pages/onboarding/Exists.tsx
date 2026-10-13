/**
 * The welcome when a wallet is already made in this browser: setup was
 * left before its end, or the page was opened again. The passphrase and
 * the key cannot be set twice, so the reader opens the wallet or picks
 * setup up: at the backup while it was never confirmed, at funds otherwise.
 */

import { extOnboarding } from "@baret/content";
import { Button } from "@baret/ui";
import type { JSX } from "react";
import { SETUP_ART } from "../../../../assets.js";
import { StepFrame } from "./Frame.js";

const { exists } = extOnboarding;

export function Exists({
  onOpen,
  onFinish,
  backupLeft = false,
}: {
  onOpen: () => void;
  onFinish: () => void;
  /** The recovery phrase was never confirmed: setup picks up at the backup. */
  backupLeft?: boolean;
}): JSX.Element {
  return (
    <StepFrame
      title={exists.title}
      body={backupLeft ? exists.backupBody : exists.body}
      picture={SETUP_ART.welcome}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-4">
        <Button type="button" variant="primary" size="lg" onClick={onOpen}>
          {exists.actions.open}
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={onFinish}>
          {exists.actions.finish}
        </Button>
      </div>
    </StepFrame>
  );
}
