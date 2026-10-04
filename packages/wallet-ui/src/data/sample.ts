// Each demo site's content by file, not through the @baret/content barrel:
// the store chunk loads on every wallet route and needs only the claims.
import { claimhub } from "@baret/content/showcase/claimhub.content";
import { launchpad } from "@baret/content/showcase/launchpad.content";
import { novaswap } from "@baret/content/showcase/novaswap.content";
import { orbityield } from "@baret/content/showcase/orbityield.content";
// By file, not through the @baret/guard barrel: this module imports types
// only, so zod stays out of the wallet's first chunk.
import { BALANCED_POLICY } from "../../../guard/src/policy-templates.js";
import type {
  ActivityItem,
  AgentPayment,
  Alert,
  Asset,
  ConnectRequest,
  GuardPolicy,
  Permission,
  SignRequest,
  Vault,
} from "./types.js";

/**
 * The wallet's sample account. Every screen reads it until the wallet is
 * wired to Mera, Monad and the Baret server, and the frame says so on every
 * screen. Addresses are made up; sites are on the reserved .example domain
 * and mirror the showcase's six demo sites, whose own claims the sign
 * requests quote. Dates sit in the first days of October 2026.
 */

/** The account: the same sample visitor the showcase uses. */
export const ACCOUNT = {
  address: "0x7a3f9e21c84b5d06f13a2e9b7c40d58e6f21c21e",
  /** Where the account's balance and activity are read: Monad testnet. */
  chainId: 10143,
} as const;

/** Sample counterparties. */
export const ADDRESS = {
  /** A friend the account has paid before. */
  friend: "0x4b1d3f5a7c9e2b4d6f8a0c1e3b5d7f9a2c4e0c0d",
  /** Its look-alike: the same first and last four characters. */
  lookalike: "0x4b1d8e2c6a0f4b8d2e6a0c4f8b2d6e0a4c8e0c0d",
  /** The canonical test USDC. */
  usdc: "0x2c9f6e3a8d1b5f7c0e4a9d2b6f8c1e3a5d7b9f40",
  novaswapRouter: "0x5b0e2a3c9d4f71e86a0c2d9e4b7f31a6c8d0e2f4",
  oldSpender: "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a07",
  drainer: "0xa61f3c8e5b2d9f4a7c0e1b6d3f8a5c2e9b4d7f30",
  pool: "0x8f3a6c9e1b4d7f0a2c5e8b1d4f7a0c3e6b9d2f57",
  sale: "0xc3e6a9d2f5b8e1c4a7d0f3b6e9c2a5d8f1b4e7a0",
  vault: "0x1e4b7d0a3c6f9b2e5d8a1c4f7b0e3d6a9c2f5b88",
  agent: "0x6d9a2c5f8b1e4d7a0c3f6b9e2d5a8c1f4b7e0d23",
  scrybe: "0x5c7e0b3a91d24f68e0a7c3b5d9f1e2a4c6b8d0f2",
  weather: "0x3f8b1d4a7c0e3b6d9f2a5c8e1b4d7a0c3f6e9b14",
} as const;

export const ASSETS: readonly Asset[] = [
  { symbol: "MON", balance: "22.4979", decimals: 18, contract: null },
  { symbol: "USDC", balance: "119.50", decimals: 6, contract: ADDRESS.usdc },
];

/** MON kept back for the network fee when sending the whole balance. */
export const FEE_RESERVE = "0.01";
/** A plain transfer's fee on testnet, in MON. */
export const TRANSFER_FEE = "0.0021";

/** The rules in force: Balanced, the starting template. */
export const POLICY: GuardPolicy = { ...BALANCED_POLICY, allowedAssets: [ADDRESS.usdc] };

