import {
  bytesToHex,
  CronCapability,
  consensusIdenticalAggregation,
  EVMClient,
  encodeCallMsg,
  getNetwork,
  HTTPClient,
  handler,
  LATEST_BLOCK_NUMBER,
  type NodeRuntime,
  ok,
  prepareReportRequest,
  Runner,
  type Runtime,
  TxStatus,
  text,
} from "@chainlink/cre-sdk";
import { zeroAddress } from "viem";
import {
  type Config,
  decodePendingResult,
  encodePendingCall,
  encodeReport,
  parseConfig,
  parseFeed,
  selectWindow,
} from "./src/feed";

/**
 * Baret reputation oracle.
 *
 * On a schedule: read an external threat feed, take the window of it this run
 * is responsible for, ask the chain which of those addresses the registry
 * does not know yet, and write them to ReputationRegistry through the
 * receiver. The analysis server reads the registry before every signature,
 * so an address on the feed becomes a Blocked verdict without a deploy.
 *
 * Nothing is written when the feed cannot be read or does not look like the
 * feed: a blocklist is only extended on data every node agrees on.
 */

type FeedWindow = {
  total: number;
  index: number;
  windows: number;
  addresses: string[];
};

type Result = {
  feedEntries: number;
  window: string;
  checked: number;
  written: number;
  txHash: string;
};

/** Runs on every node; the DON takes the answer only when all of them match. */
const fetchWindow = (nodeRuntime: NodeRuntime<Config>, nowMs: number): FeedWindow => {
  const response = new HTTPClient()
    .sendRequest(nodeRuntime, { url: nodeRuntime.config.feedUrl, method: "GET" })
    .result();
  if (!ok(response)) throw new Error(`threat feed answered ${response.statusCode}`);

  const addresses = parseFeed(text(response));
  const window = selectWindow(addresses, nowMs, nodeRuntime.config);
  return { total: addresses.length, ...window };
};

const onCronTrigger = (runtime: Runtime<Config>): Result => {
  const config = runtime.config;
  const network = getNetwork({ chainFamily: "evm", chainSelectorName: config.chainName });
  if (!network) throw new Error(`unknown chain name: ${config.chainName}`);
  const evm = new EVMClient(network.chainSelector.selector);

  const nowMs = runtime.now().getTime();
  const feed = runtime
    .runInNodeMode(
      fetchWindow,
      consensusIdenticalAggregation<FeedWindow>(),
    )(nowMs)
    .result();
  const windowLabel = `${feed.index + 1}/${feed.windows}`;
  runtime.log(
    `Threat feed: ${feed.total} addresses, window ${windowLabel} holds ${feed.addresses.length}`,
  );

  const done = (written: number, txHash: string): Result => ({
    feedEntries: feed.total,
    window: windowLabel,
    checked: feed.addresses.length,
    written,
    txHash,
  });
  if (feed.addresses.length === 0) return done(0, "");

  const reply = evm
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: config.receiverAddress,
        data: encodePendingCall(feed.addresses),
      }),
      blockNumber: LATEST_BLOCK_NUMBER,
    })
    .result();
  const targets = decodePendingResult(bytesToHex(reply.data));
  runtime.log(`Registry does not know ${targets.length} of ${feed.addresses.length}`);
  if (targets.length === 0) return done(0, "");

  const report = runtime.report(prepareReportRequest(encodeReport(targets, config))).result();
  const write = evm
    .writeReport(runtime, {
      receiver: config.receiverAddress,
      report,
      gasConfig: { gasLimit: config.gasLimit },
    })
    .result();
  if (write.txStatus !== TxStatus.SUCCESS) {
    throw new Error(`registry write failed: ${write.errorMessage ?? `status ${write.txStatus}`}`);
  }

  const txHash = write.txHash && write.txHash.length > 0 ? bytesToHex(write.txHash) : "";
  runtime.log(
    `Wrote ${targets.length} entries as ${config.reasonCode}, severity ${config.severity}: ${txHash || "dry run, not broadcast"}`,
  );
  return done(targets.length, txHash);
};

const initWorkflow = (config: Config) => [
  handler(new CronCapability().trigger({ schedule: config.schedule }), onCronTrigger),
];

export async function main() {
  const runner = await Runner.newRunner<Config>({
    configParser: (bytes) => parseConfig(JSON.parse(new TextDecoder().decode(bytes))),
  });
  await runner.run(initWorkflow);
}
