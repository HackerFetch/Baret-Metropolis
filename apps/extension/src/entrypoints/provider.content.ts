/**
 * The MAIN-world provider. Declared in the manifest rather than registered at
 * runtime, which is what MetaMask switched to and what Chrome schedules
 * earliest. Chrome 111 and Firefox 128 both support it.
 *
 * Timing honesty: document_start guarantees this runs before other DOM is
 * constructed, but neither Chrome nor Firefox documents a guarantee that it
 * beats every page script. Capture the globals this file needs before touching
 * anything a page can reach.
 */
export default defineContentScript({
  matches: ["file://*/*", "http://*/*", "https://*/*"],
  world: "MAIN",
  registration: "manifest",
  runAt: "document_start",
  allFrames: true,
  matchOriginAsFallback: true,
  main() {
    // TODO(week 2): define window.ethereum (EIP-1193) and announce over
    // EIP-6963. Announce once now and again on every eip6963:requestProvider,
    // with the detail object frozen.
  },
});
