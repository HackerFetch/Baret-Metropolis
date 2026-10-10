// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {SealedStore} from "../src/SealedStore.sol";

/**
 * Deploys the store the Baret wallet keeps sealed settings in. It has no
 * owner and no constructor arguments.
 *
 *   forge script script/DeploySealedStore.s.sol --rpc-url monad_testnet \
 *     --broadcast --private-key $DEPLOYER_PRIVATE_KEY
 */
contract DeploySealedStore is Script {
    function run() external {
        require(block.chainid == 10143, "Monad testnet only");
        vm.startBroadcast();
        SealedStore store = new SealedStore();
        vm.stopBroadcast();
        console.log("SealedStore", address(store));
    }
}
