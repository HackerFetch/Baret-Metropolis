/**
 * What `baret --help` and `baret <command> --help` print, and the flags each
 * command takes. Kept apart from cli.ts so the text can be tested without
 * running a command.
 */

export interface CliFlag {
  /** The flag without the dashes, as parseArgs names it. */
  name: string;
  type: "string" | "boolean";
  /** What a usage line shows after the flag, for a string flag. */
  value?: string;
  help: string;
}

export interface CliCommand {
  name: string;
  /** The words after the command name on the usage line, if any. */
  synopsis?: string;
  help: string;
  flags: CliFlag[];
  /** The flags the command cannot run without. */
  required?: string[];
}

const to: CliFlag = { name: "to", type: "string", value: "0x..", help: "the account called" };
const data: CliFlag = {
  name: "data",
  type: "string",
  value: "0x..",
  help: "the calldata (default: none, a plain transfer)",
};
const value: CliFlag = {
  name: "value",
  type: "string",
  value: "<wei>",
  help: "MON sent with the call, in wei (default: 0)",
};
const vault: CliFlag = {
  name: "vault",
  type: "string",
  value: "0x..",
  help: "the PaymentGuard vault",
};
const merchant: CliFlag = {
  name: "merchant",
  type: "string",
  value: "0x..",
  help: "the merchant the vault pays",
};
const amount: CliFlag = {
  name: "amount",
  type: "string",
  value: "<n>",
  help: "the amount in the token's base units",
};
const ref: CliFlag = {
  name: "ref",
  type: "string",
  value: "<text>",
  help: "the invoice id or memo",
};
const intent: CliFlag = {
  name: "intent",
  type: "string",
  value: "<text>",
  help: "what the agent says it is doing, for the Qwen reviewer",
};
const transcript: CliFlag = {
  name: "transcript",
  type: "string",
  value: "<file>",
  help: "write the verdict, the review and the reviewer's plan and tool calls as JSON (on a veto too)",
};
const trace: CliFlag = {
  name: "trace",
  type: "boolean",
  help: "print the reviewer's steps on stderr as they happen",
};

export const COMMANDS: CliCommand[] = [
  { name: "address", help: "Print the signer's address.", flags: [] },
  {
    name: "analyze",
    help: "Ask Baret about a call and print the whole verdict. Signs nothing.",
    flags: [to, data, value],
    required: ["to"],
  },
  {
    name: "submit",
    help: "Check a call with Baret, then sign and send it when Baret clears it.",
    flags: [to, data, value, intent, transcript, trace],
    required: ["to"],
  },
  {
    name: "pay",
    help: "Pay a merchant through a PaymentGuard vault, after Baret clears the payment.",
    flags: [vault, merchant, amount, ref, intent, transcript, trace],
    required: ["vault", "merchant", "amount", "ref"],
  },
  {
    name: "x402",
    synopsis: "<url>",
    help: "Pay an HTTP 402 (x402, EIP-3009): read what the server asks, have Baret check that exact payment, sign it and request again. Needs BARET_AGENT_PRIVATE_KEY.",
    flags: [
      {
        name: "max",
        type: "string",
        value: "<n>",
        help: "never sign a payment above this many base units",
      },
    ],
  },
  {
    name: "review",
    help: "Run Baret and the Qwen reviewer on a call without signing it. Takes the flags of pay (--vault ...) or of submit (--to ...). Needs QWEN_API_KEY.",
    flags: [
      intent,
      {
        name: "from",
        type: "string",
        value: "0x..",
        help: "the account to review for (default: the signer's)",
      },
      to,
      data,
      value,
      vault,
      merchant,
      amount,
      ref,
      transcript,
      trace,
    ],
    required: ["intent"],
  },
  {
    name: "wallet",
    synopsis: "create",
    help: "Create a Dynamic server wallet for the agent and save it to BARET_AGENT_WALLET_FILE.",
    flags: [],
  },
  { name: "policy", synopsis: "list", help: "Print the policy templates.", flags: [] },
];

