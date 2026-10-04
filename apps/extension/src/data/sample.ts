import { extFrame } from "@baret/content";
import { ACCOUNT, ADDRESS, ASSETS, POLICY, SIGN_REQUESTS } from "@baret/wallet-ui/data/sample";
import type {
  Account,
  Activity,
  Alert,
  ConnectRequest,
  Facilitator,
  GuardPolicy,
  Payment,
  Permission,
  PopupRequest,
  Problem,
  Settings,
  SignRequest,
  Site,
  Watched,
} from "./types.js";

/**
 * The extension's sample wallet. Every screen reads it until the background,
 * the keystore and the Baret server are wired, and the frame says so on every
 * screen. It builds on the web wallet's sample (@baret/wallet-ui): the same
 * account, the same counterparties and the same four sign requests, so a
 * request reads the same on both surfaces. Addresses are made up; sites are
 * on the reserved .example domain and mirror the showcase's demo sites.
 *
 * Two scenarios: an account with a few days of history, and a new, empty one
 * for the empty states. Times are read against SAMPLE_NOW, so "4 min ago"
 * and "Today" stay true whenever the sample is opened.
 */

/** The sample's present moment. */
export const SAMPLE_NOW = "2026-10-03T14:00:00Z";

/** Counterparties only the extension's sample needs. */
export const EXT_ADDRESS = {
  trading: "0x3b6e9c1f4a7d0b3e6c9f2a5d8b1e4c7f0a3d6b52",
  agentTests: "0x9c2f5b8e1d4a7c0f3b6e9d2a5c8f1b4e7d0a3c19",
  cold: "0x5e8b1d4a7c0f3e6b9d2a5c8f1e4b7d0a3c6f9e21",
  operator: "0xd4a7c0f3b6e9d2a5c8f1b4e7a0d3c6f9b2e5a8d1",
  atlas: "0x7c0e3b6d9f2a5c8e1b4d7f0a3c6e9b2d5f8a1c46",
  faucet: "0x0f3a6c9e2b5d8f1a4c7e0b3d6f9a2c5e8b1d4f70",
} as const;

const [mainName = "", tradingName = "", testsName = ""] = extFrame.sampleData.accounts;

export const ACCOUNTS: readonly Account[] = [
  { id: "main", name: mainName, address: ACCOUNT.address, balance: "22.4979" },
  { id: "trading", name: tradingName, address: EXT_ADDRESS.trading, balance: "4.12" },
  { id: "tests", name: testsName, address: EXT_ADDRESS.agentTests, balance: "0.80" },
];

