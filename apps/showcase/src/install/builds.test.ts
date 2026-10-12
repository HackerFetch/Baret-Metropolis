// @vitest-environment node
import { readFileSync } from "node:fs";
import { install } from "@baret/content";
import { describe, expect, it } from "vitest";
import {
  buildsFrom,
  detectBrowser,
  EXTENSION_VERSION,
  helpItems,
  leadBuild,
  otherBuild,
  sourceOf,
  stepsFor,
} from "./builds.js";

const UA = {
  chrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
  edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
  opera:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 OPR/120.0.0.0",
  firefox: "Mozilla/5.0 (Macintosh; Intel Mac OS X 15.6; rv:143.0) Gecko/20100101 Firefox/143.0",
  safari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15",
  iosChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/149.0 Mobile/15E148 Safari/604.1",
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 16; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
  androidFirefox: "Mozilla/5.0 (Android 16; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0",
};

const ZIP = "https://example.org/baret-chrome.zip";
const STORE = "https://chromewebstore.google.com/detail/baret/abcdefghijklmnop";
const AMO = "https://addons.mozilla.org/firefox/addon/baret/";

describe("detectBrowser", () => {
  it("puts Chrome, Edge and Opera on the Chromium build", () => {
    expect(detectBrowser(UA.chrome)).toBe("chromium");
    expect(detectBrowser(UA.edge)).toBe("chromium");
    expect(detectBrowser(UA.opera)).toBe("chromium");
  });

  it("finds Firefox", () => {
    expect(detectBrowser(UA.firefox)).toBe("firefox");
  });

  it("does not guess for desktop Safari or an empty agent", () => {
    expect(detectBrowser(UA.safari)).toBe("unknown");
    expect(detectBrowser("")).toBe("unknown");
  });

  it("calls every phone and tablet a phone: no extension loads there", () => {
    expect(detectBrowser(UA.iosChrome)).toBe("phone");
    expect(detectBrowser(UA.iphoneSafari)).toBe("phone");
    expect(detectBrowser(UA.androidChrome)).toBe("phone");
    expect(detectBrowser(UA.androidFirefox)).toBe("phone");
  });
});

describe("the builds seam", () => {
  it("has no download and no listing until a URL is published", () => {
    const builds = buildsFrom({});
    expect(builds.chromium.href).toBeNull();
    expect(builds.firefox.href).toBeNull();
    expect(builds.chromium.store).toBeNull();
    expect(builds.firefox.store).toBeNull();
  });

  it("takes only an absolute https URL", () => {
    expect(buildsFrom({ chromium: ZIP }).chromium.href).toBe(ZIP);
    expect(buildsFrom({ chromium: "/baret.zip" }).chromium.href).toBeNull();
    expect(buildsFrom({ firefox: "" }).firefox.href).toBeNull();
    expect(buildsFrom({ chromiumStore: STORE }).chromium.store).toBe(STORE);
    expect(buildsFrom({ chromiumStore: STORE.replace("https", "http") }).chromium.store).toBeNull();
    expect(buildsFrom({ firefoxStore: " " }).firefox.store).toBeNull();
  });

  it("leads with the visitor's build, Chromium when unknown", () => {
    expect(leadBuild("firefox")).toBe("firefox");
    expect(leadBuild("unknown")).toBe("chromium");
    expect(leadBuild("phone")).toBe("chromium");
    expect(otherBuild("chromium")).toBe("firefox");
  });

  it("keeps the version in step with the extension", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../../../extension/package.json", import.meta.url), "utf8"),
    ) as { version: string };
    expect(EXTENSION_VERSION).toBe(pkg.version);
  });
});

describe("where a build comes from", () => {
  it("is the store when listed, else the zip, else the source", () => {
    expect(sourceOf(buildsFrom({ chromium: ZIP, chromiumStore: STORE }).chromium)).toBe("store");
    expect(sourceOf(buildsFrom({ chromium: ZIP }).chromium)).toBe("zip");
    expect(sourceOf(buildsFrom({}).chromium)).toBe("source");
    expect(sourceOf(buildsFrom({ firefoxStore: AMO }).firefox)).toBe("store");
  });

  it("is decided per build, so one can be listed while the other is still a zip", () => {
    const builds = buildsFrom({ chromiumStore: STORE, firefox: ZIP });
    expect(sourceOf(builds.chromium)).toBe("store");
    expect(sourceOf(builds.firefox)).toBe("zip");
  });

  it("the store's three steps never extract a zip, load unpacked or turn on developer mode", () => {
    for (const id of ["chromium", "firefox"] as const) {
      const steps = stepsFor(id, "store");
      expect(steps).toHaveLength(3);
      const text = steps.map((s) => `${s.title} ${s.body}`).join(" ");
      expect(text).not.toMatch(/zip|unpacked|developer mode|temporary|about:debugging/i);
      // The picker can show the build the hero does not lead with, which has no button above.
      expect(text).not.toMatch(/button above/i);
      expect(steps[0]?.body).toContain("link below");
      expect(steps.some((s) => s.address)).toBe(false);
    }
    expect(stepsFor("chromium", "store")[1]?.body).toContain("Add to Brave");
    expect(stepsFor("firefox", "store")[2]?.body).toContain("appears in the toolbar");
  });

  it("the developer flows keep their steps, with the source build first while no zip exists", () => {
    expect(stepsFor("chromium", "zip")[0]?.title).toBe("Extract the zip");
    expect(stepsFor("chromium", "source")[0]?.title).toBe("Build it from source");
    expect(stepsFor("chromium", "source")[1]?.address).toBe("chrome://extensions");
    expect(stepsFor("firefox", "zip")[2]?.title).toBe("Load a temporary add-on");
    expect(stepsFor("firefox", "source")[0]?.body).toContain("build:firefox");
  });

  it("each store's copy names its own store only", () => {
    const chromium = JSON.stringify(install.download.builds.chromium);
    expect(chromium).toMatch(/Chrome Web Store/);
    expect(chromium).not.toMatch(/Firefox Add-ons/);
    const firefox = JSON.stringify(install.download.builds.firefox);
    expect(firefox).toMatch(/Firefox Add-ons/);
    expect(firefox).not.toMatch(/Chrome Web Store/);
  });
});

describe("the help list", () => {
  const symptoms = (env: Parameters<typeof buildsFrom>[0]) =>
    helpItems(buildsFrom(env)).map((item) => item.symptom);

  it("keeps every item while both builds are developer builds", () => {
    expect(symptoms({})).toEqual(install.troubleshooting.items.map((item) => item.symptom));
    expect(symptoms({ chromium: ZIP, firefox: ZIP })).toHaveLength(
      install.troubleshooting.items.length,
    );
  });

  it("drops the unpacked-load items once the Chromium build is in its store", () => {
    const left = symptoms({ chromiumStore: STORE, firefox: ZIP });
    expect(left).not.toContain("There is no Load unpacked button");
    expect(left).not.toContain("Chrome says the manifest file is missing or unreadable");
    expect(left).toContain("Baret is gone after Firefox restarted");
    expect(left).toContain("The Baret icon is not in the toolbar");
  });

  it("drops the restart item once the Firefox build is on its store", () => {
    const left = symptoms({ chromiumStore: STORE, firefoxStore: AMO });
    expect(left).not.toContain("Baret is gone after Firefox restarted");
    expect(left).toContain("Every sign request says Can't reach Baret");
    expect(left).toHaveLength(3);
  });
});
