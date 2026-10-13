import type { ActivityItem } from "@baret/wallet-ui/data/types";
import { describe, expect, it } from "vitest";
import { forgetStored, noteSite, readSites, SITES_KEY, withRequest } from "./siteBook.js";
import { sitesFrom, withStored } from "./sites.js";

/** A Storage in memory; `broken` throws on every call, as a refused one does. */
function memory(broken = false): Storage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  const guard = () => {
    if (broken) throw new Error("storage refused");
  };
  return {
    data,
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => {
      guard();
      return data.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      guard();
      data.set(key, value);
    },
    removeItem: (key: string) => {
      guard();
      data.delete(key);
    },
  };
}

const item = (kind: ActivityItem["kind"], at: string, origin = "dex.example"): ActivityItem => ({
  id: `${kind}-${at}`,
  kind,
  at,
  values: { origin },
  verdict: null,
  findings: [],
  changes: [],
});

describe("the sites kept on disk", () => {
  it("counts connects and signs per site, with the first and the latest time", () => {
    const storage = memory();
    noteSite(item("connect", "2026-10-14T10:00:00Z"), storage);
    noteSite(item("signed", "2026-10-14T10:05:00Z"), storage);
    noteSite(item("blocked", "2026-10-14T10:09:00Z"), storage);
    noteSite(item("connect", "2026-10-14T09:00:00Z", "shop.example"), storage);
    const [dex, shop] = readSites(storage);
    expect(dex).toEqual({
      origin: "dex.example",
      first: "2026-10-14T10:00:00Z",
      last: "2026-10-14T10:09:00Z",
      lastKind: "blocked",
      connects: 1,
      signs: 2,
      stopped: 1,
      connected: true,
    });
    expect(shop?.origin).toBe("shop.example");
    expect(shop?.signs).toBe(0);
  });

  it("writes only its own key", () => {
    const storage = memory();
    storage.setItem("baret.wallet.credential", "kept");
    noteSite(item("connect", "2026-10-14T10:00:00Z"), storage);
    expect([...storage.data.keys()].sort()).toEqual([SITES_KEY, "baret.wallet.credential"]);
    expect(storage.getItem("baret.wallet.credential")).toBe("kept");
  });

  it("ignores a request with no site", () => {
    const storage = memory();
    noteSite({ ...item("signed", "2026-10-14T10:00:00Z"), values: {} }, storage);
    expect(storage.data.size).toBe(0);
  });

  it("forgets a site, and drops the key with the last one", () => {
    const storage = memory();
    noteSite(item("connect", "2026-10-14T10:00:00Z"), storage);
    noteSite(item("connect", "2026-10-14T11:00:00Z", "shop.example"), storage);
    forgetStored("dex.example", storage);
    expect(readSites(storage).map((r) => r.origin)).toEqual(["shop.example"]);
    forgetStored("shop.example", storage);
    expect(storage.data.has(SITES_KEY)).toBe(false);
  });

  it("reads junk and a refusing storage as no record, without throwing", () => {
    const junk = memory();
    junk.setItem(SITES_KEY, "{not json");
    expect(readSites(junk)).toEqual([]);
    junk.setItem(SITES_KEY, JSON.stringify([{ origin: "x.example" }, 4, null]));
    expect(readSites(junk)).toEqual([]);
    const broken = memory(true);
    expect(() => noteSite(item("connect", "2026-10-14T10:00:00Z"), broken)).not.toThrow();
    expect(() => forgetStored("dex.example", broken)).not.toThrow();
    expect(readSites(broken)).toEqual([]);
    expect(readSites(null)).toEqual([]);
  });

  it("marks a site not connected after a disconnect", () => {
    const records = withRequest(
      withRequest([], item("connect", "2026-10-14T10:00:00Z")),
      item("disconnect", "2026-10-14T10:01:00Z"),
    );
    expect(records[0]?.connected).toBe(false);
    expect(records[0]?.signs).toBe(0);
  });
});

describe("the Sites rows with the disk", () => {
  it("lists a site only the disk knows", () => {
    const records = withRequest([], item("connect", "2026-10-14T10:00:00Z"));
    expect(withStored(sitesFrom([], []), records)).toEqual([
      {
        origin: "dex.example",
        last: "2026-10-14T10:00:00Z",
        lastKind: "connect",
        requests: 1,
        stopped: 0,
        connected: true,
      },
    ]);
  });

  it("does not count a request twice when memory and disk both hold it", () => {
    const signed = item("signed", "2026-10-14T10:05:00Z");
    const records = withRequest(withRequest([], item("connect", "2026-10-14T10:00:00Z")), signed);
    const rows = withStored(sitesFrom([signed], []), records);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.requests).toBe(2);
    expect(rows[0]?.connected).toBe(true);
    expect(rows[0]?.last).toBe("2026-10-14T10:05:00Z");
  });
});