/** Newest first. */
export const ACTIVITY: readonly ActivityItem[] = [
  {
    id: "a1",
    kind: "payment",
    at: "2026-10-03T13:42:00Z",
    values: { amount: "0.50", asset: "USDC", merchant: "scrybe.example" },
    verdict: "safe",
    findings: [],
    changes: [{ direction: "out", value: "0.50", unit: "USDC" }],
    hash: "0x8e1f4a7c0d3b6e9f2a5c8d1b4e7a0f3c6b9d2e5a8f1c4b7e0a3d6f9c2b5e8a1d",
    block: "48211902",
  },
  {
    id: "a2",
    kind: "blocked",
    at: "2026-10-03T11:05:00Z",
    values: { origin: "claimhub.example" },
    verdict: "blocked",
    rule: "blockUnlimitedApprovals",
    findings: [
      {
        code: "ERC20_APPROVAL_UNLIMITED",
        values: { spender: ADDRESS.drainer, asset: "USDC", amount: "" },
      },
      { code: "KNOWN_MALICIOUS_ADDRESS", values: { address: ADDRESS.drainer } },
    ],
    changes: [],
  },
  {
    id: "a3",
    kind: "sent",
    at: "2026-10-03T09:18:00Z",
    values: { amount: "2.50", asset: "MON", recipient: ADDRESS.friend },
    verdict: "safe",
    findings: [],
    changes: [{ direction: "out", value: "2.50", unit: "MON" }],
    hash: "0x2b5e8a1d4c7f0b3e6a9d2c5f8b1e4a7d0c3f6b9e2a5d8c1f4b7e0a3d6c9f2b58",
    block: "48188417",
    fee: TRANSFER_FEE,
  },
  {
    id: "a4",
    kind: "declined",
    at: "2026-10-02T18:31:00Z",
    values: { origin: "orbityield.example" },
    verdict: "caution",
    findings: [{ code: "UNKNOWN_CONTRACT_EXPOSURE", values: { contract: ADDRESS.pool } }],
    changes: [{ direction: "out", value: "5.00", unit: "MON" }],
  },
  {
    id: "a5",
    kind: "allowance",
    at: "2026-10-02T16:02:00Z",
    values: { spender: ADDRESS.novaswapRouter, amount: "50", asset: "USDC" },
    verdict: "caution",
    findings: [
      {
        code: "ERC20_APPROVAL_GRANTED",
        values: { spender: ADDRESS.novaswapRouter, amount: "50", asset: "USDC" },
      },
    ],
    changes: [],
    hash: "0x0c3f6b9e2d5a8c1f4b7e0d3a6c9f2e5b8a1d4c7f0e3b6a9d2c5f8e1b4a7d0c39",
    block: "48102266",
    fee: "0.0034",
  },
  {
    id: "a6",
    kind: "connect",
    at: "2026-10-02T15:58:00Z",
    values: { origin: "novaswap.example" },
    verdict: null,
    findings: [],
    changes: [],
  },
  {
    id: "a7",
    kind: "overridden",
    at: "2026-10-02T11:40:00Z",
    values: { rule: "maxLossPercent" },
    verdict: "blocked",
    rule: "maxLossPercent",
    findings: [{ code: "ESTIMATED_LOSS_EXCEEDS_MAX", values: { actual: "62%", limit: "50%" } }],
    changes: [{ direction: "out", value: "15.50", unit: "MON" }],
    hash: "0x7a0d3c6f9b2e5a8d1c4f7b0e3a6d9c2f5b8e1a4d7c0f3b6e9a2d5c8f1b4e7a0d",
    block: "48001735",
    fee: "0.0048",
  },
  {
    id: "a8",
    kind: "expired",
    at: "2026-10-01T20:12:00Z",
    values: { origin: "launchpad.example" },
    verdict: "caution",
    findings: [{ code: "DELEGATECALL_DETECTED", values: { contract: ADDRESS.sale } }],
    changes: [],
  },
  {
    id: "a9",
    kind: "received",
    at: "2026-10-01T09:03:00Z",
    values: { amount: "120.00", asset: "USDC" },
    verdict: null,
    findings: [],
    changes: [{ direction: "in", value: "120.00", unit: "USDC" }],
    hash: "0x3d6a9c2f5b8e1d4a7c0f3b6e9d2a5c8f1b4e7d0a3c6f9b2e5d8a1c4f7b0e3d6a",
    block: "47912008",
  },
  {
    id: "a10",
    kind: "received",
    at: "2026-10-01T08:47:00Z",
    values: { amount: "40.00", asset: "MON" },
    verdict: null,
    findings: [],
    changes: [{ direction: "in", value: "40.00", unit: "MON" }],
    hash: "0x9f2c5e8b1a4d7f0c3e6b9a2d5f8c1e4b7a0d3f6c9e2b5a8d1f4c7e0b3a6d9f2c",
    block: "47911553",
  },
];

export const PERMISSIONS: readonly Permission[] = [
  {
    id: "p1",
    kind: "unlimited",
    values: { spender: ADDRESS.oldSpender, asset: "USDC" },
  },
  {
    id: "p2",
    kind: "allowance",
    values: { spender: ADDRESS.novaswapRouter, amount: "50", asset: "USDC" },
  },
  // The count is filled from the vault's active merchants by the store.
  { id: "p3", kind: "agent", values: {} },
  { id: "p4", kind: "site", values: { origin: "novaswap.example" } },
];

export const ALERTS: readonly Alert[] = [
  {
    id: "al1",
    kind: "capNearly",
    values: { merchant: "scrybe.example", actual: "4.10 USDC", cap: "5.00 USDC" },
  },
  { id: "al2", kind: "unlimitedOpen", values: { spender: ADDRESS.oldSpender, asset: "USDC" } },
];

/** The alert the drift sample adds: something left the account unsigned. */
export const DRIFT_ALERT: Alert = { id: "al-drift", kind: "drift", values: {} };

