// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {PaymentGuard} from "../src/PaymentGuard.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";

/**
 * Deploys PaymentGuard and ReputationRegistry to Monad.
 *
 *   forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast \
 *     --private-key $DEPLOYER_PRIVATE_KEY
 *
 * Env: BARET_OWNER (vault + registry owner), MONAD_TESTNET_USDC_ADDRESS
 * (vault token), BARET_CRE_FORWARDER (registry writer; the deployer during
 * development, the CRE forwarder in production). Refuses any chain but Monad.
 */
contract Deploy is Script {
    function run() external {
        require(block.chainid == 10143 || block.chainid == 143, "Monad only");
        address owner = vm.envAddress("BARET_OWNER");
        address usdc = block.chainid == 10143
            ? vm.envAddress("MONAD_TESTNET_USDC_ADDRESS")
            : vm.envAddress("MONAD_MAINNET_USDC_ADDRESS");
        address forwarder = vm.envAddress("BARET_CRE_FORWARDER");

        vm.startBroadcast();
        PaymentGuard guard = new PaymentGuard(owner, usdc);
        ReputationRegistry registry = new ReputationRegistry(owner, forwarder);
        vm.stopBroadcast();

        console.log("PaymentGuard", address(guard));
        console.log("ReputationRegistry", address(registry));
    }
}
