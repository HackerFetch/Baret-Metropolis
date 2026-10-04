import type { SignRequest } from "@baret/wallet-ui/data/types";

/**
 * Fail-closed: without Baret there is no check and no simulation, so a
 * request reads as unreachable, whatever the sample or the form says.
 */
export function unchecked(request: SignRequest): SignRequest {
  return {
    ...request,
    verdict: "unreachable",
    impact: "unknown",
    findings: [],
    changes: [],
    approvals: [],
    rules: [],
  };
}