/** Newest first. */
export const ACTIVITY: readonly Activity[] = [
  {
    id: "x1",
    kind: "payment",
    status: "confirmed",
    at: "2026-10-03T13:42:00Z",
    account: "main",
    origin: "scrybe.example",
    counterparty: ADDRESS.scrybe,
    values: { amount: "0.50", asset: "USDC" },
    verdict: "safe",
    findings: [],
    changes: [{ direction: "out", value: "0.50", unit: "USDC" }],
    hash: "0x8e1f4a7c0d3b6e9f2a5c8d1b4e7a0f3c6b9d2e5a8f1c4b7e0a3d6f9c2b5e8a1d",
  },
  {
    id: "x2",
    kind: "alert",
    status: "confirmed",
    at: "2026-10-03T13:42:30Z",
    account: "main",
    origin: "scrybe.example",
    counterparty: null,
    values: { alert: "capNear" },
    verdict: null,
    findings: [],
    changes: [],
  },
  {
    id: "x3",
    kind: "allowance",
    status: "blocked",
    at: "2026-10-03T11:05:00Z",
    account: "main",
    origin: "claimhub.example",
    counterparty: ADDRESS.drainer,
    values: { asset: "USDC" },
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
    id: "x4",
    kind: "message",
    status: "confirmed",
    at: "2026-10-03T10:20:00Z",
    account: "main",
    origin: "scrybe.example",
    counterparty: null,
    values: {},
    verdict: null,
    findings: [],
    changes: [],
  },
  {
    id: "x5",
    kind: "sent",
    status: "confirmed",
    at: "2026-10-03T09:18:00Z",
    account: "main",
    origin: null,
    counterparty: ADDRESS.friend,
    values: { amount: "2.50", asset: "MON" },
    verdict: "safe",
    findings: [],
    changes: [{ direction: "out", value: "2.50", unit: "MON" }],
    fee: "0.0021",
    hash: "0x2b5e8a1d4c7f0b3e6a9d2c5f8b1e4a7d0c3f6b9e2a5d8c1f4b7e0a3d6c9f2b58",
  },
  {
    id: "x6",
    kind: "typedData",
    status: "declined",
    at: "2026-10-02T19:10:00Z",
    account: "main",
    origin: "pixeldrop.example",
    counterparty: ADDRESS.drainer,
    values: { asset: "USDC" },
    verdict: "caution",
    findings: [
      {
        code: "PERMIT_SIGNATURE_DETECTED",
        values: { spender: ADDRESS.drainer, amount: "500", asset: "USDC" },
      },
    ],
    changes: [],
  },
  {
    id: "x7",
    kind: "sent",
    status: "declined",
    at: "2026-10-02T18:31:00Z",
    account: "main",
    origin: "orbityield.example",
    counterparty: ADDRESS.pool,
    values: { amount: "5.00", asset: "MON" },
    verdict: "caution",
    findings: [{ code: "UNKNOWN_CONTRACT_EXPOSURE", values: { contract: ADDRESS.pool } }],
    changes: [{ direction: "out", value: "5.00", unit: "MON" }],
  },
  {
    id: "x8",
    kind: "allowance",
    status: "confirmed",
    at: "2026-10-02T16:02:00Z",
    account: "main",
    origin: "novaswap.example",
    counterparty: ADDRESS.novaswapRouter,
    values: { amount: "50", asset: "USDC" },
    verdict: "caution",
    findings: [
      {
        code: "ERC20_APPROVAL_GRANTED",
        values: { spender: ADDRESS.novaswapRouter, amount: "50", asset: "USDC" },
      },
    ],
    changes: [],
    fee: "0.0034",
    hash: "0x0c3f6b9e2d5a8c1f4b7e0d3a6c9f2e5b8a1d4c7f0e3b6a9d2c5f8e1b4a7d0c39",
  },
  {
    id: "x9",
    kind: "connect",
    status: "confirmed",
    at: "2026-10-02T15:58:00Z",
    account: "main",
    origin: "novaswap.example",
    counterparty: null,
    values: {},
    verdict: null,
    findings: [],
    changes: [],
  },
  {
    id: "x10",
    kind: "sent",
    status: "overridden",
    at: "2026-10-02T11:40:00Z",
    account: "main",
    origin: "novaswap.example",
    counterparty: ADDRESS.novaswapRouter,
    values: { amount: "15.50", asset: "MON" },
    verdict: "blocked",
    rule: "maxLossPercent",
    findings: [{ code: "ESTIMATED_LOSS_EXCEEDS_MAX", values: { actual: "62%", limit: "50%" } }],
    changes: [{ direction: "out", value: "15.50", unit: "MON" }],
    fee: "0.0048",
    hash: "0x7a0d3c6f9b2e5a8d1c4f7b0e3a6d9c2f5b8e1a4d7c0f3b6e9a2d5c8f1b4e7a0d",
  },
  {
    id: "x11",
    kind: "sent",
    status: "confirmed",
    at: "2026-10-02T09:00:00Z",
    account: "trading",
    origin: null,
    counterparty: ADDRESS.friend,
    values: { amount: "1.00", asset: "MON" },
    verdict: "safe",
    findings: [],
    changes: [{ direction: "out", value: "1.00", unit: "MON" }],
    fee: "0.0021",
    hash: "0x4d7a0c3f6b9e2d5a8c1f4b7e0d3a6c9f2e5b8a1d4c7f0e3b6a9d2c5f8e1b4a72",
  },
  {
    id: "x12",
    kind: "sent",
    status: "expired",
    at: "2026-10-01T20:12:00Z",
    account: "main",
    origin: "launchpad.example",
    counterparty: ADDRESS.sale,
    values: { amount: "0.50", asset: "MON" },
    verdict: "caution",
    findings: [{ code: "DELEGATECALL_DETECTED", values: { contract: ADDRESS.sale } }],
    changes: [],
  },
  {
    id: "x13",
    kind: "received",
    status: "confirmed",
    at: "2026-10-01T09:03:00Z",
    account: "main",
    origin: null,
    counterparty: EXT_ADDRESS.faucet,
    values: { amount: "120.00", asset: "USDC" },
    verdict: null,
    findings: [],
    changes: [{ direction: "in", value: "120.00", unit: "USDC" }],
    hash: "0x3d6a9c2f5b8e1d4a7c0f3b6e9d2a5c8f1b4e7d0a3c6f9b2e5d8a1c4f7b0e3d6a",
  },
  {
    id: "x14",
    kind: "received",
    status: "confirmed",
    at: "2026-10-01T08:47:00Z",
    account: "main",
    origin: null,
    counterparty: EXT_ADDRESS.faucet,
    values: { amount: "40.00", asset: "MON" },
    verdict: null,
    findings: [],
    changes: [{ direction: "in", value: "40.00", unit: "MON" }],
    hash: "0x9f2c5e8b1a4d7f0c3e6b9a2d5f8c1e4b7a0d3f6c9e2b5a8d1f4c7e0b3a6d9f2c",
  },
  {
    id: "x15",
    kind: "revoke",
    status: "confirmed",
    at: "2026-09-30T17:20:00Z",
    account: "main",
    origin: null,
    counterparty: ADDRESS.oldSpender,
    values: { asset: "MON" },
    verdict: "safe",
    findings: [],
    changes: [],
    fee: "0.0019",
    hash: "0x1b4e7a0d3c6f9b2e5a8d1c4f7b0e3a6d9c2f5b8e1a4d7c0f3b6e9a2d5c8f1b40",
  },
];

