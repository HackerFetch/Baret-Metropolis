/**
 * Seals a small document, relays it to the SealedStore and opens it again
 * from the chain, as a second device would.
 *
 *   BARET_SEALED_RELAYER_PRIVATE_KEY=0x... pnpm --filter @baret/server verify:sealed
 *   pnpm --filter @baret/server verify:sealed -- --api https://baret-monad-api.onrender.com
 *
 * With `--api` the write goes through that server's POST /v1/sealed; without,
 * this script relays it itself with the key in the environment. The keys come
 * from a random stand-in for a passkey's PRF output, so every run uses a new id.
 */
import { readSealed, SealedKeys, sealedTarget } from "@baret/wallet-core";
import { type Hex, stringToBytes } from "viem";
import { monadSender } from "../src/application/review.js";
import { SealedRelay, storedVersionReader } from "../src/application/sealed.js";
import type { NetworkConfig } from "../src/config/env.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const rpcUrl = process.env.MONAD_TESTNET_RPC_URL ?? "https://testnet-rpc.monad.xyz";
const target = sealedTarget("testnet");
if (!target) throw new Error("no SealedStore on testnet");
const { store, chainId } = target;
const api = arg("api");

const prf = crypto.getRandomValues(new Uint8Array(32));
const keys = await SealedKeys.fromPrf(prf);
console.log(`id            ${keys.id}`);

async function write(version: bigint, text: string): Promise<{ status: number; body: unknown }> {
  const put = await keys.put({ store, chainId }, version, stringToBytes(text));
  if (api) {
    const res = await fetch(`${api.replace(/\/+$/, "")}/v1/sealed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(put),
    });
    return { status: res.status, body: await res.json() };
  }
  const key = process.env.BARET_SEALED_RELAYER_PRIVATE_KEY as Hex | undefined;
  if (!key) throw new Error("set BARET_SEALED_RELAYER_PRIVATE_KEY, or pass --api <url>");
  const network = { network: "testnet", chainId, rpcUrl } as NetworkConfig;
  const relay = new SealedRelay({
    store,
    chainId,
    dailyLimit: 10,
    current: storedVersionReader(network, store),
    send: monadSender(network, key),
  });
  try {
    return { status: 200, body: await relay.relay(put) };
  } catch (err) {
    return { status: 0, body: (err as Error).message };
  }
}

let failed = false;
const expect = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failed = true;
};

const first = await write(1n, '{"template":"strict","note":"first"}');
expect("version 1 is stored", first.status === 200, JSON.stringify(first.body));
const second = await write(2n, '{"template":"strict","note":"second"}');
expect("version 2 replaces it", second.status === 200, JSON.stringify(second.body));
const replay = await write(2n, '{"template":"balanced"}');
expect("version 2 again is refused", replay.status !== 200, JSON.stringify(replay.body));

// A second device: the same passkey output, nothing else.
const there = await SealedKeys.fromPrf(prf);
const entry = await readSealed({ store, id: there.id, rpcUrl });
expect("the chain holds version 2", entry.version === 2n, `version ${entry.version}`);
const plain = new TextDecoder().decode(await there.open(entry.blob, entry.version));
expect("a second device opens it", plain.includes('"second"'), plain);

const stranger = await SealedKeys.fromPrf(crypto.getRandomValues(new Uint8Array(32)));
const opened = await stranger.open(entry.blob, entry.version).then(
  () => true,
  () => false,
);
expect("another passkey cannot open it", !opened);

process.exit(failed ? 1 : 0);
