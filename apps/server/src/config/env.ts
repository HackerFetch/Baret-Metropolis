import { MONAD_NETWORKS, type MonadNetwork } from "@baret/guard";
import { getAddress, isAddress } from "viem";
import { z } from "zod";

const optionalAddress = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    if (!isAddress(v)) {
      ctx.addIssue({ code: "custom", message: "must be a 0x address" });
      return z.NEVER;
    }
    return getAddress(v);
  });

const csv = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

const addressList = csv.transform((items, ctx) =>
  items.map((v) => {
    if (!isAddress(v)) {
      ctx.addIssue({ code: "custom", message: `${v} is not a 0x address` });
      return z.NEVER;
    }
    return getAddress(v);
  }),
);

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  MONAD_TESTNET_RPC_URL: z.string().url(),
  MONAD_TESTNET_USDC_ADDRESS: optionalAddress,
  MONAD_TESTNET_REPUTATION_REGISTRY_ADDRESS: optionalAddress,
  MONAD_TESTNET_KNOWN_CONTRACTS: addressList,

  MONAD_MAINNET_RPC_URL: z.string().url().optional(),
  MONAD_MAINNET_USDC_ADDRESS: optionalAddress,
  MONAD_MAINNET_REPUTATION_REGISTRY_ADDRESS: optionalAddress,
  MONAD_MAINNET_KNOWN_CONTRACTS: addressList,

  BARET_API_KEYS: csv,
  BARET_CORS_ORIGINS: csv,
  BARET_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
  BARET_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  BARET_VERDICT_TTL_SECONDS: z.coerce.number().int().positive().default(30),

  NANSEN_API_KEY: z.string().optional(),
  CLEANVERSE_API_KEY: z.string().optional(),
  CLEANVERSE_API_URL: z.string().url().optional(),
});

export interface NetworkConfig {
  network: MonadNetwork;
  chainId: number;
  rpcUrl: string;
  /** Canonical USDC. Null until verified for this network: USDC rules then fail closed. */
  usdcAddress: `0x${string}` | null;
  reputationRegistryAddress: `0x${string}` | null;
  /** Contracts Baret vouches for besides the ones Nansen identifies. */
  knownContracts: readonly `0x${string}`[];
}

export interface AppConfig {
  port: number;
  host: string;
  logLevel: z.infer<typeof envSchema>["LOG_LEVEL"];
  networks: Partial<Record<MonadNetwork, NetworkConfig>>;
  apiKeys: readonly string[];
  corsOrigins: readonly string[];
  rateLimitPerMinute: number;
  requestTimeoutMs: number;
  verdictTtlSeconds: number;
  nansenApiKey: string | null;
  cleanverse: { apiKey: string; apiUrl: string } | null;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment:\n${lines.join("\n")}`);
  }
  const e = parsed.data;

  const networks: AppConfig["networks"] = {
    testnet: {
      network: "testnet",
      chainId: MONAD_NETWORKS.testnet.chainId,
      rpcUrl: e.MONAD_TESTNET_RPC_URL,
      usdcAddress: e.MONAD_TESTNET_USDC_ADDRESS,
      reputationRegistryAddress: e.MONAD_TESTNET_REPUTATION_REGISTRY_ADDRESS,
      knownContracts: e.MONAD_TESTNET_KNOWN_CONTRACTS,
    },
  };
  if (e.MONAD_MAINNET_RPC_URL) {
    networks.mainnet = {
      network: "mainnet",
      chainId: MONAD_NETWORKS.mainnet.chainId,
      rpcUrl: e.MONAD_MAINNET_RPC_URL,
      usdcAddress: e.MONAD_MAINNET_USDC_ADDRESS,
      reputationRegistryAddress: e.MONAD_MAINNET_REPUTATION_REGISTRY_ADDRESS,
      knownContracts: e.MONAD_MAINNET_KNOWN_CONTRACTS,
    };
  }

  return {
    port: e.PORT,
    host: e.HOST,
    logLevel: e.LOG_LEVEL,
    networks,
    apiKeys: e.BARET_API_KEYS,
    corsOrigins: e.BARET_CORS_ORIGINS,
    rateLimitPerMinute: e.BARET_RATE_LIMIT_PER_MINUTE,
    requestTimeoutMs: e.BARET_REQUEST_TIMEOUT_MS,
    verdictTtlSeconds: e.BARET_VERDICT_TTL_SECONDS,
    nansenApiKey: e.NANSEN_API_KEY || null,
    cleanverse:
      e.CLEANVERSE_API_KEY && e.CLEANVERSE_API_URL
        ? { apiKey: e.CLEANVERSE_API_KEY, apiUrl: e.CLEANVERSE_API_URL }
        : null,
  };
}