export const HELP_FLAG: CliFlag = {
  name: "help",
  type: "boolean",
  help: "print this help and exit",
};

export const SETTINGS = `Settings come from the environment, never from flags, so a key never lands
in shell history. A .env file in the current directory is read first when
there is one (a variable already set in the environment wins).

  BARET_API_URL              the Baret API (default: https://baret-monad-api.onrender.com)
  BARET_API_KEY              its API key, when the server asks for one
  BARET_NETWORK              testnet (default) or mainnet
  MONAD_TESTNET_RPC_URL      the RPC used to send (default: https://testnet-rpc.monad.xyz)
  MONAD_MAINNET_RPC_URL      the RPC for mainnet (required when BARET_NETWORK=mainnet)
  BARET_POLICY_TEMPLATE      strict, balanced (default) or permissive
  BARET_ALLOW_CAUTION=1      let submit and pay go through on a Caution
  QWEN_API_KEY               turns the Qwen reviewer on for submit, pay and review;
                             optional QWEN_BASE_URL and QWEN_MODEL
  and one signer:
  BARET_AGENT_PRIVATE_KEY    a local key (tests, local runs)
  DYNAMIC_ENVIRONMENT_ID + DYNAMIC_AUTH_TOKEN + BARET_AGENT_WALLET_PASSWORD
                             a Dynamic server wallet, kept in BARET_AGENT_WALLET_FILE
                             (default ~/.baret/agent-wallet.json)

Exit codes: 0 Baret cleared it (and, for submit and pay, it was sent; for
review, the reviewer approved), 1 Baret did not clear it or the reviewer
vetoed it and nothing was signed, 2 anything else went wrong.`;

export function findCommand(name: string | undefined): CliCommand | undefined {
  return COMMANDS.find((c) => c.name === name);
}

/** One usage line: `baret pay --vault 0x.. --merchant 0x.. ...`. */
export function synopsis(command: CliCommand): string {
  const parts = [`baret ${command.name}`];
  if (command.synopsis) parts.push(command.synopsis);
  for (const flag of command.flags) {
    const shown =
      flag.type === "string" ? `--${flag.name} ${flag.value ?? "<value>"}` : `--${flag.name}`;
    parts.push(command.required?.includes(flag.name) ? shown : `[${shown}]`);
  }
  return parts.join(" ");
}

/** The one-line form printed under an error. */
export function usageLine(): string {
  return `usage: baret <command> [flags]   commands: ${COMMANDS.map((c) => c.name).join(", ")}   (baret --help)`;
}

/** `baret --help`: every command with its flags, then the settings. */
export function usage(): string {
  const lines = ["baret: the agent wallet from a terminal.", ""];
  for (const command of COMMANDS) {
    lines.push(`  ${synopsis(command)}`);
    lines.push(`      ${command.help}`);
  }
  lines.push("");
  lines.push("  baret <command> --help     the flags of one command");
  lines.push("");
  lines.push(SETTINGS);
  return lines.join("\n");
}

/** `baret <command> --help`. */
export function commandHelp(command: CliCommand): string {
  const lines = [synopsis(command), "", command.help];
  if (command.flags.length > 0) {
    lines.push("");
    const width = Math.max(...command.flags.map((f) => f.name.length));
    for (const flag of command.flags) {
      lines.push(`  --${flag.name.padEnd(width)}  ${flag.help}`);
    }
  }
  lines.push("", "Settings and exit codes: baret --help");
  return lines.join("\n");
}

/** The options of one command for parseArgs, with --help added. */
export function parseOptions(
  command: CliCommand | undefined,
): Record<string, { type: "string" | "boolean"; short?: string }> {
  const flags = command ? command.flags : COMMANDS.flatMap((c) => c.flags);
  const options: Record<string, { type: "string" | "boolean"; short?: string }> = {};
  for (const flag of flags) options[flag.name] = { type: flag.type };
  options.help = { type: "boolean", short: "h" };
  return options;
}
