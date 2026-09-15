/**
 * Shared building blocks for every content file.
 *
 * These types describe the SHAPE of copy, never how it looks. A content file
 * may nest them freely. Nothing here knows about React, routes or styling.
 */

/** A button or link. `href` is omitted when the button triggers an action. */
export interface Action {
  label: string;
  href?: string;
  /** Small print under or beside the button. */
  note?: string;
}

/** A heading and a paragraph. The unit almost every section is built from. */
export interface Block {
  title: string;
  body: string;
}

/** A block with supporting bullet points. */
export interface Feature extends Block {
  points?: readonly string[];
}

/** One step in a flow, numbered by its position in the array. */
export interface Step extends Block {
  /** Two or three words for a progress indicator. */
  short?: string;
  action?: Action;
}

/** A question and its answer. */
export interface Faq {
  question: string;
  answer: string;
}

/** What a screen says when it has nothing to show yet. */
export interface EmptyState {
  title: string;
  body: string;
  action?: Action;
}

/** What a screen says when something went wrong. Always name the next move. */
export interface ErrorState {
  title: string;
  body: string;
  action?: Action;
}

/** Document head. Used for the browser tab and link previews. */
export interface Meta {
  title: string;
  description: string;
}

/** A marketing section: small label above, heading, paragraph. */
export interface Section extends Block {
  eyebrow?: string;
}

/** One row in a settings list: the label and the current-state line under it. */
export interface SettingsRow {
  label: string;
  hint: string;
}

/** One row in a two-column comparison table. */
export interface ComparisonRow {
  aspect: string;
  without: string;
  with: string;
}

/** The four states a verdict can take. */
export type VerdictKind = "safe" | "caution" | "blocked" | "unreachable";

/** A named threat demo on the showcase. */
export interface Scenario {
  /** Route slug, also the folder name. */
  slug: string;
  /** The fake product's display name. */
  name: string;
  /** What the fake product claims to be. */
  category: string;
  /** One line of the fake product's own marketing. */
  tagline: string;
  /** What the demo does, in our voice. */
  summary: string;
  /** Three things the analysis will flag. */
  watchFor: readonly string[];
  /** The class of attack, for the filter chips. */
  threatClass: string;
  /** Why this attack works on real people. */
  whyItMatters: string;
  /** The verdict the user should expect to see. */
  verdict: VerdictKind | "capped";
}
