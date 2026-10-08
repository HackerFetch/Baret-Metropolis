// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {CompliantPaymentGuard} from "../src/CompliantPaymentGuard.sol";

/// @dev Stands in for Cleanverse's A-Pass: a credential record per wallet,
///      read through the same selector, reverting when there is none.
contract MockAPass {
    struct Credential {
        uint256 status;
        uint256 tier;
    }

    mapping(address => Credential) public credentials;
    mapping(address => bool) public has;

    function issue(address to, uint256 status, uint256 tier) external {
        credentials[to] = Credential(status, tier);
        has[to] = true;
    }

    function revoke(address from) external {
        delete credentials[from];
        has[from] = false;
    }

    function balanceOf(address account) external view returns (uint256) {
        return has[account] ? 1 : 0;
    }

    /// The credential record, at the real contract's selector 0x6a069f61.
    fallback() external {
        require(msg.sig == 0x6a069f61, "unknown call");
        address party = abi.decode(msg.data[4:], (address));
        require(has[party], "no credential");
        Credential memory c = credentials[party];
        bytes memory out = abi.encode(c.status, c.tier, uint256(0), uint256(0));
        assembly {
            return(add(out, 32), mload(out))
        }
    }
}

/// @dev Stands in for Cleanverse's policy: both sides need a credential, and
///      it reverts (it does not answer false) when one is missing, as the real one does.
contract MockPolicy {
    MockAPass public immutable apass;
    mapping(address => bool) public registered;
    mapping(address => bool) public frozen;

    error NotAllowed(address party);

    constructor(MockAPass apass_) {
        apass = apass_;
    }

    function register(address token) external {
        registered[token] = true;
    }

    function freeze(address party, bool on) external {
        frozen[party] = on;
    }

    function isTokenRegistered(address token) external view returns (bool) {
        return registered[token];
    }

    function canTransfer(address, address from, address to, uint256) external view returns (bool) {
        if (apass.balanceOf(from) == 0) revert NotAllowed(from);
        if (apass.balanceOf(to) == 0) revert NotAllowed(to);
        return !frozen[from] && !frozen[to];
    }
}

