// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ClaimHubDistributor} from "../../src/demo/ClaimHubDistributor.sol";
import {DemoDrainer} from "../../src/demo/DemoDrainer.sol";
import {DemoToken} from "../../src/demo/DemoToken.sol";
import {LaunchSale, LaunchSaleLogic, LaunchSaleProxy} from "../../src/demo/LaunchSale.sol";
import {NightShift} from "../../src/demo/NightShift.sol";
import {OrbitPool, OrbitPoolSilent} from "../../src/demo/OrbitPool.sol";

contract DemoSitesTest is Test {
    address user = makeAddr("user");
    address sink = makeAddr("sink");
    DemoDrainer drainer;

    function setUp() public {
        drainer = new DemoDrainer(sink);
        vm.deal(user, 10 ether);
    }

    // ── DemoToken ──

    function test_onlyNamedMintersMintAndBurn() public {
        DemoToken t = new DemoToken("Hub", "HUB", 18);
        vm.expectRevert(DemoToken.NotMinter.selector);
        t.mint(user, 1);
        t.setMinter(address(this), true);
        t.mint(user, 5);
        t.burn(user, 2);
        assertEq(t.balanceOf(user), 3);
        assertEq(t.totalSupply(), 3);
        vm.prank(user);
        vm.expectRevert(DemoToken.NotOwner.selector);
        t.setMinter(user, true);
    }

    // ── PixelDrop ──

    function test_mintAtThePriceUpToTenPerWallet() public {
        NightShift nft = new NightShift();
        vm.startPrank(user);
        nft.mint{value: 0.03 ether}(3);
        assertEq(nft.balanceOf(user), 3);
        assertEq(nft.ownerOf(2), user);
        vm.expectRevert(NightShift.WrongPayment.selector);
        nft.mint{value: 0.01 ether}(2);
        vm.expectRevert(NightShift.WalletLimit.selector);
        nft.mint{value: 0.08 ether}(8);
        vm.stopPrank();
    }

    function test_operatorAccessLetsTheDrainerTakeEveryPiece() public {
        NightShift nft = new NightShift();
        vm.startPrank(user);
        nft.mint{value: 0.02 ether}(2);
        nft.setApprovalForAll(address(drainer), true);
        vm.stopPrank();

        uint256[] memory ids = new uint256[](2);
        ids[0] = 1;
        ids[1] = 2;
        drainer.drainCollection(address(nft), user, ids);
        assertEq(nft.balanceOf(user), 0);
        assertEq(nft.ownerOf(1), sink);
    }

    function test_withoutOperatorAccessTheDrainerGetsNothing() public {
        NightShift nft = new NightShift();
        vm.prank(user);
        nft.mint{value: 0.01 ether}(1);
        uint256[] memory ids = new uint256[](1);
        ids[0] = 1;
        vm.expectRevert(NightShift.NotAuthorized.selector);
        drainer.drainCollection(address(nft), user, ids);
    }

    // ── ClaimHub ──

    function test_claimSendsTheAllocationEveryTime() public {
        DemoToken hub = new DemoToken("ClaimHub", "HUB", 18);
        ClaimHubDistributor d = new ClaimHubDistributor(hub);
        hub.setMinter(address(d), true);
        vm.startPrank(user);
        d.claim();
        d.claim();
        vm.stopPrank();
        assertEq(hub.balanceOf(user), 4820 ether);
    }

    function test_unlimitedAllowanceLetsTheDrainerTakeTheBalance() public {
        DemoToken usdc = new DemoToken("USD Coin", "USDC", 6);
        usdc.setMinter(address(this), true);
        usdc.mint(user, 250e6);
        vm.prank(user);
        usdc.approve(address(drainer), type(uint256).max);
        drainer.drainToken(address(usdc), user);
        assertEq(usdc.balanceOf(user), 0);
        assertEq(usdc.balanceOf(sink), 250e6);
    }

    // ── OrbitYield ──

    function test_stakeGivesTheReceiptOneToOneAndUnstakeReturnsTheMon() public {
        DemoToken omon = new DemoToken("Orbit MON", "oMON", 18);
        OrbitPool pool = new OrbitPool(omon);
        omon.setMinter(address(pool), true);
        vm.startPrank(user);
        pool.stake{value: 4 ether}();
        assertEq(omon.balanceOf(user), 4 ether);
        pool.unstake(1 ether);
        vm.stopPrank();
        assertEq(omon.balanceOf(user), 3 ether);
        assertEq(user.balance, 7 ether);
    }

    function test_theSilentPoolKeepsTheMonAndGivesNothing() public {
        OrbitPoolSilent silent = new OrbitPoolSilent();
        vm.prank(user);
        silent.stake{value: 4 ether}();
        assertEq(user.balance, 6 ether);
        assertEq(address(silent).balance, 4 ether);

        vm.prank(user);
        vm.expectRevert("not owner");
        silent.refund(payable(user), 4 ether);
        silent.refund(payable(user), 4 ether);
        assertEq(user.balance, 10 ether);
    }

    // ── LaunchPad ──

    function test_plainSaleMintsAtTheRateInsideTheRange() public {
        DemoToken lntl = new DemoToken("Lantern", "LNTL", 18);
        LaunchSale sale = new LaunchSale(lntl);
        lntl.setMinter(address(sale), true);
        vm.startPrank(user);
        sale.contribute{value: 0.5 ether}();
        assertEq(lntl.balanceOf(user), 500 ether);
        vm.expectRevert(LaunchSale.OutOfRange.selector);
        sale.contribute{value: 0.001 ether}();
        vm.expectRevert(LaunchSale.OutOfRange.selector);
        sale.contribute{value: 2 ether}();
        vm.stopPrank();
    }

    function test_proxySaleRunsBorrowedCodeItsOwnerCanReplace() public {
        DemoToken lntl = new DemoToken("Lantern", "LNTL", 18);
        LaunchSaleLogic logic = new LaunchSaleLogic();
        LaunchSaleProxy proxy = new LaunchSaleProxy(address(logic), lntl);
        lntl.setMinter(address(proxy), true);

        vm.prank(user);
        LaunchSaleLogic(address(proxy)).contribute{value: 0.5 ether}();
        assertEq(lntl.balanceOf(user), 500 ether);
        assertEq(address(proxy).balance, 0.5 ether);

        vm.prank(user);
        vm.expectRevert("not owner");
        proxy.setLogic(address(0xdead));
        proxy.setLogic(address(0xdead));
        assertEq(proxy.logic(), address(0xdead));
    }
}
