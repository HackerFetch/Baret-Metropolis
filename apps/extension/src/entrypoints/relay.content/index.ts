/**
 * The isolated-world content script. This is the trust boundary.
 *
 * It is the only thing that talks to both the page and the extension, so it
 * never forwards a message without overwriting the claimed origin with the one
 * the browser reports. A page can say anything about who it is.
 */
export default defineContentScript({
  matches: ["file://*/*", "http://*/*", "https://*/*"],
  runAt: "document_start",
  allFrames: true,
  main() {
    // TODO(week 2): bridge window.postMessage to the background port, stamping
    // the real origin on every inbound message.
  },
});
