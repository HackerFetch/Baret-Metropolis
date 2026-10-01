import type { AnalysisContext, Detector, FindingDraft } from "../analysis/context.js";
import { approvals } from "./detectors/approvals.js";
import { compliance } from "./detectors/compliance.js";
import { compute } from "./detectors/compute.js";
import { cpi } from "./detectors/cpi.js";
import { evmDanger } from "./detectors/evm-danger.js";
import { programs } from "./detectors/programs.js";
import { reputation } from "./detectors/reputation.js";
import { simulation } from "./detectors/simulation.js";
import { x402 } from "./detectors/x402.js";

export const DETECTORS: Record<string, Detector> = {
  simulation,
  approvals,
  programs,
  "evm-danger": evmDanger,
  reputation,
  compliance,
  cpi,
  compute,
  x402,
};

export function runDetectors(ctx: AnalysisContext): FindingDraft[] {
  return Object.values(DETECTORS).flatMap((detect) => detect(ctx));
}
