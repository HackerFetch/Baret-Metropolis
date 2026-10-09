import type { SignReceipt } from "@baret/wallet-ui/sign/SignRequest";
import type { Live, LiveRequest } from "./live.js";

/**
 * Signs a cleared call the way the settings ask. With "Ask for your passkey
 * on every signature" on, the passkey comes first, and a prompt that gives
 * nothing signs nothing. Off, the open session signs without a prompt.
 *
 * One rule for every surface that signs (Send, the vault changes), so the
 * setting cannot hold on one screen and not on another.
 *
 * Until the data layer has a passkey check of its own, the prompt is a full
 * unlock(), which also starts the session's 15 minutes again. `progress`
 * moves the sign request past its passkey step once the passkey is given, so
 * a later failure is not read as a cancelled passkey.
 */
export async function signWithSettings(
  live: Live,
  passkeyEverySignature: boolean,
  signable: NonNullable<LiveRequest["signable"]>,
  outcome: "sent" | "overridden",
  sending: () => void,
  progress?: (step: "signing" | "sending") => void,
): Promise<SignReceipt> {
  if (passkeyEverySignature && !(await live.unlock())) {
    throw new Error("the passkey was not given");
  }
  progress?.("signing");
  return live.sign(signable, outcome, sending);
}
