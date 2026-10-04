/**
 * The options page's own frame: each page's name (the sidebar label, the h1
 * and the tab title share it), the tab title pattern with the brand, what the
 * page says when it moves to another page, and the screen for a page that
 * failed to load. Kept apart from the barrel so the router can read it
 * without pulling every page's copy into the first chunk.
 */
export const optionsFrame = {
  /** One name per route. Each matches the h1 of its page. */
  pages: {
    home: "Overview",
    activity: "Activity",
    allowances: "Permissions",
    policies: "Rules",
    x402: "Payments",
    sites: "Sites",
    siteDetail: "Site",
    settings: "Settings",
    onboarding: "Set up Baret",
    notFound: "Not found",
  },
  /** The tab title: the page name, then the product. */
  title: "{page} · Baret settings",
  /** Read politely after a move to another page. */
  moved: "{page} page",

  /** A page or the frame that failed to load, such as after an update. */
  failed: {
    title: "This page did not load",
    tag: "Error",
    heading: "This page did not load.",
    body: "Part of Baret's settings did not load, often because the extension was just updated. Reload the page to get the new version.",
    reload: "Reload the page",
    back: "Back to the overview",
  },
} as const;

export type OptionsFrameContent = typeof optionsFrame;
