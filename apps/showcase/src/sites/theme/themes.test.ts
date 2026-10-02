// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Kept in sync with DAPP_NAMES in DappTheme.tsx (which imports the CSS itself). */
const DAPP_NAMES = ["scrybe", "novaswap", "pixeldrop", "orbityield", "claimhub", "launchpad"];

const css = readFileSync(new URL("./dapp-themes.css", import.meta.url), "utf8");

/** Every token a dApp palette must re-declare, in light and in both dark entry points. */
const TOKENS = [
  "--ground",
  "--ground-deep",
  "--surface",
  "--fg",
  "--fg-muted",
  "--fg-faint",
  "--fg-ghost",
  "--rule",
  "--rule-strong",
  "--control-edge",
  "--accent",
  "--accent-deep",
  "--accent-dim",
  "--on-accent",
  "--accent-edge",
  "--focus",
];

/** The declaration blocks whose selector list mentions this dApp. */
function blocksFor(name: string): string[] {
  const blocks: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (const m of css.matchAll(re)) {
    const selector = m[1] ?? "";
    if (selector.includes(`[data-dapp="${name}"]`)) blocks.push(m[2] ?? "");
  }
  return blocks;
}

describe("dApp themes", () => {
  it.each(DAPP_NAMES)("%s defines every token in light, OS dark and explicit dark", (name) => {
    const blocks = blocksFor(name);
    expect(blocks).toHaveLength(3);
    for (const block of blocks) {
      for (const token of TOKENS) expect(block).toContain(`${token}:`);
    }
  });

  it("never re-themes the functional state colours", () => {
    for (const token of ["--safe:", "--caution:", "--blocked:", "--watching:", "--network:"]) {
      expect(css).not.toContain(token);
    }
  });
});
