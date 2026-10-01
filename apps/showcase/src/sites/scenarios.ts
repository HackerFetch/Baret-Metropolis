import { claimhub, launchpad, novaswap, orbityield, pixeldrop, scrybe } from "@baret/content";

/**
 * The six demos in the order the hub lists them. Each entry is the scenario
 * card from that site's own content file, so a copy change reaches the hub,
 * the landing page and the site itself at once.
 */
export const SCENARIOS = [
  scrybe.scenario,
  novaswap.scenario,
  pixeldrop.scenario,
  orbityield.scenario,
  claimhub.scenario,
  launchpad.scenario,
] as const;

export type Scenario = (typeof SCENARIOS)[number];
