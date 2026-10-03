// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {DemoUSDC} from "../src/demo/DemoUSDC.sol";
import {NovaSwapDrainer} from "../src/demo/NovaSwapDrainer.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";

/**
 * Step 2: the look-alike drainer, at a CREATE2 address ground with
 * `cast create2` to start and end like the honest router, then reported in
 * the ReputationRegistry (the deploy key is the registry's forwarder on
 * testnet). Testnet only.
 *
 *   DEMO_USDC=0x.. DRAINER_SINK=0x.. DRAINER_SALT=0x.. REGISTRY=0x.. \
 *   forge script script/DeployNovaSwapDrainer.s.sol --rpc-url monad_testnet \
 *     --broadcast --private-key $DEPLOYER_PRIVATE_KEY
 */
contract DeployNovaSwapDrainer is Script {
    function run() external {
        require(block.chainid == 10143, "Monad testnet only");
        DemoUSDC usdc = DemoUSDC(vm.envAddress("DEMO_USDC"));
        address sink = vm.envAddress("DRAINER_SINK");
        bytes32 salt = vm.envBytes32("DRAINER_SALT");
        ReputationRegistry registry = ReputationRegistry(vm.envAddress("REGISTRY"));

        vm.startBroadcast();
        NovaSwapDrainer drainer = new NovaSwapDrainer{salt: salt}(usdc, sink);
        registry.reportFlagged(address(drainer), 4, "NOVASWAP_LOOKALIKE_DRAINER");
        vm.stopBroadcast();

        console.log("NovaSwapDrainer", address(drainer));
    }
}
