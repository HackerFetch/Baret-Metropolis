import {
  CommandError,
  type CommandIO,
  InputFieldType,
  type InputSchema,
  PluginCommand,
  schemaToArgs,
  schemaToFlags,
} from "@metamask/agent-wallet/plugin";
import {
  checkProposal,
  type Decision,
  type GateReason,
  guardedSend,
  NoVerdictError,
  type Proposal,
  reasons,
  type SubmitOutcome,
  toHexQuantity,
} from "../../guard.js";
import { proposalInputs, toProposal } from "../../inputs.js";

const inputs = {
  ...proposalInputs,
  acceptCaution: {
    type: InputFieldType.Boolean,
    flag: "accept-caution",
    message: "Send when Baret answers Caution (a person has read the findings)",
    required: false,
    prompt: false,
  },
  wait: {
    type: InputFieldType.Boolean,
    flag: "wait",
    message: "Wait for the transaction to confirm",
    required: false,
    prompt: false,
  },
} satisfies InputSchema;

interface SendResult {
  decision: Decision;
  gate: GateReason;
  reasons: string[];
  from: string;
  chainId: number;
  status: string;
  hash?: string;
  failureReason?: string;
  pollingId?: string;
  requestId: string;
}

/** The wallet executor as the host's own `wallet send-transaction` command calls it. */
type Executor = (
  request: {
    kind: "transaction";
    chainId: number;
    transaction: { to: string; value: string; data: string };
  },
  options: { signal: AbortSignal; noAwait?: boolean },
) => Promise<{
  status: string;
  hash?: string;
  failureDescription?: string;
  pendingJob?: { pollingId?: string };
}>;

/**
 * `mm baret send`: check, then propose. A transaction Baret blocks is never
 * handed to the wallet; one it passes still goes through MetaMask's own policy
 * and approval, which this plugin cannot change.
 */
export default class BaretSendCommand extends PluginCommand<SendResult> {
  static override requiresAuth = true;
  static override description =
    "Baret: check a Monad transaction and propose it to the wallet only if it is not blocked";
  static override flags: ReturnType<typeof schemaToFlags> = schemaToFlags(inputs);
  static override args: ReturnType<typeof schemaToArgs> = schemaToArgs(inputs);
  protected readonly pluginCommandId = "baret:send";

  async execute(io: CommandIO): Promise<SendResult> {
    const resolved = await io.resolveInputs(inputs);
    const { proposal, policyTemplate, apiUrl } = toProposal(
      resolved,
      this.ctx.walletStateManager.read(),
    );

    const submit = async (p: Proposal): Promise<SubmitOutcome> => {
      io.progress("Proposing to the wallet");
      const executor = (await this.ctx.walletExecutor(
        io,
        this.pluginCommandId,
      )) as unknown as Executor;
      const result = await executor(
        {
          kind: "transaction",
          chainId: p.chainId,
          transaction: { to: p.to, value: toHexQuantity(p.value), data: p.data },
        },
        { signal: io.signal, ...(resolved.wait ? {} : { noAwait: true }) },
      ).catch((cause: unknown) => {
        // Baret let it through; what stopped it is the wallet (its policy, its
        // approval, or a network it cannot send on). Say which side refused.
        if (cause instanceof CommandError) throw cause;
        throw new CommandError(
          "WALLET_DID_NOT_SEND",
          `Baret passed this transaction, but the wallet did not send it: ${cause instanceof Error ? cause.message : "unknown error"}.`,
          "Check `mm chains list` (the wallet sends on Monad, chain 143) and the wallet's policy.",
        );
      });
      return {
        status: result.status,
        ...(result.hash ? { hash: result.hash } : {}),
        ...(result.failureDescription ? { failure: result.failureDescription } : {}),
        ...(result.pendingJob?.pollingId ? { pollingId: result.pendingJob.pollingId } : {}),
      };
    };

    io.progress("Checking with Baret");
    try {
      const result = await guardedSend(
        proposal,
        {
          check: (p) => checkProposal(p, { apiUrl, policyTemplate, signal: io.signal }),
          submit,
        },
        { acceptCaution: resolved.acceptCaution === true },
      );
      const why = reasons(result.verdict);

      if (!result.sent || !result.outcome) {
        const hint =
          result.gate.reason === "caution"
            ? "A person should read the findings; pass --accept-caution to send anyway."
            : result.gate.reason === "expired"
              ? "The check is out of date. Run the command again."
              : "Do not retry with different flags. Change the transaction or tell the user.";
        throw new CommandError(
          result.gate.reason === "caution" ? "BARET_CAUTION" : "BARET_BLOCKED",
          `Baret did not let this transaction through (${result.verdict.decision}): ${why.join("; ") || result.gate.reason}.`,
          hint,
        );
      }

      return {
        decision: result.verdict.decision,
        gate: result.gate.reason,
        reasons: why,
        from: proposal.from,
        chainId: proposal.chainId,
        status: result.outcome.status,
        ...(result.outcome.hash ? { hash: result.outcome.hash } : {}),
        ...(result.outcome.failure ? { failureReason: result.outcome.failure } : {}),
        ...(result.outcome.pollingId ? { pollingId: result.outcome.pollingId } : {}),
        requestId: result.verdict.requestId,
      };
    } catch (error) {
      if (error instanceof NoVerdictError) {
        throw new CommandError(
          "BARET_NO_VERDICT",
          `Baret could not check this transaction, so it was not sent: ${error.message}.`,
          "Nothing reached the wallet. Try again when Baret answers.",
        );
      }
      throw error;
    } finally {
      io.progress();
    }
  }
}
