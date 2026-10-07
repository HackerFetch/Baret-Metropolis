// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ReputationOracleReceiver} from "../src/ReputationOracleReceiver.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";

/**
 * Deploys the receiver the Chainlink CRE reputation-oracle workflow writes
 * through, protects the contracts Baret vouches for, and makes the receiver
 * the registry's forwarder. The broadcaster must own the registry.
 *
 *   REGISTRY=0x.. BARET_CRE_FORWARDER=0x.. BARET_CRE_WORKFLOW_OWNER=0x.. \
 *   BARET_PROTECTED=0x..,0x.. \
 *   forge script script/DeployReputationOracleReceiver.s.sol --rpc-url monad_testnet \
 *     --broadcast --private-key $DEPLOYER_PRIVATE_KEY
 *
 * BARET_CRE_FORWARDER is the CRE forwarder on this network (docs/CONTRACTS.md
 * section 3.4). BARET_CRE_WORKFLOW_OWNER is the address that owns the deployed
 * workflow. Refuses any chain but Monad.
 */
contract DeployReputationOracleReceiver is Script {
    function run() external {
        require(block.chainid == 10143 || block.chainid == 143, "Monad only");
        ReputationRegistry registry = ReputationRegistry(vm.envAddress("REGISTRY"));
        address forwarder = vm.envAddress("BARET_CRE_FORWARDER");
        address workflowOwner = vm.envAddress("BARET_CRE_WORKFLOW_OWNER");
        address[] memory protect = vm.envOr("BARET_PROTECTED", ",", new address[](0));

        vm.startBroadcast();
        ReputationOracleReceiver receiver =
            new ReputationOracleReceiver(msg.sender, address(registry), forwarder, workflowOwner);
        if (protect.length > 0) receiver.setProtected(protect, true);
        registry.setForwarder(address(receiver));
        vm.stopBroadcast();

        console.log("ReputationOracleReceiver", address(receiver));
    }
}
