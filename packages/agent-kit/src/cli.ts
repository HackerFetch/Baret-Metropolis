#!/usr/bin/env -S npx tsx
/**
 * baret: the agent wallet from a terminal.
 *
 *   baret address
 *   baret analyze --to 0x.. [--data 0x..] [--value <wei>]
 *   baret submit  --to 0x.. [--data 0x..] [--value <wei>]
 *   baret pay     --vault 0x.. --merchant 0x.. --amount <base units> --ref <text>
 *   baret wallet create            (Dynamic: a new server wallet for the agent)
 *   baret policy list
 *
 * Exit codes: 0 Baret cleared it (and, for submit and pay, it was sent),
 * 1 Baret did not clear it and nothing was signed, 2 anything else went wrong.
 *
 * Settings come from the environment, never from flags, so a key never lands
 * in shell history: BARET_API_URL, BARET_NETWORK, MONAD_TESTNET_RPC_URL,
 * BARET_POLICY_TEMPLATE, BARET_ALLOW_CAUTION=1, and one signer:
 *   BARET_AGENT_PRIVATE_KEY                      a local key (tests, local runs)
 *   DYNAMIC_ENVIRONMENT_ID + DYNAMIC_AUTH_TOKEN + BARET_AGENT_WALLET_PASSWORD
 *     a Dynamic server wallet, kept in BARET_AGENT_WALLET_FILE
 *     (default ~/.baret/agent-wallet.json)
 */
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { GuardUnreachableError, POLICY_TEMPLATES } from "@baret/guard";
import { type Address, getAddress, type Hex, isAddress, isHex } from "viem";
import { type AgentCall, AgentWallet, payCall } from "./agent-wallet.js";
import { createDynamicWallet, dynamicSignerFromFile } from "./dynamic.js";
import { GuardBlockedError } from "./errors.js";
import { type AgentSigner, localSigner } from "./signer.js";

const EXIT = { allowed: 0, blocked: 1, error: 2 } as const;

class UsageError extends Error {}

const env = process.env;
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

async function wallet(): Promise<AgentWallet> {
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
  return new AgentWallet({
    signer: await signer(),
    baretUrl: env.BARET_API_URL ?? "https://baret-monad-api.onrender.com",
    ...(env.BARET_API_KEY ? { baretApiKey: env.BARET_API_KEY } : {}),
    network,
    rpcUrl,
    policyTemplate: (template as keyof typeof POLICY_TEMPLATES | undefined) ?? "balanced",
    allowCaution: env.BARET_ALLOW_CAUTION === "1",
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

function callFrom(values: Record<string, string | undefined>): AgentCall {
  const data = values.data;
  if (data !== undefined && !isHex(data)) throw new UsageError("--data must be 0x hex");
  return {
    to: address(values.to, "to"),
    ...(data ? { data: data as Hex } : {}),
    ...(values.value ? { value: amount(values.value, "value") } : {}),
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
    },
  });

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
      const w = await wallet();
      const call =
        command === "submit"
          ? callFrom(values)
          : payCall({
              vault: address(values.vault, "vault"),
              merchant: address(values.merchant, "merchant"),
              amount: amount(values.amount, "amount"),
              reference: values.ref ?? "",
            });
      if (command === "pay" && !values.ref)
        throw new UsageError("--ref is required: the invoice id or memo");
      const { hash, verdict } = await w.guardedSubmit(call);
      print({ decision: verdict.decision, hash, from: w.address });
      return EXIT.allowed;
    }

    default:
      throw new UsageError(
        "usage: baret address | analyze | submit | pay | wallet create | policy list (see the header of cli.ts)",
      );
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    if (err instanceof GuardBlockedError) {
      print({
        decision: err.verdict.decision,
        signed: false,
        findings: err.verdict.findings.map((f) => ({ code: f.code, values: f.values })),
        firedRules: err.verdict.firedRules,
      });
      process.exit(EXIT.blocked);
    }
    if (err instanceof GuardUnreachableError) {
      console.error(`Can't reach Baret: ${err.message}. Nothing was signed.`);
      process.exit(EXIT.error);
    }
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(EXIT.error);
  });