/** Largest exposure first is the options page's own sort; this is grant order. */
export const PERMISSIONS: readonly Permission[] = [
  {
    id: "p1",
    kind: "allowance",
    origin: "oldfarm.example",
    account: "main",
    status: "active",
    granted: "2026-07-14T10:00:00Z",
    lastUsed: "2026-07-20T08:15:00Z",
    holder: ADDRESS.oldSpender,
    uses: [
      { at: "2026-07-20T08:15:00Z", amount: "30.00" },
      { at: "2026-07-14T10:05:00Z", amount: "12.00" },
    ],
    spender: ADDRESS.oldSpender,
    asset: "USDC",
    amount: null,
  },
  {
    id: "p2",
    kind: "allowance",
    origin: "novaswap.example",
    account: "main",
    status: "active",
    granted: "2026-10-02T16:02:00Z",
    lastUsed: "2026-10-02T16:10:00Z",
    holder: ADDRESS.novaswapRouter,
    uses: [{ at: "2026-10-02T16:10:00Z", amount: "12.00" }],
    spender: ADDRESS.novaswapRouter,
    asset: "USDC",
    amount: "50",
  },
  {
    id: "p3",
    kind: "operator",
    origin: "pixeldrop.example",
    account: "main",
    status: "active",
    granted: "2026-09-28T12:30:00Z",
    lastUsed: null,
    holder: EXT_ADDRESS.operator,
    uses: [],
    operator: EXT_ADDRESS.operator,
    contract: "PixelDrop Genesis",
  },
  {
    id: "p4",
    kind: "payment",
    origin: "scrybe.example",
    account: "main",
    status: "active",
    granted: "2026-09-30T09:00:00Z",
    lastUsed: "2026-10-03T13:42:00Z",
    holder: ADDRESS.scrybe,
    uses: [
      { at: "2026-10-03T13:42:00Z", amount: "0.50" },
      { at: "2026-10-03T13:20:00Z", amount: "0.50" },
      { at: "2026-10-03T13:05:00Z", amount: "0.40" },
      { at: "2026-10-03T12:58:00Z", amount: "0.30" },
    ],
    merchant: "scrybe.example",
    asset: "USDC",
    caps: { perPayment: "0.50", hour: "2.00", day: "5.00" },
    spent: { hour: "1.70", day: "4.10" },
    paymentsToday: 9,
    facilitator: "f1",
    week: [1.2, 0.8, 2.6, 3.1, 1.9, 2.4, 4.1],
  },
  {
    id: "p5",
    kind: "payment",
    origin: "forecast.example",
    account: "main",
    status: "paused",
    granted: "2026-09-27T15:00:00Z",
    lastUsed: "2026-09-29T07:30:00Z",
    holder: ADDRESS.weather,
    uses: [{ at: "2026-09-29T07:30:00Z", amount: "1.00" }],
    merchant: "forecast.example",
    asset: "USDC",
    caps: { perPayment: "1.00", hour: null, day: "10.00" },
    spent: { hour: "0.00", day: "0.00" },
    paymentsToday: 0,
    facilitator: "f2",
    week: [0, 0, 1, 0, 0, 0, 0],
  },
];

