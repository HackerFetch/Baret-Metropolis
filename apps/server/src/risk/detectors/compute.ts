import type { Detector } from "../../analysis/context.js";

/** Monad charges for the whole gas limit, so the rule compares the limit, not usage. */
export const compute: Detector = (ctx) => {
  const { maxGas } = ctx.policy;
  const limit = ctx.simulation.gasLimit;
  if (maxGas === null || limit === null || limit <= BigInt(maxGas)) return [];
  return [
    {
      code: "EXCESSIVE_GAS",
      values: { actual: limit.toString(), limit: String(maxGas) },
      rule: "maxGas",
    },
  ];
};