export const VAULT: Vault = {
  address: ADDRESS.vault,
  asset: "USDC",
  balance: "60.00",
  merchants: [
    {
      address: ADDRESS.scrybe,
      origin: "scrybe.example",
      perPayment: "0.50",
      perHour: "2.00",
      perDay: "5.00",
      spent: "4.10",
      status: "active",
    },
    {
      address: ADDRESS.weather,
      origin: "forecast.example",
      perPayment: "1.00",
      perHour: null,
      perDay: "10.00",
      spent: "0.00",
      status: "paused",
    },
  ],
  agent: { address: ADDRESS.agent, created: "2026-09-30", payments: 41 },
};

export const AGENT_PAYMENTS: readonly AgentPayment[] = [
  { id: "ap1", at: "2026-10-03T13:42:00Z", merchant: "scrybe.example", amount: "0.50" },
  { id: "ap2", at: "2026-10-03T12:58:00Z", merchant: "scrybe.example", amount: "0.50" },
  { id: "ap3", at: "2026-10-03T12:20:00Z", merchant: "scrybe.example", amount: "0.40" },
  { id: "ap4", at: "2026-10-03T10:07:00Z", merchant: "scrybe.example", amount: "0.50" },
];

/** The empty sample's vault: deployed, with nothing in it and no agent key. */
export const EMPTY_VAULT: Vault = {
  address: ADDRESS.vault,
  asset: "USDC",
  balance: "0.00",
  merchants: [],
  agent: null,
};

/**
 * The four sample sign requests, one per verdict, each from one of the
 * showcase's demo sites and quoting that site's own claim.
 */
export const SIGN_REQUESTS: readonly SignRequest[] = [
  {
    id: "safe",
    origin: "novaswap.example",
    action: "transfer",
    values: { amount: "0.50", asset: "MON", recipient: ADDRESS.novaswapRouter },
    claim: novaswap.analysis.claims[0].claim,
    verdict: "safe",
    impact: "transfer",
    findings: [],
    changes: [{ direction: "out", value: "0.50", unit: "MON" }],
    approvals: [],
    fee: "0.0023",
    rules: [],
    raw: {
      to: ADDRESS.novaswapRouter,
      value: "500000000000000000",
      data: "0x",
      decoded: null,
    },
    expires: 300,
  },
  {
    id: "caution",
    origin: "orbityield.example",
    action: "contractCall",
    // The stake's MON goes to the pool: the impact names it as a transfer.
    values: { contract: ADDRESS.pool, amount: "5.00", asset: "MON", recipient: ADDRESS.pool },
    claim: orbityield.analysis.claims[0].claim,
    verdict: "caution",
    impact: "transfer",
    findings: [{ code: "UNKNOWN_CONTRACT_EXPOSURE", values: { contract: ADDRESS.pool } }],
    changes: [{ direction: "out", value: "5.00", unit: "MON" }],
    approvals: [],
    fee: "0.0041",
    rules: [],
    raw: {
      to: ADDRESS.pool,
      value: "5000000000000000000",
      data: "0x3a4b66f1",
      decoded: "stake()",
    },
    expires: 300,
  },
  {
    id: "blocked",
    origin: "claimhub.example",
    action: "approvalUnlimited",
    values: { spender: ADDRESS.drainer, asset: "USDC" },
    claim: claimhub.analysis.claims[1].claim,
    verdict: "blocked",
    impact: "approvalUnlimited",
    findings: [
      {
        code: "ERC20_APPROVAL_UNLIMITED",
        values: { spender: ADDRESS.drainer, asset: "USDC", amount: "" },
      },
      { code: "KNOWN_MALICIOUS_ADDRESS", values: { address: ADDRESS.drainer } },
    ],
    changes: [],
    approvals: [{ unit: "USDC", spender: ADDRESS.drainer, unlimited: true, amount: null }],
    fee: "0.0031",
    rules: [{ rule: "blockUnlimitedApprovals" }, { rule: "blockKnownMalicious" }],
    raw: {
      to: ADDRESS.usdc,
      value: "0",
      data: "0x095ea7b3000000000000000000000000a61f3c8e5b2d9f4a7c0e1b6d3f8a5c2e9b4d7f30ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      decoded: "approve(spender, unlimited)",
    },
    expires: 300,
  },
  {
    id: "unreachable",
    origin: "launchpad.example",
    action: "contractCall",
    values: { contract: ADDRESS.sale },
    claim: launchpad.analysis.claims[2].claim,
    verdict: "unreachable",
    impact: "unknown",
    findings: [],
    changes: [],
    approvals: [],
    fee: "0.0039",
    rules: [],
    raw: {
      to: ADDRESS.sale,
      value: "500000000000000000",
      data: "0xd7bb99ba",
      decoded: "contribute()",
    },
    expires: 300,
  },
];

export const CONNECT_REQUESTS: readonly ConnectRequest[] = [
  { id: "firstTime", origin: "https://novaswap.example", secure: true },
  { id: "insecure", origin: "http://claimhub.example", secure: false },
];