export const ALERTS: readonly Alert[] = [
  {
    id: "al1",
    kind: "capNear",
    at: "2026-10-03T13:42:30Z",
    read: false,
    values: { origin: "scrybe.example", actual: "1.70 USDC", cap: "2.00 USDC" },
  },
  {
    id: "al2",
    kind: "unsettled",
    at: "2026-09-29T07:31:00Z",
    read: false,
    values: { amount: "1.00", asset: "USDC", merchant: "forecast.example" },
  },
  {
    id: "al3",
    kind: "watched",
    at: "2026-09-28T21:04:00Z",
    read: true,
    values: { amount: "0.50", asset: "MON" },
  },
];

/** The alert the "with an alert" preview adds: funds that left without a signature. */
export const DRIFT_ALERT: Alert = {
  id: "al0",
  kind: "drift",
  at: "2026-10-03T13:55:00Z",
  read: false,
  values: { amount: "3.00", asset: "MON" },
};

export const SITES: readonly Site[] = [
  {
    origin: "scrybe.example",
    status: "connected",
    firstSeen: "2026-09-30T08:55:00Z",
    connected: "2026-09-30T08:55:00Z",
    lastUsed: "2026-10-03T13:42:00Z",
    account: "main",
    requests: 42,
  },
  {
    origin: "novaswap.example",
    status: "connected",
    firstSeen: "2026-10-02T15:58:00Z",
    connected: "2026-10-02T15:58:00Z",
    lastUsed: "2026-10-02T16:10:00Z",
    account: "main",
    requests: 3,
  },
  {
    origin: "claimhub.example",
    status: "blocked",
    firstSeen: "2026-10-03T11:04:00Z",
    connected: null,
    lastUsed: "2026-10-03T11:05:00Z",
    account: null,
    requests: 1,
  },
  {
    origin: "pixeldrop.example",
    status: "paused",
    firstSeen: "2026-09-28T12:25:00Z",
    connected: "2026-09-28T12:25:00Z",
    lastUsed: "2026-10-02T19:10:00Z",
    account: "main",
    requests: 4,
  },
  {
    origin: "orbityield.example",
    status: "notConnected",
    firstSeen: "2026-10-02T18:29:00Z",
    connected: null,
    lastUsed: "2026-10-02T18:31:00Z",
    account: null,
    requests: 1,
  },
  {
    origin: "launchpad.example",
    status: "connected",
    firstSeen: "2026-10-01T20:05:00Z",
    connected: "2026-10-01T20:05:00Z",
    lastUsed: "2026-10-01T20:12:00Z",
    account: "main",
    requests: 1,
  },
  {
    origin: "forecast.example",
    status: "connected",
    firstSeen: "2026-09-27T14:50:00Z",
    connected: "2026-09-27T14:50:00Z",
    lastUsed: "2026-09-29T07:30:00Z",
    account: "main",
    requests: 2,
  },
  {
    origin: "oldfarm.example",
    status: "notConnected",
    firstSeen: "2026-07-14T09:58:00Z",
    connected: null,
    lastUsed: "2026-07-20T08:15:00Z",
    account: null,
    requests: 6,
  },
];

export const FACILITATORS: readonly Facilitator[] = [
  { id: "f1", name: "settle.example", payments: 41, volume: "18.30", known: true },
  { id: "f2", name: "relay.example", payments: 1, volume: "1.00", known: false },
];

