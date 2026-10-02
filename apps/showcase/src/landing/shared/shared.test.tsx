import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { avif } from "./assets.js";
import { titleId } from "./ids.js";
import { LinkButton } from "./LinkButton.js";
import { staggerDelay } from "./motion.js";
import { Reveal } from "./Reveal.js";
import { splitLead } from "./SectionHeader.js";
import { VERDICT_TONE } from "./tone.js";
import { fill } from "./util.js";

describe("landing shared helpers", () => {
  it("caps the stagger at five steps", () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(2)).toBe(0.12);
    expect(staggerDelay(9)).toBe(0.3);
  });

  it("maps the capped verdict to the blocked tone", () => {
    expect(VERDICT_TONE.capped).toBe("blocked");
  });

  it("derives heading ids from the section anchors", () => {
    expect(titleId("agents")).toBe("agents-title");
  });
});

describe("LinkButton", () => {
  it("puts the focus ring on the unclipped link and the chamfer on the face", () => {
    for (const href of ["https://example.org", "#hero"]) {
      const html = renderToStaticMarkup(<LinkButton href={href} label="Go" />);
      const doc = new DOMParser().parseFromString(html, "text/html");
      const link = doc.querySelector("a");
      const face = link?.querySelector("span");
      expect(link?.className).toContain("focus-visible:outline-solid");
      expect(link?.className).not.toContain("chamfer-sm");
      expect(face?.className).toContain("chamfer-sm");
    }
  });

  it("opens external links without a referrer", () => {
    const html = renderToStaticMarkup(<LinkButton href="https://example.org" label="Go" />);
    expect(html).toContain('rel="noreferrer"');
  });

  it("routes internal paths through the router", () => {
    const router = createMemoryRouter([
      { path: "/", element: <LinkButton href="/showcase" label="Go" variant="primary" /> },
    ]);
    const html = renderToStaticMarkup(<RouterProvider router={router} />);
    expect(html).toContain('href="/showcase"');
  });
});

describe("landing text helpers", () => {
  it("fills placeholders and leaves unknown ones visible", () => {
    expect(fill("{origin} may spend {amount} {asset}.", { origin: "ClaimHub", amount: "25" })).toBe(
      "ClaimHub may spend 25 {asset}.",
    );
  });

  it("splits an intro after its first sentence", () => {
    expect(splitLead("One. Two words. Three.")).toEqual(["One.", "Two words. Three."]);
    expect(splitLead("Only one")).toEqual(["Only one", ""]);
  });

  it("maps a WebP srcset to its AVIF twin", () => {
    expect(avif("/a/l-06-w768.webp 768w, /a/l-06.webp 1536w")).toBe(
      "/a/l-06-w768.avif 768w, /a/l-06.avif 1536w",
    );
  });
});

describe("Reveal", () => {
  it("renders visible markup with no hidden state before an observer runs", () => {
    const html = renderToStaticMarkup(<Reveal delay={0.12}>Text</Reveal>);
    expect(html).not.toContain("data-reveal");
    expect(html).not.toContain("opacity");
    expect(html).toContain("Text");
  });
});

describe("LinkButton size sm", () => {
  it("keeps a 44 px hit area around the 36 px face", () => {
    const html = renderToStaticMarkup(<LinkButton href="#hero" label="Go" size="sm" />);
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector("a")?.className).toContain("min-h-11");
    expect(doc.querySelector("a > span")?.className).toContain("h-9");
  });
});
