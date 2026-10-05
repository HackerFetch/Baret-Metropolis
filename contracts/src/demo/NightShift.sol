// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title NightShift
 * @notice The PixelDrop showcase collection on Monad testnet: a minimal
 *         ERC-721. 0.01 MON a piece, ten per wallet. Worth nothing.
 */
contract NightShift {
    string public constant name = "Night Shift";
    string public constant symbol = "NIGHT";
    uint256 public constant PRICE = 0.01 ether;
    uint256 public constant PER_WALLET = 10;

    uint256 public totalSupply;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public minted;
    mapping(uint256 => address) public getApproved;
    mapping(address => mapping(address => bool)) public isApprovedForAll;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    error WrongPayment();
    error WalletLimit();
    error NotAuthorized();
    error NoSuchToken();
    error ZeroCount();

    function mint(uint256 count) external payable {
        if (count == 0) revert ZeroCount();
        if (msg.value != count * PRICE) revert WrongPayment();
        if (minted[msg.sender] + count > PER_WALLET) revert WalletLimit();
        minted[msg.sender] += count;
        for (uint256 i = 0; i < count; ++i) {
            uint256 id = ++totalSupply;
            _owners[id] = msg.sender;
            emit Transfer(address(0), msg.sender, id);
        }
        balanceOf[msg.sender] += count;
    }

    function ownerOf(uint256 tokenId) public view returns (address holder) {
        holder = _owners[tokenId];
        if (holder == address(0)) revert NoSuchToken();
    }

    function approve(address to, uint256 tokenId) external {
        address holder = ownerOf(tokenId);
        if (msg.sender != holder && !isApprovedForAll[holder][msg.sender]) revert NotAuthorized();
        getApproved[tokenId] = to;
        emit Approval(holder, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        isApprovedForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        address holder = ownerOf(tokenId);
        if (holder != from) revert NotAuthorized();
        if (
            msg.sender != holder && getApproved[tokenId] != msg.sender
                && !isApprovedForAll[holder][msg.sender]
        ) revert NotAuthorized();
        delete getApproved[tokenId];
        balanceOf[from] -= 1;
        balanceOf[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == 0x80ac58cd || id == 0x01ffc9a7; // ERC-721, ERC-165
    }
}
