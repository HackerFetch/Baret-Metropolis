import { docs } from "@baret/content";
import { describe, expect, it } from "vitest";
import { DOCS_CARD_ART } from "../shared/assets.js";
import { fileName, fileUrl, slug } from "./docs.js";

describe("the docs index", () => {
  it("slugs group titles into the anchors other pages link to", () => {
    expect(slug("Contracts and payments")).toBe("contracts-and-payments");
    expect(docs.groups.map((g) => slug(g.title))).toContain("contracts-and-payments");
    expect(docs.groups.map((g) => slug(g.title))).toContain("start-here");
  });

  it("links a card to its file on the main branch", () => {
    expect(fileUrl("docs/ARCHITECTURE.md", "https://github.com/acme/repo")).toBe(
      "https://github.com/acme/repo/blob/main/docs/ARCHITECTURE.md",
    );
    expect(fileUrl("docs/ROADMAP.md")).toMatch(
      /^https:\/\/github\.com\/.+\/blob\/main\/docs\/ROADMAP\.md$/,
    );
  });

  it("names the file without its folder", () => {
    expect(fileName("docs/BRAND.md")).toBe("BRAND.md");
  });

  it("has a picture for every card, except the package READMEs (no art yet, H9 2026-10-09)", () => {
    for (const group of docs.groups) {
      if (group.title === "For developers") continue;
      for (const card of group.cards) expect(DOCS_CARD_ART[card.file], card.file).toBeDefined();
    }
  });
});
