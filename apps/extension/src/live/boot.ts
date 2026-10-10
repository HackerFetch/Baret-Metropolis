import { API_URL } from "./source.js";

/**
 * The first thing a live page loads.
 *
 * The screens the extension shares with the web wallet ask Baret's server at
 * `/api/...`, which the web apps' own hosts forward. An extension page has no
 * host to forward anything, so those requests are sent to the server itself.
 * Nothing else about `fetch` changes.
 */
const native = window.fetch.bind(window);
window.fetch = (input, init) =>
  typeof input === "string" && input.startsWith("/api/")
    ? native(`${API_URL}${input.slice(4)}`, init)
    : native(input, init);

export { mountLiveOptions } from "./LiveOptions.js";
export { mountLivePopup } from "./LivePopup.js";
