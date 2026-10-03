// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildsFrom, detectBrowser, EXTENSION_VERSION, leadBuild, otherBuild } from "./builds.js";

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
};

describe("detectBrowser", () => {
  it("puts Chrome, Edge and Opera on the Chromium build", () => {
    expect(detectBrowser(UA.chrome)).toBe("chromium");
    expect(detectBrowser(UA.edge)).toBe("chromium");
    expect(detectBrowser(UA.opera)).toBe("chromium");
  });

  it("finds Firefox", () => {
    expect(detectBrowser(UA.firefox)).toBe("firefox");
  });

  it("does not guess for Safari or any iOS browser", () => {
    expect(detectBrowser(UA.safari)).toBe("unknown");
    expect(detectBrowser(UA.iosChrome)).toBe("unknown");
    expect(detectBrowser("")).toBe("unknown");
  });
});

describe("the builds seam", () => {
  it("has no download until a URL is published", () => {
    const builds = buildsFrom({});
    expect(builds.chromium.href).toBeNull();
    expect(builds.firefox.href).toBeNull();
  });

  it("takes only an absolute https URL", () => {
    expect(buildsFrom({ chromium: "https://example.org/baret-chrome.zip" }).chromium.href).toBe(
      "https://example.org/baret-chrome.zip",
    );
    expect(buildsFrom({ chromium: "/baret.zip" }).chromium.href).toBeNull();
    expect(buildsFrom({ firefox: "" }).firefox.href).toBeNull();
  });

  it("leads with the visitor's build, Chromium when unknown", () => {
    expect(leadBuild("firefox")).toBe("firefox");
    expect(leadBuild("unknown")).toBe("chromium");
    expect(otherBuild("chromium")).toBe("firefox");
  });

  it("keeps the version in step with the extension", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../../../extension/package.json", import.meta.url), "utf8"),
    ) as { version: string };
    expect(EXTENSION_VERSION).toBe(pkg.version);
  });
});
