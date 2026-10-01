/**
 * The background. A service worker on Chrome, an event page on Firefox. WXT
 * emits the right manifest key for each from this one file.
 *
 * Design rule, borrowed from how Rabby does it rather than how MetaMask does
 * it: assume this context dies at any moment. Chrome terminates the worker
 * after 30 seconds of inactivity, after a single request over 5 minutes, and
 * after any fetch that takes over 30 seconds. Keeping it alive with a
 * heartbeat is explicitly outside what Google sanctions, so nothing here is
 * allowed to depend on staying resident.
 *
 * What that means in practice:
 *  - The derived vault key lives in storage.session, which survives a restart
 *    of this worker and is wiped when the browser closes. Never in
 *    storage.local, never on disk.
 *  - Auto-lock is an absolute deadline, not a timer, so it survives a restart.
 *  - Every boot re-reads that state instead of assuming it is still in memory.
 */
export default defineBackground({
  type: "module",
  main() {
    // Keep this synchronous. Listeners have to be registered during the first
    // evaluation of the worker, or an event that woke it up is lost.
    browser.runtime.onInstalled.addListener(({ reason }) => {
      if (reason === "install") {
        void browser.tabs.create({ url: browser.runtime.getURL("/options.html#/onboarding") });
      }
    });

    void boot();
  },
});

/** Runs on every start of the worker, including a restart after termination. */
async function boot(): Promise<void> {
  // TODO(week 2): rehydrate the session key, re-arm the auto-lock deadline and
  // restore the pending sign-request queue. See docs/WALLET.md section 1.1.
}
