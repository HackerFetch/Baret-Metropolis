// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {CompliantPaymentGuard} from "../src/CompliantPaymentGuard.sol";

/**
 * Deploys the guard for agent payments in a Cleanverse Verified Asset. The
 * broadcaster owns it. The addresses are Cleanverse's on Monad testnet
 * (docs/CONTRACTS.md section 4.1): aUSDC, the A-Pass and the policy.
 *
 *   forge script script/DeployCompliantPaymentGuard.s.sol --rpc-url monad_testnet \
 *     --broadcast --private-key $DEPLOYER_PRIVATE_KEY
 *
 * BARET_CVA, BARET_APASS, BARET_CVA_POLICY and BARET_MIN_TIER override the
 * defaults. Refuses any chain but Monad testnet: Cleanverse's mainnet
 * addresses are not recorded here.
 */
contract DeployCompliantPaymentGuard is Script {
    function run() external {
        require(block.chainid == 10143, "Monad testnet only");
        address asset = vm.envOr("BARET_CVA", 0xaC0893567D43C3E7e6e35a72803df05416C1f20D);
        address apass = vm.envOr("BARET_APASS", 0xbA82D189540CaC9DC6FF46B6837CaC1BFdEC58B9);
        address policy = vm.envOr("BARET_CVA_POLICY", 0x36489bE45fa84f70a0c2BDB11D824Be608CB12Dd);
        uint256 minTier = vm.envOr("BARET_MIN_TIER", uint256(1));

        vm.startBroadcast();
        CompliantPaymentGuard guard =
            new CompliantPaymentGuard(msg.sender, asset, apass, policy, minTier);
        vm.stopBroadcast();

        console.log("CompliantPaymentGuard", address(guard));
    }
}
