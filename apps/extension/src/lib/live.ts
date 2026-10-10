/**
 * Whether this page shows a real wallet. It does when it runs as a page of
 * the installed extension and the address names no sample: any of ?sample=,
 * ?phase= or ?offline= keeps the sample, which the tests, the design states
 * and a reviewer's links read. Opened anywhere else (a test, a plain dev
 * server) there is no extension to ask, so it is the sample too.
 */
export function isLivePage(search: string = window.location.search): boolean {
  const params = new URLSearchParams(search);
  if (params.has("sample") || params.has("phase") || params.has("offline")) return false;
  const runtime = (globalThis as { chrome?: { runtime?: { id?: unknown } } }).chrome?.runtime;
  return typeof runtime?.id === "string";
}
