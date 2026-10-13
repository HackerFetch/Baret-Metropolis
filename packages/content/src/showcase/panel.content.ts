/**
 * Copy of the redesigned Baret analysis panel on the six demo sites
 * (apps/showcase/src/sites/kit/panel), and the line under a refusal in the
 * "Check with Baret" block.
 *
 * The older panel labels (expected, live, findings, changes, the phases of
 * the walk) stay in hub.frame.panel; this file only adds what the new layout
 * says on top of them.
 */
export const analysisPanel = {
  /**
   * The four stages shown while one request is checked. Each site's
   * useCheck walks hub.frame.panel.phases, so this list has the same length.
   */
  stages: [
    { title: "Simulating on Monad", note: "Running the transaction on a copy of the chain." },
    { title: "Reading what changes", note: "Tokens in, tokens out and every allowance." },
    { title: "Running nine checks", note: "Spender, contract, amounts and known drainers." },
    { title: "Applying your rules", note: "Your caps and limits decide the verdict." },
  ],
  /** Above the stages while the check runs. */
  checking: "Checking before you sign",
  /** Read out once per stage. {stage} is the stage title. */
  stageAria: "Checking: {stage}",
  /** The skeleton under the stages. */
  pendingVerdict: "Verdict comes next",

  /** The small label above the big verdict. */
  verdictKicker: {
    live: "Baret's verdict",
    sample: "Expected verdict",
    failed: "Baret's verdict",
  },
  /** The one-line comparison under a live verdict, for judges. */
  compare: {
    expected: "Expected",
    live: "Live",
    match: "Matches",
    mismatch: "Differs",
  },
  /** The collapsed block at the end of the panel. */
  details: {
    summary: "Details for the curious",
    hint: "The call, what the site claims and how the verdict was reached.",
  },
  findingsCount: {
    one: "1 finding",
    many: "{count} findings",
  },

  /** Under a refusal from the Baret wallet: what the other path would have done. */
  refusedAfter:
    "A wallet with no pre-sign check would have shown you this same request to approve.",
} as const;

export type AnalysisPanelContent = typeof analysisPanel;