/** The last seven days of x402 payments, newest first. */
export const PAYMENTS: readonly Payment[] = [
  ["2026-10-03T13:42:00Z", "0.50"],
  ["2026-10-03T13:20:00Z", "0.50"],
  ["2026-10-03T13:05:00Z", "0.40"],
  ["2026-10-03T12:58:00Z", "0.30"],
  ["2026-10-02T17:12:00Z", "0.50"],
  ["2026-10-02T09:41:00Z", "0.40"],
  ["2026-10-01T15:03:00Z", "0.50"],
  ["2026-09-30T11:26:00Z", "0.50"],
  ["2026-09-29T16:44:00Z", "0.30"],
  ["2026-09-28T10:09:00Z", "0.50"],
].map(([at = "", amount = ""], i) => ({
  id: `pay${i + 1}`,
  at,
  merchant: "scrybe.example",
  amount,
  asset: "USDC",
  facilitator: "f1",
  // The newest is still settling; every other one landed.
  stage: i === 0 ? ("verified" as const) : ("settled" as const),
  hash:
    i === 0
      ? null
      : `0x${(0x5c7e0b3a + i).toString(16).padStart(8, "0")}${"9d24f68e0a7c3b5d".repeat(3)}${i.toString(16).padStart(8, "0")}`,
}));

/** The payment to forecast.example that was signed and never settled. */
export const UNSETTLED_PAYMENT: Payment = {
  id: "pay-forecast",
  at: "2026-09-29T07:30:00Z",
  merchant: "forecast.example",
  amount: "1.00",
  asset: "USDC",
  facilitator: "f2",
  stage: "verified",
  hash: null,
};

export const PROBLEMS: readonly Problem[] = [
  {
    id: "pr1",
    kind: "overCap",
    at: "2026-10-03T12:40:00Z",
    merchant: "scrybe.example",
    values: { amount: "0.80 USDC", rule: "maxPerTxCap", cap: "0.50 USDC" },
  },
  {
    id: "pr2",
    kind: "mismatch",
    at: "2026-10-01T10:02:00Z",
    merchant: "forecast.example",
    values: { expected: ADDRESS.weather, actual: ADDRESS.drainer },
  },
  {
    id: "pr3",
    kind: "unsettled",
    at: "2026-09-29T07:30:00Z",
    merchant: "forecast.example",
    values: { amount: "1.00 USDC" },
  },
];

export const WATCHED: readonly Watched[] = [
  { address: ACCOUNT.address, name: mainName, lastMovement: "2026-10-03T13:42:00Z", unsigned: 0 },
  {
    address: EXT_ADDRESS.trading,
    name: tradingName,
    lastMovement: "2026-10-02T09:00:00Z",
    unsigned: 0,
  },
  {
    address: EXT_ADDRESS.cold,
    name: extFrame.sampleData.cold,
    lastMovement: null,
    unsigned: 0,
  },
];

export const SETTINGS: Settings = {
  lockMinutes: 15,
  notify: { drift: true, capNear: true, capReached: true, unsettled: true },
  rawData: false,
  timeoutMinutes: 5,
  debugLog: false,
  autoPay: true,
  backedUp: true,
};

export type { GuardPolicy };
export { ASSETS, POLICY };

/* ── The popup's sample requests ─────────────────────────────────────── */

function transaction(id: SignRequest["id"], firstTime = false): PopupRequest {
  const request = SIGN_REQUESTS.find((r) => r.id === id);
  if (!request) throw new Error(`no sample sign request ${id}`);
  return { kind: "transaction", id: `tx-${id}`, request, firstTime };
}

/** A sign-in message, exactly as a site sends it (EIP-4361). */
const SIGN_IN = [
  "scrybe.example wants you to sign in with your Monad account:",
  ACCOUNT.address,
  "",
  "Sign in to SCRYBE. This proves you own the address. It sends no transaction and costs nothing.",
  "",
  "URI: https://scrybe.example",
  "Version: 1",
  "Chain ID: 10143",
  "Nonce: 7f3a9c21",
  "Issued At: 2026-10-03T13:58:00Z",
].join("\n");

