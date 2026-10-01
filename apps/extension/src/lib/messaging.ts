import { defineExtensionMessaging } from "@webext-core/messaging";

/**
 * The typed message bus between the popup, the options page, the content
 * script and the background.
 *
 * Every method that can move money or change a rule belongs here, so the
 * surface a compromised page could reach is one file long and reviewable.
 *
 * Note there is no webextension-polyfill in this project. The package was
 * archived read only in July 2026 now that Chrome supports the browser
 * namespace, and WXT removed it. Write browser.* directly.
 */
export interface ProtocolMap {
  /** Current wallet phase, for the popup to render against. */
  getPhase(): "uninitialized" | "locked" | "ready" | "signing" | "alert";
  /** Unlock with a passphrase. Returns false on a wrong passphrase. */
  unlock(passphrase: string): boolean;
  /** Lock immediately and clear the derived key from session storage. */
  lock(): void;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
