// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {DemoUSDC} from "../../src/demo/DemoUSDC.sol";
import {NovaSwapDrainer} from "../../src/demo/NovaSwapDrainer.sol";
import {NovaSwapRouter} from "../../src/demo/NovaSwapRouter.sol";

contract NovaSwapTest is Test {
    DemoUSDC usdc;
    NovaSwapRouter router;
    NovaSwapDrainer drainer;
    address user = makeAddr("user");
    address sink = makeAddr("sink");

    function setUp() public {
        usdc = new DemoUSDC();
        router = new NovaSwapRouter(usdc);
        usdc.setMinter(address(router));
        drainer = new NovaSwapDrainer(usdc, sink);
        vm.deal(user, 10 ether);
        vm.deal(address(router), 5 ether);
    }

    function test_faucetAndMinterSetOnce() public {
        vm.prank(user);
        usdc.faucet();
        assertEq(usdc.balanceOf(user), 100e6);
        vm.expectRevert(DemoUSDC.MinterAlreadySet.selector);
        usdc.setMinter(user);
        vm.prank(user);
        vm.expectRevert(DemoUSDC.NotMinter.selector);
        usdc.mint(user, 1);
    }

    function test_swapMonForUsdcAtTheTestRate() public {
        vm.prank(user);
        uint256 out = router.swapMonForUsdc{value: 1 ether}(3.2e6);
        assertEq(out, 3.2e6);
        assertEq(usdc.balanceOf(user), 3.2e6);
        assertEq(user.balance, 9 ether);
    }

    function test_swapUsdcForMonWithAnExactAllowance() public {
        vm.startPrank(user);
        usdc.faucet();
        usdc.approve(address(router), 9.6e6);
        uint256 out = router.swapUsdcForMon(9.6e6, 3 ether);
        vm.stopPrank();
        assertEq(out, 3 ether);
        assertEq(usdc.balanceOf(user), 90.4e6);
        assertEq(usdc.allowance(user, address(router)), 0);
    }

    function test_slippageAndLiquidity() public {
        vm.prank(user);
        vm.expectRevert(NovaSwapRouter.SlippageExceeded.selector);
        router.swapMonForUsdc{value: 1 ether}(3.2e6 + 1);

        vm.startPrank(user);
        usdc.faucet();
        usdc.approve(address(router), 100e6);
        vm.expectRevert(NovaSwapRouter.NotEnoughLiquidity.selector);
        router.swapUsdcForMon(100e6, 0); // would pay 31.25 MON, the router has 5
        vm.stopPrank();
    }

    function test_drainerTakesTheWholeBalanceAfterAnUnlimitedApproval() public {
        vm.startPrank(user);
        usdc.faucet();
        usdc.approve(address(drainer), type(uint256).max);
        drainer.swapUsdcForMon(1e6, 0); // asked to sell 1, takes all 100
        vm.stopPrank();
        assertEq(usdc.balanceOf(user), 0);
        assertEq(usdc.balanceOf(sink), 100e6);

        // The allowance stands, so anything that arrives later goes too.
        vm.prank(user);
        usdc.faucet();
        drainer.drain(user);
        assertEq(usdc.balanceOf(user), 0);
        assertEq(usdc.balanceOf(sink), 200e6);
    }

    function test_drainerGetsNothingWithoutAnAllowance() public {
        vm.prank(user);
        usdc.faucet();
        drainer.drain(user);
        assertEq(usdc.balanceOf(user), 100e6);
    }
}
