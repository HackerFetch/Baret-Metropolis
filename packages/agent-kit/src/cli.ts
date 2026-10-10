#!/usr/bin/env -S npx tsx
/**
 * baret: the agent wallet from a terminal.
 *
 *   baret address
 *   baret analyze --to 0x.. [--data 0x..] [--value <wei>]
 *   baret submit  --to 0x.. [--data 0x..] [--value <wei>] [--intent <text>]
 *   baret pay     --vault 0x.. --merchant 0x.. --amount <base units> --ref <text> [--intent <text>]
 *   baret review  --intent <text> [--from 0x..] and either the flags of pay
 *                 (--vault ...) or of submit (--to ...). Never signs.
 *   baret wallet create            (Dynamic: a new server wallet for the agent)
 *   baret policy list
 *
 * Flags for submit, pay and review:
 *   --transcript <file>  write the verdict, the review and the reviewer's
 *                        plan and tool calls as JSON (on a veto too)
 *   --trace              print the reviewer's steps on stderr as they happen
 * Only review takes --from: the account to review for. Default: the signer's.
 *
 * Exit codes: 0 Baret cleared it (and, for submit and pay, it was sent; for
 * review, the reviewer approved), 1 Baret did not clear it or the reviewer
 * vetoed it and nothing was signed, 2 anything else went wrong.
 *
 * Settings come from the environment (or packages/agent-kit/.env when run
 * with `pnpm baret`), never from flags, so a key never lands in shell
 * history: BARET_API_URL, BARET_API_KEY, BARET_NETWORK, MONAD_TESTNET_RPC_URL,
 * BARET_POLICY_TEMPLATE, BARET_ALLOW_CAUTION=1, QWEN_API_KEY (turns the Qwen
 * reviewer on: it plans, reads the decoded call, Baret's verdict, the vault
 * and the reputation registry, then approves or vetoes; submit and pay then
 * need an intent; optional QWEN_BASE_URL and QWEN_MODEL), and one signer:
 *   BARET_AGENT_PRIVATE_KEY                      a local key (tests, local runs)
 *   DYNAMIC_ENVIRONMENT_ID + DYNAMIC_AUTH_TOKEN + BARET_AGENT_WALLET_PASSWORD
 *     a Dynamic server wallet, kept in BARET_AGENT_WALLET_FILE
 *     (default ~/.baret/agent-wallet.json)
 */
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  type AnalyzeResponse,
  GuardUnreachableError,
  POLICY_TEMPLATES,
  TransactionGuard,
} from "@baret/guard";
import { type Address, getAddress, type Hex, isAddress, isHex } from "viem";
import { type AgentCall, AgentWallet, payCall } from "./agent-wallet.js";
import { createDynamicWallet, dynamicSignerFromFile } from "./dynamic.js";
import { GuardBlockedError } from "./errors.js";
import { qwenAgentReviewer } from "./review-agent.js";
import { type Review, type Reviewer, ReviewerVetoError, requireApproval } from "./reviewer.js";
import { type AgentSigner, localSigner } from "./signer.js";

const EXIT = { allowed: 0, blocked: 1, error: 2 } as const;

class UsageError extends Error {}

const env = process.env;
const baretUrl = () => env.BARET_API_URL ?? "https://baret-monad-api.onrender.com";
const walletFile = () =>
  env.BARET_AGENT_WALLET_FILE ?? join(homedir(), ".baret", "agent-wallet.json");
const dynamicEnv = () => {
  const environmentId = env.DYNAMIC_ENVIRONMENT_ID;
  const authToken = env.DYNAMIC_AUTH_TOKEN;
  const password = env.BARET_AGENT_WALLET_PASSWORD;
  if (environmentId && authToken && !password) {
    throw new UsageError(
      "BARET_AGENT_WALLET_PASSWORD is not set: Dynamic needs it to create and to use the wallet",
    );
  }
  return environmentId && authToken && password ? { environmentId, authToken, password } : null;
};

async function signer(): Promise<AgentSigner> {
  const key = env.BARET_AGENT_PRIVATE_KEY;
  if (key) {
    if (!isHex(key) || key.length !== 66)
      throw new UsageError("BARET_AGENT_PRIVATE_KEY is not a 32-byte hex key");
    return localSigner(key);
  }
  const dynamic = dynamicEnv();
  if (dynamic) return dynamicSignerFromFile({ ...dynamic, file: walletFile() });
  throw new UsageError(
    "no signer: set DYNAMIC_ENVIRONMENT_ID and DYNAMIC_AUTH_TOKEN, or BARET_AGENT_PRIVATE_KEY",
  );
}

/** For `baret review`: an address to check for, and no key behind it. */
const watchOnly = (address: Address): AgentSigner => ({
  address,
  signTransaction: () => {
    throw new Error("review never signs");
  },
});

