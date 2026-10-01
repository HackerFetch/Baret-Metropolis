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

/**
 * One threat scenario page on the showcase. The six files in showcase/ satisfy
 * this, so one component renders all six. Three layers, in page order:
 *
 *   scenario  the story, in Baret's voice. Also the card on the hub.
 *   site      the fake product's own voice. Convincing on purpose, and the
 *             same in both versions: only the transaction changes.
 *   analysis  Baret's framing around the live result. Labels, the expected
 *             verdict and the lesson. Never a finding: findings come live from
 *             shared/findings.
 *
 * Copy that is identical on all six pages (the frame, the panel labels, the
 * empty and error states) lives in `hub.frame`.
 */
export interface ScenarioSite {
  meta: Meta;
  scenario: Scenario & { threatClass: "drainer" | "trap" | "agent" };
  site: {
    brand: string;
    /** A made-up hostname on the reserved .example domain. Never a real one. */
    hostname: string;
    nav: readonly string[];
    hero: { badge: string; title: string; body: string; cta: string };
    /** The main card: the swap form, the mint box, the question box. */
    panel: {
      title: string;
      /** Placeholder text of the card's one input. */
      input: string;
      rows: readonly { label: string; value: string }[];
      cta: string;
      note: string;
    };
    stats: readonly { value: string; label: string }[];
    sections: readonly Block[];
    faq: readonly Faq[];
    /** The site's own progress line while the request runs. */
    progress: readonly string[];
    /** What the site says once you sign. The same in both versions. */
    done: Block;
    footer: string;
  };
  analysis: {
    /** The two versions. Same page, same button, a different transaction. */
    modes: Record<
      "safe" | "danger",
      {
        /** Label on the version switch. */
        label: string;
        /** What this version builds, in one or two sentences. */
        body: string;
        /** "{Site} wants you to ...". Placeholders are filled live. */
        asks: string;
        /** The function the site calls, shown in mono. */
        call: string;
        /** The verdict this version should get under the Balanced rules. */
        expected: VerdictKind | "capped";
        /** Why that verdict is expected. Framed as expected, never as found. */
        expectedBody: string;
      }
    >;
    /** "The site says" beside "Baret checks". */
    claims: readonly { claim: string; check: string }[];
    /** What to look at before pressing the button. */
    watch: Block;
    /** What the attack version would do if it were signed. */
    without: Block;
    /** One takeaway the reader can use on any site. */
    lesson: Block;
  };
  /** Only SCRYBE has this: the bridge to the agents page. */
  cta?: Block & { action: Action };
}
