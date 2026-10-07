#!/usr/bin/env bash
# Runs the reputation oracle in the Chainlink CRE simulator against Monad testnet.
#
#   ./simulate.sh              dry run: reads the feed and the chain, sends nothing
#   ./simulate.sh --broadcast  writes one window of the feed to the registry
#
# Needs `cre login` (or CRE_API_KEY), bun, and in the environment or in
# workflows/.env: MONAD_TESTNET_RPC_URL, and for --broadcast CRE_ETH_PRIVATE_KEY,
# the key that owns the receiver.
#
# The simulator delivers through the network's mock forwarder, which checks no
# signatures: anyone can send a report through it. The receiver therefore
# listens to the real forwarder, and --broadcast points it at the mock one only
# for the length of the run, then puts the real one and the workflow-owner
# check back, also when the run fails.
set -euo pipefail
cd "$(dirname "$0")"

# CRE forwarders on Monad testnet (docs.chain.link/cre, forwarder directory).
MOCK_FORWARDER=0xB9F79d863261869B234c481D1f9A7af84AeAd192
FORWARDER=0xF8344CFd5c43616a4366C34E3EEE75af79a74482
ZERO=0x0000000000000000000000000000000000000000

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi
: "${MONAD_TESTNET_RPC_URL:?set MONAD_TESTNET_RPC_URL}"
export MONAD_TESTNET_RPC_URL

simulate() {
  cre workflow simulate reputation-oracle --target staging-settings \
    --non-interactive --trigger-index 0 "$@"
}

if [ "${1:-}" != "--broadcast" ]; then
  simulate
  exit 0
fi

: "${CRE_ETH_PRIVATE_KEY:?set CRE_ETH_PRIVATE_KEY}"
export CRE_ETH_PRIVATE_KEY
receiver=$(node -e 'console.log(require("./reputation-oracle/config.staging.json").receiverAddress)')
owner=$(cast wallet address --private-key "$CRE_ETH_PRIVATE_KEY")
send() {
  cast send "$receiver" "$@" --rpc-url "$MONAD_TESTNET_RPC_URL" \
    --private-key "$CRE_ETH_PRIVATE_KEY" >/dev/null
}
close() {
  send "setForwarder(address)" "$FORWARDER"
  send "setWorkflowOwner(address)" "$owner"
  echo "Receiver $receiver listens to the CRE forwarder again."
}

trap close EXIT
send "setWorkflowOwner(address)" "$ZERO"
send "setForwarder(address)" "$MOCK_FORWARDER"
echo "Receiver $receiver listens to the mock forwarder for this run."
simulate --broadcast