/** The Qwen agentic reviewer, when QWEN_API_KEY is set. */
function reviewer(trace: boolean): Reviewer | undefined {
  if (!env.QWEN_API_KEY) return undefined;
  const inner = qwenAgentReviewer({
    apiKey: env.QWEN_API_KEY,
    ...(env.QWEN_BASE_URL ? { baseUrl: env.QWEN_BASE_URL } : {}),
    ...(env.QWEN_MODEL ? { model: env.QWEN_MODEL } : {}),
    baretUrl: baretUrl(),
    ...(env.BARET_API_KEY ? { baretApiKey: env.BARET_API_KEY } : {}),
    ...(trace ? { onStep: (line: string) => console.error(line) } : {}),
  });
  // pay states a default intent when none is given; the transcript keeps the one reviewed.
  return {
    review: (input) => {
      run.intent = input.intent;
      return inner.review(input);
    },
  };
}

/**
 * What --transcript writes. Filled as the command runs, so the error handler
 * can still write it when Baret blocks or the reviewer vetoes.
 */
const run: {
  file?: string;
  command?: string;
  intent?: string;
  from?: Address;
  call?: AgentCall;
  verdict?: AnalyzeResponse;
} = {};

function writeTranscript(review: Review | null, hash: Hex | null) {
  if (!run.file) return;
  const record = {
    command: run.command,
    at: new Date().toISOString(),
    intent: run.intent ?? null,
    from: run.from ?? null,
    call: run.call
      ? {
          to: run.call.to,
          valueWei: (run.call.value ?? 0n).toString(),
          data: run.call.data ?? "0x",
        }
      : null,
    baretDecision: run.verdict?.decision ?? null,
    review,
    hash,
  };
  writeFileSync(run.file, `${JSON.stringify(record, null, 2)}\n`);
  console.error(`Transcript written to ${run.file}`);
}

async function wallet(
  options: { signer?: AgentSigner; reviewer?: Reviewer } = {},
): Promise<AgentWallet> {
  const template = env.BARET_POLICY_TEMPLATE;
  if (template && !(template in POLICY_TEMPLATES)) {
    throw new UsageError(
      `BARET_POLICY_TEMPLATE must be one of ${Object.keys(POLICY_TEMPLATES).join(", ")}`,
    );
  }
  const network = env.BARET_NETWORK ?? "testnet";
  if (network !== "testnet" && network !== "mainnet")
    throw new UsageError("BARET_NETWORK must be testnet or mainnet");
  const rpcUrl =
    network === "testnet"
      ? (env.MONAD_TESTNET_RPC_URL ?? "https://testnet-rpc.monad.xyz")
      : env.MONAD_MAINNET_RPC_URL;
  if (!rpcUrl) throw new UsageError("MONAD_MAINNET_RPC_URL is not set");
  // Kept so a transcript can name Baret's decision even when the call stops later.
  const guard = new TransactionGuard({
    baseUrl: baretUrl(),
    ...(env.BARET_API_KEY ? { apiKey: env.BARET_API_KEY } : {}),
  });
  return new AgentWallet({
    signer: options.signer ?? (await signer()),
    baretUrl: baretUrl(),
    ...(env.BARET_API_KEY ? { baretApiKey: env.BARET_API_KEY } : {}),
    network,
    rpcUrl,
    policyTemplate: (template as keyof typeof POLICY_TEMPLATES | undefined) ?? "balanced",
    allowCaution: env.BARET_ALLOW_CAUTION === "1",
    guard: {
      evaluate: async (request) => {
        run.verdict = await guard.evaluate(request);
        return run.verdict;
      },
    },
    ...(options.reviewer ? { reviewer: options.reviewer } : {}),
  });
}

function address(value: string | undefined, flag: string): Address {
  if (!value || !isAddress(value)) throw new UsageError(`--${flag} must be a 0x address`);
  return getAddress(value);
}

function amount(value: string | undefined, flag: string): bigint {
  if (!value || !/^\d+$/.test(value))
    throw new UsageError(`--${flag} must be a whole number of base units`);
  return BigInt(value);
}

type CallFlags = { to?: string; data?: string; value?: string };
type PayFlags = { vault?: string; merchant?: string; amount?: string; ref?: string };

function callFrom(values: CallFlags): AgentCall {
  const data = values.data;
  if (data !== undefined && !isHex(data)) throw new UsageError("--data must be 0x hex");
  return {
    to: address(values.to, "to"),
    ...(data ? { data: data as Hex } : {}),
    ...(values.value ? { value: amount(values.value, "value") } : {}),
  };
}

function paymentFrom(values: PayFlags) {
  if (!values.ref) throw new UsageError("--ref is required: the invoice id or memo");
  return {
    vault: address(values.vault, "vault"),
    merchant: address(values.merchant, "merchant"),
    amount: amount(values.amount, "amount"),
    reference: values.ref,
  };
}

