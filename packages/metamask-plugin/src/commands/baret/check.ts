import {
  CommandError,
  type CommandIO,
  PluginCommand,
  schemaToArgs,
  schemaToFlags,
} from "@metamask/agent-wallet/plugin";
import {
  checkProposal,
  type Decision,
  type Finding,
  type FiredRule,
  type GateReason,
  gate,
  NoVerdictError,
  reasons,
} from "../../guard.js";
import { proposalInputs, toProposal } from "../../inputs.js";

interface CheckResult {
  decision: Decision;
  /** Whether `mm baret send` would hand this transaction to the wallet. */
  wouldSend: boolean;
  gate: GateReason;
  reasons: string[];
  findings: Finding[];
  firedRules: FiredRule[];
  from: string;
  chainId: number;
  expiresAt: string;
  requestId: string;
}

/** `mm baret check`: ask Baret about a transaction before proposing it. Sends nothing. */
export default class BaretCheckCommand extends PluginCommand<CheckResult> {
  static override requiresAuth = true;
  static override description =
    "Baret: simulate and check a Monad transaction before proposing it (sends nothing)";
  static override flags: ReturnType<typeof schemaToFlags> = schemaToFlags(proposalInputs);
  static override args: ReturnType<typeof schemaToArgs> = schemaToArgs(proposalInputs);
  protected readonly pluginCommandId = "baret:check";

  async execute(io: CommandIO): Promise<CheckResult> {
    const resolved = await io.resolveInputs(proposalInputs);
    const { proposal, policyTemplate, apiUrl } = toProposal(
      resolved,
      this.ctx.walletStateManager.read(),
    );

    io.progress("Checking with Baret");
    try {
      const verdict = await checkProposal(proposal, { apiUrl, policyTemplate, signal: io.signal });
      const decided = gate(verdict, { acceptCaution: false, nowMs: Date.now() });
      return {
        decision: verdict.decision,
        wouldSend: decided.allowed,
        gate: decided.reason,
        reasons: reasons(verdict),
        findings: verdict.findings,
        firedRules: verdict.firedRules,
        from: proposal.from,
        chainId: proposal.chainId,
        expiresAt: verdict.expiresAt,
        requestId: verdict.requestId,
      };
    } catch (error) {
      if (error instanceof NoVerdictError) {
        throw new CommandError(
          "BARET_NO_VERDICT",
          `Baret could not check this transaction: ${error.message}.`,
          "Treat it as blocked. Do not propose it until a check succeeds.",
        );
      }
      throw error;
    } finally {
      io.progress();
    }
  }
}
