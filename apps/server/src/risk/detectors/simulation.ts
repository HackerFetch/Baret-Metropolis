import type { Detector } from "../../analysis/context.js";

export const simulation: Detector = (ctx) => {
  if (!ctx.simulation.ran) return [];
  if (!ctx.simulation.ok) {
    return [
      {
        code: "SIMULATION_FAILED",
        values: {},
        details: { revertReason: ctx.simulation.revertReason },
      },
    ];
  }
  if (!ctx.simulation.traced) return [{ code: "LOW_CONFIDENCE_INCOMPLETE_DATA", values: {} }];
  return [];
};