const print = (value: unknown) => console.log(JSON.stringify(value, null, 2));

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      to: { type: "string" },
      data: { type: "string" },
      value: { type: "string" },
      vault: { type: "string" },
      merchant: { type: "string" },
      amount: { type: "string" },
      ref: { type: "string" },
      intent: { type: "string" },
      from: { type: "string" },
      transcript: { type: "string" },
      trace: { type: "boolean" },
    },
  });
  if (values.from !== undefined && command !== "review")
    throw new UsageError("--from is for baret review only: submit and pay use the signer");
  if (command) run.command = command;
  if (values.transcript) run.file = values.transcript;
  if (values.intent) run.intent = values.intent;

  switch (command) {
    case "address":
      console.log((await signer()).address);
      return EXIT.allowed;

    case "policy":
      if (positionals[0] !== "list") throw new UsageError("usage: baret policy list");
      print(POLICY_TEMPLATES);
      return EXIT.allowed;

    case "wallet": {
      if (positionals[0] !== "create") throw new UsageError("usage: baret wallet create");
      const dynamic = dynamicEnv();
      if (!dynamic) throw new UsageError("set DYNAMIC_ENVIRONMENT_ID and DYNAMIC_AUTH_TOKEN first");
      const created = await createDynamicWallet({ ...dynamic, file: walletFile() });
      console.log(created.address);
      console.error(`Saved to ${walletFile()} (keep it private: it holds the wallet's key share).`);
      return EXIT.allowed;
    }

    case "analyze": {
      const w = await wallet();
      const verdict = await w.evaluate(callFrom(values));
      print(verdict);
      return w.allows(verdict) ? EXIT.allowed : EXIT.blocked;
    }

    case "submit":
    case "pay": {
      const r = reviewer(values.trace === true);
      const w = await wallet(r ? { reviewer: r } : {});
      run.from = w.address;
      let result: Awaited<ReturnType<AgentWallet["guardedSubmit"]>>;
      if (command === "submit") {
        run.call = callFrom(values);
        result = await w.guardedSubmit(run.call, values.intent ? { intent: values.intent } : {});
      } else {
        const payment = paymentFrom(values);
        run.call = payCall(payment);
        result = await w.pay({
          ...payment,
          ...(values.intent ? { intent: values.intent } : {}),
        });
      }
      const { hash, verdict, review } = result;
      writeTranscript(review ?? null, hash);
      print({ decision: verdict.decision, ...(review ? { review } : {}), hash, from: w.address });
      return EXIT.allowed;
    }

    case "review": {
      const intent = values.intent?.trim();
      if (!intent) throw new UsageError("--intent is required: what the agent says it is doing");
      const r = reviewer(values.trace === true);
      if (!r) throw new UsageError("baret review needs QWEN_API_KEY");
      let from: Address;
      if (values.from !== undefined) {
        from = address(values.from, "from");
      } else {
        try {
          from = (await signer()).address;
        } catch (err) {
          if (!(err instanceof UsageError)) throw err;
          throw new UsageError("baret review needs --from <0x> or a configured signer");
        }
      }
      run.from = from;
      // Same request as pay and submit would send, from a wallet that cannot sign.
      const w = await wallet({ signer: watchOnly(from) });
      const payment = values.vault ? paymentFrom(values) : undefined;
      const call = payment ? payCall(payment) : callFrom(values);
      run.call = call;
      const verdict = await w.evaluate(call);
      if (!w.allows(verdict)) {
        writeTranscript(null, null);
        print({
          decision: verdict.decision,
          reviewed: false,
          signed: false,
          findings: verdict.findings.map((f) => ({ code: f.code, values: f.values })),
        });
        return EXIT.blocked;
      }
      const review = await requireApproval(r, {
        intent,
        from,
        call,
        verdict,
        ...(payment ? { reference: payment.reference } : {}),
      });
      writeTranscript(review, null);
      print({ decision: verdict.decision, review, signed: false });
      return EXIT.allowed;
    }

    default:
      throw new UsageError(
        "usage: baret address | analyze | submit | pay | review | wallet create | policy list (see the header of cli.ts)",
      );
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    if (err instanceof GuardBlockedError) {
      writeTranscript(null, null);
      print({
        decision: err.verdict.decision,
        signed: false,
        findings: err.verdict.findings.map((f) => ({ code: f.code, values: f.values })),
        firedRules: err.verdict.firedRules,
      });
      process.exit(EXIT.blocked);
    }
    if (err instanceof ReviewerVetoError) {
      writeTranscript(err.review, null);
      print({ decision: "vetoed", signed: false, review: err.review });
      process.exit(EXIT.blocked);
    }
    if (err instanceof GuardUnreachableError) {
      console.error(`Can't reach Baret: ${err.message}. Nothing was signed.`);
      process.exit(EXIT.error);
    }
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(EXIT.error);
  });