/// @dev A compliant asset: its own transfer asks the policy, like aUSDC.
contract MockCva {
    MockPolicy public immutable policy;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(MockPolicy policy_) {
        policy = policy_;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(policy.canTransfer(address(this), from, to, amount), "policy");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract CompliantPaymentGuardTest is Test {
    MockAPass apass;
    MockPolicy policy;
    MockCva cva;
    CompliantPaymentGuard guard;

    address owner = makeAddr("owner");
    address agent = makeAddr("agent");
    address shop = makeAddr("shop");
    address stranger = makeAddr("stranger");

    uint256 constant ONE = 1e6;
    bytes32 constant REF = keccak256("invoice-1");

    function setUp() public {
        apass = new MockAPass();
        policy = new MockPolicy(apass);
        cva = new MockCva(policy);
        policy.register(address(cva));
        guard = new CompliantPaymentGuard(owner, address(cva), address(apass), address(policy), 3);

        apass.issue(owner, 1, 5);
        apass.issue(shop, 1, 5);
        cva.mint(owner, 100 * ONE);
        vm.startPrank(owner);
        cva.approve(address(guard), 10 * ONE);
        guard.setAgentSigner(agent);
        guard.setMerchantCap(shop, ONE, 3 * ONE);
        vm.stopPrank();
        vm.warp(1_800_000_000);
    }

    function _pay(address to, uint256 amount) internal {
        vm.prank(agent);
        guard.pay(to, amount, REF);
    }

    function _expectNotVerified(address party, CompliantPaymentGuard.Reason reason) internal {
        vm.expectRevert(
            abi.encodeWithSelector(CompliantPaymentGuard.NotVerified.selector, party, reason)
        );
    }

    // ── the gate ──

    function test_settlesBetweenTwoVerifiedIdentitiesAndRecordsBoth() public {
        vm.expectEmit(true, true, true, true);
        emit CompliantPaymentGuard.Settled(
            shop, agent, ONE, REF, uint256(uint160(owner)), uint256(uint160(shop)), 5, 5
        );
        _pay(shop, ONE);
        assertEq(cva.balanceOf(shop), ONE);
        assertEq(cva.balanceOf(owner), 99 * ONE);
        assertEq(cva.balanceOf(address(guard)), 0, "the guard never holds the asset");
    }

    function test_refusesAPayeeWithNoCredential_andNothingMoves() public {
        apass.revoke(shop);
        _expectNotVerified(shop, CompliantPaymentGuard.Reason.NoCredential);
        _pay(shop, ONE);
        assertEq(cva.balanceOf(shop), 0);
        (,, uint256 spent,,) = guard.merchant(shop);
        assertEq(spent, 0, "a refused payment is not counted");
    }

    function test_refusesWhenThePayerLosesTheirCredential() public {
        apass.revoke(owner);
        _expectNotVerified(owner, CompliantPaymentGuard.Reason.NoCredential);
        _pay(shop, ONE);
    }

    function test_refusesACredentialThatIsNotActive() public {
        apass.issue(shop, 2, 5); // frozen
        _expectNotVerified(shop, CompliantPaymentGuard.Reason.NotActive);
        _pay(shop, ONE);
    }

    function test_refusesATierBelowTheOwnersMinimum() public {
        apass.issue(shop, 1, 2);
        _expectNotVerified(shop, CompliantPaymentGuard.Reason.TierTooLow);
        _pay(shop, ONE);

        // The owner decides what is enough.
        vm.prank(owner);
        guard.setMinTier(2);
        _pay(shop, ONE);
        assertEq(cva.balanceOf(shop), ONE);
    }

    function test_refusesWhatCleanversesPolicyRefuses() public {
        policy.freeze(shop, true);
        vm.expectRevert(
            abi.encodeWithSelector(CompliantPaymentGuard.RefusedByPolicy.selector, owner, shop)
        );
        _pay(shop, ONE);
    }

    function test_verifiedSaysWhoAndWhy() public view {
        (bool ok, uint256 tier,) = guard.verified(shop);
        assertTrue(ok);
        assertEq(tier, 5);
        (bool none,, CompliantPaymentGuard.Reason reason) = guard.verified(stranger);
        assertFalse(none);
        assertEq(uint256(reason), uint256(CompliantPaymentGuard.Reason.NoCredential));
    }

    function test_canPayMatchesPay() public {
        assertTrue(guard.canPay(shop, ONE));
        assertFalse(guard.canPay(shop, ONE + 1), "above the cap per payment");
        assertFalse(guard.canPay(stranger, ONE), "not listed");
        apass.revoke(shop);
        assertFalse(guard.canPay(shop, ONE), "no credential");
    }

    function test_onlyWorksForACompliantAsset() public {
        MockCva plain = new MockCva(policy);
        vm.expectRevert(
            abi.encodeWithSelector(CompliantPaymentGuard.NotCompliantAsset.selector, address(plain))
        );
        new CompliantPaymentGuard(owner, address(plain), address(apass), address(policy), 1);
    }

    // ── the agent's limits ──

    function test_onlyTheAgentPays() public {
        vm.prank(stranger);
        vm.expectRevert(CompliantPaymentGuard.NotAgent.selector);
        guard.pay(shop, ONE, REF);
        vm.prank(owner);
        vm.expectRevert(CompliantPaymentGuard.NotAgent.selector);
        guard.pay(shop, ONE, REF);
    }

    function test_capsPerPaymentAndPerDay() public {
        vm.expectRevert(
            abi.encodeWithSelector(CompliantPaymentGuard.PerTxCapExceeded.selector, ONE + 1, ONE)
        );
        _pay(shop, ONE + 1);

        _pay(shop, ONE);
        _pay(shop, ONE);
        _pay(shop, ONE);
        vm.expectRevert(
            abi.encodeWithSelector(
                CompliantPaymentGuard.DailyCapExceeded.selector, 4 * ONE, 3 * ONE
            )
        );
        _pay(shop, ONE);

        // A new window opens 24 hours after the first payment of the last one.
        vm.warp(block.timestamp + 1 days);
        _pay(shop, ONE);
        (,, uint256 spent,,) = guard.merchant(shop);
        assertEq(spent, ONE);
    }

    function test_pauseRevokeAndUnlistedMerchants() public {
        vm.prank(owner);
        guard.setMerchantPaused(shop, true);
        vm.expectRevert(
            abi.encodeWithSelector(CompliantPaymentGuard.MerchantIsPaused.selector, shop)
        );
        _pay(shop, ONE);

        vm.prank(owner);
        guard.revokeMerchant(shop);
        vm.expectRevert(
            abi.encodeWithSelector(CompliantPaymentGuard.MerchantNotListed.selector, shop)
        );
        _pay(shop, ONE);

        apass.issue(stranger, 1, 5);
        vm.expectRevert(
            abi.encodeWithSelector(CompliantPaymentGuard.MerchantNotListed.selector, stranger)
        );
        _pay(stranger, ONE);
    }

    function test_aRevokedAgentCannotPay() public {
        vm.prank(owner);
        guard.revokeAgentSigner();
        vm.prank(agent);
        vm.expectRevert(CompliantPaymentGuard.NotAgent.selector);
        guard.pay(shop, ONE, REF);
    }

    function test_onlyTheOwnerConfigures() public {
        vm.startPrank(stranger);
        vm.expectRevert(CompliantPaymentGuard.NotOwner.selector);
        guard.setAgentSigner(stranger);
        vm.expectRevert(CompliantPaymentGuard.NotOwner.selector);
        guard.setMerchantCap(stranger, ONE, ONE);
        vm.expectRevert(CompliantPaymentGuard.NotOwner.selector);
        guard.setMinTier(0);
        vm.stopPrank();

        vm.prank(owner);
        vm.expectRevert(CompliantPaymentGuard.InvalidCaps.selector);
        guard.setMerchantCap(shop, 2 * ONE, ONE);
    }

    function testFuzz_neverSpendsPastTheDailyCap(uint256[8] memory amounts) public {
        uint256 paid;
        for (uint256 i; i < amounts.length; ++i) {
            uint256 amount = bound(amounts[i], 1, ONE);
            vm.prank(agent);
            try guard.pay(shop, amount, REF) {
                paid += amount;
            } catch {}
        }
        assertLe(paid, 3 * ONE);
        assertEq(cva.balanceOf(shop), paid);
    }
}

/**
 * The same guard against Cleanverse's real contracts on Monad testnet. Runs
 * only with BARET_FORK_CLEANVERSE=1 and MONAD_TESTNET_RPC_URL set:
 *   BARET_FORK_CLEANVERSE=1 forge test --match-contract CompliantPaymentGuardFork -vv
 * The payer and the verified payee are wallets that hold an A-Pass there
 * (they are not ours); the unverified payee is any fresh address.
 */
contract CompliantPaymentGuardForkTest is Test {
    address constant AUSDC = 0xaC0893567D43C3E7e6e35a72803df05416C1f20D;
    address constant APASS = 0xbA82D189540CaC9DC6FF46B6837CaC1BFdEC58B9;
    address constant POLICY = 0x36489bE45fa84f70a0c2BDB11D824Be608CB12Dd;
    address constant PAYER = 0x888895E314BF33CEeBCF5320279061aed3a5E2bd;
    address constant VERIFIED = 0xC448042edaC1899B023cAa0E9dA5E4a8833de873;

    function test_settlesOnTheRealAssetOnlyBetweenVerifiedWallets() public {
        if (vm.envOr("BARET_FORK_CLEANVERSE", uint256(0)) == 0) return;
        vm.createSelectFork(vm.envString("MONAD_TESTNET_RPC_URL"));

        address agent = makeAddr("agent");
        address unverified = makeAddr("unverified");
        CompliantPaymentGuard guard = new CompliantPaymentGuard(PAYER, AUSDC, APASS, POLICY, 1);

        vm.startPrank(PAYER);
        (bool approved,) =
            AUSDC.call(abi.encodeWithSignature("approve(address,uint256)", address(guard), 5e6));
        assertTrue(approved);
        guard.setAgentSigner(agent);
        guard.setMerchantCap(VERIFIED, 1e6, 2e6);
        guard.setMerchantCap(unverified, 1e6, 2e6);
        vm.stopPrank();

        (bool ok, uint256 tier,) = guard.verified(VERIFIED);
        assertTrue(ok);
        assertGt(tier, 0);

        uint256 before = _balance(VERIFIED);
        vm.prank(agent);
        guard.pay(VERIFIED, 1e6, keccak256("fork"));
        assertEq(_balance(VERIFIED), before + 1e6);

        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(
                CompliantPaymentGuard.NotVerified.selector,
                unverified,
                CompliantPaymentGuard.Reason.NoCredential
            )
        );
        guard.pay(unverified, 1e6, keccak256("fork"));
    }

    function _balance(address who) private view returns (uint256 amount) {
        (, bytes memory out) = AUSDC.staticcall(abi.encodeWithSignature("balanceOf(address)", who));
        amount = abi.decode(out, (uint256));
    }
}
