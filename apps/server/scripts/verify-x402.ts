/**
 * Pays the x402 demo resource for real: reads the 402, has Baret check the
 * payment, signs it, and proves the USDC moved on Monad testnet.
 *
 *   BARET_X402_PAYER_PRIVATE_KEY=0x... pnpm --filter @baret/server verify:x402
 *   ... verify:x402 -- --api https://baret-monad-api.onrender.com
 *
 * The payer needs test USDC and no MON: the server pays the gas. Each run
 * spends the resource's price (0.05 USDC by default).
 */
import { localSigner, payX402 } from "@baret/agent-kit";
import { createPublicClient, type Hex, http, parseAbi } from "viem";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const api = (arg("api") ?? "http://127.0.0.1:8080").replace(/\/+$/, "");
const rpcUrl = process.env.MONAD_TESTNET_RPC_URL ?? "https://testnet-rpc.monad.xyz";
const key = process.env.BARET_X402_PAYER_PRIVATE_KEY as Hex | undefined;
if (!key) throw new Error("set BARET_X402_PAYER_PRIVATE_KEY (a testnet wallet holding test USDC)");

const signer = localSigner(key);
const chain = createPublicClient({ transport: http(rpcUrl, { retryCount: 4 }) });
const ERC20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);
const url = `${api}/demo/paywall?q=${encodeURIComponent("what is x402")}`;

let failed = false;
function check(name: string, ok: boolean, detail = ""): void {
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
}

const unpaid = await fetch(url);
const asked = (await unpaid.json()) as {
  accepts?: { payTo: Hex; asset: Hex; maxAmountRequired: string }[];
};
const terms = asked.accepts?.[0];
check("no payment: 402 with the terms", unpaid.status === 402 && terms !== undefined);
if (!terms) process.exit(1);
const price = BigInt(terms.maxAmountRequired);
console.log(`payer         ${signer.address}`);
console.log(`pays          ${price} base units of ${terms.asset} to ${terms.payTo}`);

const balance = (who: Hex) =>
  chain.readContract({ address: terms.asset, abi: ERC20, functionName: "balanceOf", args: [who] });
const before = { payer: await balance(signer.address), merchant: await balance(terms.payTo) };

// Keeps the header of the paid request, to offer the same payment a second time.
let sentHeader = "";
const recording: typeof fetch = (input, init) => {
  sentHeader = new Headers(init?.headers).get("x-payment") ?? sentHeader;
  return fetch(input, init);
};
const paid = await payX402(url, {
  signer,
  baretUrl: api,
  policyTemplate: "balanced",
  maxAmount: price,
  fetch: recording,
});
check(
  "Baret cleared the payment before it was signed",
  paid.verdict?.decision === "safe",
  paid.verdict?.decision,
);
const body = (await paid.response.json()) as { answer?: string; error?: string };
check(
  "paid: 200 with the answer",
  paid.response.status === 200 && Boolean(body.answer),
  body.error ?? "",
);
const hash = paid.receipt?.transaction;
check("the receipt names a transaction", typeof hash === "string", hash ?? "");
if (hash) {
  const receipt = await chain.waitForTransactionReceipt({ hash, timeout: 60_000 });
  check(
    "the transaction succeeded on-chain",
    receipt.status === "success",
    `block ${receipt.blockNumber}`,
  );
  const after = { payer: await balance(signer.address), merchant: await balance(terms.payTo) };
  check("the payer has the price less", before.payer - after.payer === price);
  check("the merchant has the price more", after.merchant - before.merchant === price);
}

const again = await fetch(url, { headers: { "x-payment": sentHeader } });
const refusal = (await again.json()) as { error?: string };
check("the same payment a second time: 402", again.status === 402, refusal.error ?? "");

console.log(failed ? "\nx402: FAILED" : "\nx402: all checks passed");
process.exit(failed ? 1 : 0);
