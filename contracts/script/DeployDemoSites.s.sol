// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ClaimHubDistributor} from "../src/demo/ClaimHubDistributor.sol";
import {DemoDrainer} from "../src/demo/DemoDrainer.sol";
import {DemoToken} from "../src/demo/DemoToken.sol";
import {LaunchSale, LaunchSaleLogic, LaunchSaleProxy} from "../src/demo/LaunchSale.sol";
import {NightShift} from "../src/demo/NightShift.sol";
import {OrbitPool, OrbitPoolSilent} from "../src/demo/OrbitPool.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";

/**
 * Contracts for PixelDrop, OrbitYield, ClaimHub, LaunchPad and the agents
 * playground, and the registry reports that make the attack versions show
 * as reported. Testnet only; the deploy key is the registry's forwarder.
 *
 *   DRAINER_SINK=0x.. REGISTRY=0x.. forge script script/DeployDemoSites.s.sol \
 *     --rpc-url monad_testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
 */
contract DeployDemoSites is Script {
    function run() external {
        require(block.chainid == 10143, "Monad testnet only");
        address sink = vm.envAddress("DRAINER_SINK");
        ReputationRegistry registry = ReputationRegistry(vm.envAddress("REGISTRY"));

        vm.startBroadcast();
        (, address deployer,) = vm.readCallers();

        // PixelDrop
        NightShift night = new NightShift();

        // The spender/operator both ClaimHub's and PixelDrop's attack point at.
        DemoDrainer drainer = new DemoDrainer(sink);
        registry.reportFlagged(address(drainer), 4, "DEMO_DRAINER");
        registry.reportFlagged(sink, 4, "DRAINER_SINK");

        // OrbitYield
        DemoToken omon = new DemoToken("Orbit MON", "oMON", 18);
        OrbitPool pool = new OrbitPool(omon);
        omon.setMinter(address(pool), true);
        OrbitPoolSilent silent = new OrbitPoolSilent();

        // ClaimHub
        DemoToken hub = new DemoToken("ClaimHub", "HUB", 18);
        ClaimHubDistributor distributor = new ClaimHubDistributor(hub);
        hub.setMinter(address(distributor), true);

        // LaunchPad
        DemoToken lntl = new DemoToken("Lantern", "LNTL", 18);
        LaunchSale sale = new LaunchSale(lntl);
        lntl.setMinter(address(sale), true);
        LaunchSaleLogic logic = new LaunchSaleLogic();
        LaunchSaleProxy proxy = new LaunchSaleProxy(address(logic), lntl);
        lntl.setMinter(address(proxy), true);

        // Agents playground: a token that calls itself USDC and is not.
        DemoToken fakeUsdc = new DemoToken("USD Coin", "USDC", 6);
        fakeUsdc.setMinter(deployer, true);
        vm.stopBroadcast();

        console.log("NightShift", address(night));
        console.log("DemoDrainer", address(drainer));
        console.log("oMON", address(omon));
        console.log("OrbitPool", address(pool));
        console.log("OrbitPoolSilent", address(silent));
        console.log("HUB", address(hub));
        console.log("ClaimHubDistributor", address(distributor));
        console.log("LNTL", address(lntl));
        console.log("LaunchSale", address(sale));
        console.log("LaunchSaleLogic", address(logic));
        console.log("LaunchSaleProxy", address(proxy));
        console.log("FakeUSDC", address(fakeUsdc));
    }
}