export const REQUESTS = {
  safe: transaction("safe"),
  caution: transaction("caution", true),
  blocked: transaction("blocked"),
  unreachable: transaction("unreachable"),
  message: {
    kind: "message",
    id: "msg",
    origin: "scrybe.example",
    text: SIGN_IN,
    readable: true,
    expires: 300,
  },
  unreadable: {
    kind: "message",
    id: "msg-raw",
    origin: "freemint.example",
    text: "0x8f3d2a6c1e9b4f70a5d8c3e6b1f4a7d0c9e2b5f8a1d4c7e0b3f6a9d2c5e8b1f4a7d0c3e6b9f2a5d8c1e4b7f0a3d6c9e2b5f8a1d4",
    readable: false,
    expires: 300,
  },
  permit: {
    kind: "typedData",
    id: "permit",
    origin: "pixeldrop.example",
    fields: [
      { name: "primaryType", value: "Permit" },
      { name: "domain.name", value: "USD Coin" },
      { name: "domain.chainId", value: "10143" },
      { name: "domain.verifyingContract", value: ADDRESS.usdc },
      { name: "owner", value: ACCOUNT.address },
      { name: "spender", value: ADDRESS.drainer },
      {
        name: "value",
        value: "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      },
      { name: "nonce", value: "0" },
      { name: "deadline", value: "1791590400" },
    ],
    permit: {
      spender: ADDRESS.drainer,
      asset: "USDC",
      amount: null,
      deadline: "2026-10-10T00:00:00Z",
    },
    expires: 300,
  },
  firstPayment: {
    kind: "payment",
    id: "pay-first",
    origin: "atlas.example",
    merchant: EXT_ADDRESS.atlas,
    amount: "0.05",
    asset: "USDC",
    facilitator: "settle.example",
    state: "first",
    expires: 60,
  },
  autoPayment: {
    kind: "payment",
    id: "pay-auto",
    origin: "scrybe.example",
    merchant: "scrybe.example",
    amount: "0.50",
    asset: "USDC",
    facilitator: "settle.example",
    state: "auto",
    caps: { perPayment: "0.50", hour: "2.00", day: "5.00" },
    spentToday: "4.10",
    expires: 60,
  },
  overCap: {
    kind: "payment",
    id: "pay-over",
    origin: "scrybe.example",
    merchant: "scrybe.example",
    amount: "0.80",
    asset: "USDC",
    facilitator: "settle.example",
    state: "overCap",
    capHit: "perPayment",
    caps: { perPayment: "0.50", hour: "2.00", day: "5.00" },
    spentToday: "4.10",
    expires: 60,
  },
  notChecked: {
    kind: "payment",
    id: "pay-unchecked",
    origin: "scrybe.example",
    merchant: "scrybe.example",
    amount: "0.50",
    asset: "USDC",
    facilitator: "settle.example",
    state: "notChecked",
    expires: 60,
  },
} as const satisfies Record<string, PopupRequest>;

export type RequestSample = keyof typeof REQUESTS | "queue";

/** The queue preview: three sites waiting at once, decided one at a time. */
export function queueOf(sample: RequestSample): readonly PopupRequest[] {
  if (sample === "queue") return [REQUESTS.blocked, REQUESTS.message, REQUESTS.safe];
  return [REQUESTS[sample]];
}

/** The connection requests the popup can preview, with what the extension adds. */
export interface ConnectSample extends ConnectRequest {
  /** Other wallets answered the site's EIP-6963 call too. */
  readonly multipleWallets: boolean;
  /** The site already sees one of the accounts. */
  readonly already: boolean;
}

export const CONNECTS = {
  firstTime: {
    id: "firstTime",
    origin: "https://atlas.example",
    secure: true,
    multipleWallets: true,
    already: false,
  },
  insecure: {
    id: "insecure",
    origin: "http://freemint.example",
    secure: false,
    multipleWallets: false,
    already: false,
  },
  already: {
    id: "firstTime",
    origin: "https://novaswap.example",
    secure: true,
    multipleWallets: false,
    already: true,
  },
} as const satisfies Record<string, ConnectSample>;

export type ConnectSampleId = keyof typeof CONNECTS;
