// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @dev The part of a Cleanverse Verified Asset (CVA) the guard uses.
interface ICompliantAsset {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @dev Cleanverse A-Pass: the Verified Identity (CVI) credential, one per wallet.
interface IAPass {
    function balanceOf(address account) external view returns (uint256);
}

/// @dev Cleanverse's policy contract: what a compliant asset asks before it moves.
interface ICompliancePolicy {
    function isTokenRegistered(address token) external view returns (bool);

    function canTransfer(address token, address from, address to, uint256 amount)
        external
        view
        returns (bool);
}

/**
 * @title Baret CompliantPaymentGuard
 * @notice Agent payments in a Cleanverse Verified Asset, settled only between
 *         verified identities.
 *
 * The owner keeps the asset in their own wallet and gives this contract an
 * allowance. They list merchants with a cap per payment and a cap per day,
 * and name one agent. The agent calls {pay}; the owner signs nothing per
 * payment. Before any value moves, {pay} reads the Cleanverse A-Pass of both
 * parties on-chain: the payer (the owner) and the payee (the merchant) must
 * each hold an active credential of at least the owner's minimum tier, and
 * Cleanverse's policy must allow the transfer. Only then does the asset move,
 * straight from the owner to the merchant.
 *
 * There is no other way for this contract to move the asset. Removing the
 * identity checks would not open one either: the asset asks the same policy
 * in its own transfer. What the guard adds on top of the asset is a decision
 * that can be read (which party, which reason, as a typed error instead of a
 * bare revert), the owner's own minimum tier, the spending caps of an agent,
 * and a settlement record that names both credentials.
 *
 * The use case is the Travel Rule for autonomous payments: an agent may pay
 * only when originator and beneficiary are both identified, and every
 * settlement logs who they were (by credential, never by personal data).
 *
 * The daily cap counts a fixed 24 hours from the first payment of a window;
 * the next payment after that starts a new window.
 */
contract CompliantPaymentGuard {
    uint64 public constant DAY = 86_400;

    /// @dev A-Pass `STATUS_ACTIVE`.
    uint256 private constant STATUS_ACTIVE = 1;
    /// @dev The A-Pass credential record of a wallet: (status, tier, ...). It
    ///      reverts for a wallet with no credential.
    bytes4 private constant CREDENTIAL_SELECTOR = 0x6a069f61;

    /// Why a party is not accepted as a verified identity.
    enum Reason {
        NoCredential,
        NotActive,
        TierTooLow
    }

    struct Merchant {
        uint256 perTxCap;
        uint256 dailyCap;
        uint256 daySpent;
        uint64 dayStart;
        bool active;
        bool paused;
    }

    address public immutable owner;
    ICompliantAsset public immutable asset;
    IAPass public immutable apass;
    ICompliancePolicy public immutable policy;

    address public agent;
    /// The lowest credential tier the owner accepts, for themselves and for a merchant.
    uint256 public minTier;

    mapping(address merchant => Merchant) private _merchants;
    uint256 private _lock = 1;

    error NotOwner();
    error NotAgent();
    error ZeroAddress();
    error ZeroAmount();
    error InvalidCaps();
    error NotCompliantAsset(address asset);
    error MerchantNotListed(address merchant);
    error MerchantIsPaused(address merchant);
    error PerTxCapExceeded(uint256 amount, uint256 cap);
    error DailyCapExceeded(uint256 wouldSpend, uint256 cap);
    /// A party to the payment is not a verified identity.
    error NotVerified(address party, Reason reason);
    /// Cleanverse's policy refuses this transfer (a frozen wallet, a paused asset, a rule).
    error RefusedByPolicy(address from, address to);
    error TransferFailed();
    error Reentrancy();

    event AgentSet(address indexed agent);
    event AgentRevoked(address indexed agent);
    event MinTierSet(uint256 minTier);
    event MerchantCapSet(address indexed merchant, uint256 perTxCap, uint256 dailyCap);
    event MerchantPaused(address indexed merchant, bool paused);
    event MerchantRevoked(address indexed merchant);
    /// One settlement between two verified identities. The credential ids are
    /// the A-Pass token ids of the payer and the payee.
    event Settled(
        address indexed merchant,
        address indexed agent,
        uint256 amount,
        bytes32 indexed ref,
        uint256 payerCredential,
        uint256 payeeCredential,
        uint256 payerTier,
        uint256 payeeTier
    );

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    /// @param asset_ A Cleanverse Verified Asset: the policy must know it.
    constructor(address owner_, address asset_, address apass_, address policy_, uint256 minTier_) {
        if (owner_ == address(0) || asset_ == address(0)) revert ZeroAddress();
        if (apass_ == address(0) || policy_ == address(0)) revert ZeroAddress();
        // The guard exists for compliant assets only: an ordinary token has no gate to stand behind.
        if (!ICompliancePolicy(policy_).isTokenRegistered(asset_)) {
            revert NotCompliantAsset(asset_);
        }
        owner = owner_;
        asset = ICompliantAsset(asset_);
        apass = IAPass(apass_);
        policy = ICompliancePolicy(policy_);
        minTier = minTier_;
        emit MinTierSet(minTier_);
    }

    // ── owner ──

    function setAgentSigner(address agent_) external onlyOwner {
        if (agent_ == address(0)) revert ZeroAddress();
        agent = agent_;
        emit AgentSet(agent_);
    }

    function revokeAgentSigner() external onlyOwner {
        emit AgentRevoked(agent);
        agent = address(0);
    }

    function setMinTier(uint256 minTier_) external onlyOwner {
        minTier = minTier_;
        emit MinTierSet(minTier_);
    }

    /// Lists a merchant or changes its caps. A cap per payment above the daily cap can never be used.
    function setMerchantCap(address merchant_, uint256 perTxCap, uint256 dailyCap)
        external
        onlyOwner
    {
        if (merchant_ == address(0)) revert ZeroAddress();
        if (perTxCap == 0 || dailyCap == 0 || perTxCap > dailyCap) revert InvalidCaps();
        Merchant storage m = _merchants[merchant_];
        m.perTxCap = perTxCap;
        m.dailyCap = dailyCap;
        m.active = true;
        emit MerchantCapSet(merchant_, perTxCap, dailyCap);
    }

    function setMerchantPaused(address merchant_, bool paused) external onlyOwner {
        Merchant storage m = _merchants[merchant_];
        if (!m.active) revert MerchantNotListed(merchant_);
        m.paused = paused;
        emit MerchantPaused(merchant_, paused);
    }

    function revokeMerchant(address merchant_) external onlyOwner {
        if (!_merchants[merchant_].active) revert MerchantNotListed(merchant_);
        delete _merchants[merchant_];
        emit MerchantRevoked(merchant_);
    }

    // ── agent ──

    /**
     * @notice Pays `amount` of the asset from the owner to a listed merchant.
     * @dev Order: the caps, then both identities, then Cleanverse's policy,
     *      then the state change, then the transfer. Nothing moves and nothing
     *      is recorded unless every check passed.
     */
    function pay(address merchant_, uint256 amount, bytes32 ref) external nonReentrant {
        if (msg.sender != agent) revert NotAgent();
        if (amount == 0) revert ZeroAmount();
        Merchant storage m = _merchants[merchant_];
        if (!m.active) revert MerchantNotListed(merchant_);
        if (m.paused) revert MerchantIsPaused(merchant_);
        if (amount > m.perTxCap) revert PerTxCapExceeded(amount, m.perTxCap);

        bool fresh = block.timestamp >= uint256(m.dayStart) + DAY;
        uint256 spent = fresh ? amount : m.daySpent + amount;
        if (spent > m.dailyCap) revert DailyCapExceeded(spent, m.dailyCap);

        // Identity before value: the payer and the payee, read from the chain now.
        uint256 payerTier = _requireVerified(owner);
        uint256 payeeTier = _requireVerified(merchant_);
        if (!_policyAllows(owner, merchant_, amount)) revert RefusedByPolicy(owner, merchant_);

        if (fresh) m.dayStart = uint64(block.timestamp);
        m.daySpent = spent;

        if (!asset.transferFrom(owner, merchant_, amount)) revert TransferFailed();
        emit Settled(
            merchant_,
            msg.sender,
            amount,
            ref,
            uint256(uint160(owner)),
            uint256(uint160(merchant_)),
            payerTier,
            payeeTier
        );
    }

    // ── views ──

    /// Whether `party` is a verified identity for this guard, with its tier, or the reason it is not.
    function verified(address party) public view returns (bool ok, uint256 tier, Reason reason) {
        if (apass.balanceOf(party) == 0) return (false, 0, Reason.NoCredential);
        (bool read, bytes memory record) =
            address(apass).staticcall(abi.encodeWithSelector(CREDENTIAL_SELECTOR, party));
        // A record that cannot be read is no credential: fail closed.
        if (!read || record.length < 64) return (false, 0, Reason.NoCredential);
        (uint256 status, uint256 tier_) = abi.decode(record, (uint256, uint256));
        if (status != STATUS_ACTIVE) return (false, tier_, Reason.NotActive);
        if (tier_ < minTier) return (false, tier_, Reason.TierTooLow);
        return (true, tier_, Reason.NoCredential);
    }

    /// Whether a payment of `amount` to `merchant_` would settle now, for an agent to ask first.
    function canPay(address merchant_, uint256 amount) external view returns (bool) {
        Merchant storage m = _merchants[merchant_];
        if (amount == 0 || !m.active || m.paused || amount > m.perTxCap) return false;
        bool fresh = block.timestamp >= uint256(m.dayStart) + DAY;
        if ((fresh ? amount : m.daySpent + amount) > m.dailyCap) return false;
        (bool payer,,) = verified(owner);
        (bool payee,,) = verified(merchant_);
        return payer && payee && _policyAllows(owner, merchant_, amount);
    }

    function merchant(address merchant_)
        external
        view
        returns (uint256 perTxCap, uint256 dailyCap, uint256 spentToday, bool active, bool paused)
    {
        Merchant storage m = _merchants[merchant_];
        bool fresh = block.timestamp >= uint256(m.dayStart) + DAY;
        return (m.perTxCap, m.dailyCap, fresh ? 0 : m.daySpent, m.active, m.paused);
    }

    // ── internals ──

    function _requireVerified(address party) private view returns (uint256 tier) {
        (bool ok, uint256 tier_, Reason reason) = verified(party);
        if (!ok) revert NotVerified(party, reason);
        return tier_;
    }

    /// Cleanverse's own answer for this transfer. The policy reverts for some refusals; both read as no.
    function _policyAllows(address from, address to, uint256 amount) private view returns (bool) {
        try policy.canTransfer(address(asset), from, to, amount) returns (bool allowed) {
            return allowed;
        } catch {
            return false;
        }
    }
}
