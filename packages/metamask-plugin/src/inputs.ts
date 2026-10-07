import { CommandError, InputFieldType, type InputSchema } from "@metamask/agent-wallet/plugin";
import {
  activeAddress,
  isMonadChainId,
  POLICY_TEMPLATES,
  type PolicyTemplate,
  type Proposal,
  proposalProblem,
} from "./guard.js";

/** The flags `baret check` and `baret send` share: what the agent wants to send. */
export const proposalInputs = {
  to: {
    type: InputFieldType.Text,
    flag: "to",
    message: "Contract or account the transaction goes to",
    required: true,
    prompt: true,
    index: 0,
  },
  value: {
    type: InputFieldType.Text,
    flag: "value",
    message: "MON to send, in wei",
    required: false,
    prompt: false,
  },
  data: {
    type: InputFieldType.Text,
    flag: "data",
    message: "Calldata, 0x-prefixed hex",
    required: false,
    prompt: false,
  },
  chainId: {
    type: InputFieldType.Text,
    flag: "chain-id",
    message: "Monad chain id: 10143 (testnet) or 143",
    required: false,
    prompt: false,
  },
  policy: {
    type: InputFieldType.Select,
    flag: "policy",
    message: "Baret rules to check against",
    options: POLICY_TEMPLATES.map((value) => ({ value, label: value })),
    required: false,
    prompt: false,
  },
  api: {
    type: InputFieldType.Text,
    flag: "api",
    message: "Baret server URL",
    env: "BARET_API_URL",
    required: false,
    prompt: false,
  },
} satisfies InputSchema;

export interface ResolvedProposal {
  proposal: Proposal;
  policyTemplate: PolicyTemplate;
  apiUrl: string | undefined;
}

/** Turns resolved flags and the wallet's state into a checked proposal, or fails the command. */
export function toProposal(
  resolved: Record<string, unknown>,
  walletState: unknown,
): ResolvedProposal {
  const text = (key: string) => (typeof resolved[key] === "string" ? resolved[key].trim() : "");
  const chainId = Number(text("chainId") || "10143");
  const draft = {
    chainId,
    from: activeAddress(walletState) ?? "",
    to: text("to"),
    value: text("value") || "0",
    data: text("data") || "0x",
  };

  if (!draft.from) {
    throw new CommandError("WALLET_NOT_FOUND", "No active wallet.", "Run `mm init` first.");
  }
  const problem = proposalProblem(draft);
  if (problem || !isMonadChainId(chainId)) {
    throw new CommandError(
      "INVALID_INPUT",
      `Not a transaction Baret can check: ${problem}.`,
      "Pass --to <address>, and optionally --value <wei>, --data <hex>, --chain-id 10143|143.",
    );
  }

  const policy = text("policy") || "balanced";
  const policyTemplate = POLICY_TEMPLATES.find((p) => p === policy);
  if (!policyTemplate) {
    throw new CommandError(
      "INVALID_INPUT",
      `Unknown policy "${policy}".`,
      `Use one of: ${POLICY_TEMPLATES.join(", ")}.`,
    );
  }
  return { proposal: { ...draft, chainId }, policyTemplate, apiUrl: text("api") || undefined };
}
