import { defineExtensionMessaging } from "@webext-core/messaging";
import type { Pending, RpcOutcome, RpcReply } from "../core/protocol.js";

/**
 * The typed message bus between the popup, the options page, the content
 * script and the background.
 *
 * Every method that can move money or change a rule belongs here, so the
 * surface a compromised page could reach is one file long and reviewable.
 * A page reaches exactly one of them, `rpc`, and only through the content
 * script, which never passes on who the page says it is.
 *
 * Note there is no webextension-polyfill in this project. The package was
 * archived read only in July 2026 now that Chrome supports the browser
 * namespace, and WXT removed it. Write browser.* directly.
 */
export interface ProtocolMap {
  /** A provider request from a page. The background reads the origin from the sender. */
  rpc(request: { id: string; method: string; params: readonly unknown[] }): RpcReply;
  /** The answer to a request that waited for the owner, sent to the tab that asked. */
  rpcResult(answer: { id: string; outcome: RpcOutcome }): void;
  /** The request window decided: the background answers the site. */
  resolve(answer: { id: string; outcome: RpcOutcome }): void;
  /** The requests waiting for the owner, oldest first. */
  pending(): readonly Pending[];
  /** Whether a wallet exists in this browser, and whether it is open. */
  status(): {
    initialized: boolean;
    unlocked: boolean;
    /** Why it is locked, for the lock screen's first line. */
    lockReason: "manual" | "idle" | "restart";
  };
  /** Seals a phrase (a new one when none is given) under the passphrase and opens the wallet. */
  create(input: { passphrase: string; phrase?: string }): { address: string } | { error: string };
  /** Opens the wallet. False on a wrong passphrase. */
  unlock(passphrase: string): boolean;
  /** Locks at once and clears the open phrase from session storage. */
  lock(): void;
  /** Removes the vault and everything the wallet stored. The phrase is the only way back. */
  wipe(): void;
  /** The recovery phrase, to the owner who typed the passphrase again. Null on a wrong one. */
  reveal(passphrase: string): string | null;
  /** Seals the vault under a new passphrase. False when the current one is wrong. */
  rekey(input: { current: string; next: string }): boolean;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
