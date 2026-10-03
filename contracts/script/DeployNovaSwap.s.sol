// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {DemoUSDC} from "../src/demo/DemoUSDC.sol";
import {NovaSwapRouter} from "../src/demo/NovaSwapRouter.sol";

/**
 * Step 1 of the NovaSwap showcase: dUSDC and the honest router, with MON for
 * dUSDC → MON swaps. Testnet only.
 *
 *   ROUTER_FUNDING_WEI=... forge script script/DeployNovaSwap.s.sol \
 *     --rpc-url monad_testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
 */
contract DeployNovaSwap is Script {
    function run() external {
        require(block.chainid == 10143, "Monad testnet only");
        uint256 funding = vm.envOr("ROUTER_FUNDING_WEI", uint256(0.5 ether));

        vm.startBroadcast();
        DemoUSDC usdc = new DemoUSDC();
        NovaSwapRouter router = new NovaSwapRouter(usdc);
        usdc.setMinter(address(router));
        (bool ok,) = address(router).call{value: funding}("");
        require(ok, "funding failed");
        vm.stopBroadcast();

        console.log("DemoUSDC", address(usdc));
        console.log("NovaSwapRouter", address(router));
    }
}
