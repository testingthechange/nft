// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice BETA-only album NFT prototype for Polygon Amoy (chain 80002).
/// @dev Deploy manually to Amoy after review. No server or frontend mint path.
///      Never put buyer details, wallet secrets, or payment information on-chain.
contract AjineBetaAlbumNFT is ERC721, Ownable {
    uint256 public nextTokenId = 1;
    mapping(bytes32 => uint256) public tokenForCopy;
    mapping(uint256 => bytes32) public copyKeyForToken;

    event AlbumCopyMinted(
        bytes32 indexed copyKey,
        uint256 indexed tokenId,
        address indexed recipient
    );

    constructor(address initialOwner)
        ERC721("AJINE Beta Album", "AJINEB")
        Ownable(initialOwner)
    {}

    /// @notice Compute the canonical identity of an album copy.
    /// @dev Uses abi.encode (NOT encodePacked) to prevent tuple ambiguity.
    function albumCopyKey(string calldata albumId, string calldata copyNumber)
        public pure returns (bytes32)
    {
        require(bytes(albumId).length > 0 && bytes(copyNumber).length > 0, "empty_copy_identity");
        return keccak256(abi.encode(albumId, copyNumber));
    }

    /// @notice Mint one testnet token for one album-copy identity.
    /// @dev One copy may be minted at most once, including after a future transfer.
    ///      No burn operation is implemented in this beta prototype.
    function mintBetaCopy(address recipient, string calldata albumId, string calldata copyNumber)
        external onlyOwner returns (uint256 tokenId)
    {
        require(recipient != address(0), "invalid_recipient");
        bytes32 copyKey = albumCopyKey(albumId, copyNumber);
        require(tokenForCopy[copyKey] == 0, "copy_already_minted");

        tokenId = nextTokenId++;
        tokenForCopy[copyKey] = tokenId;
        copyKeyForToken[tokenId] = copyKey;
        // Set provenance mapping before receiver hook to avoid reentrant duplicate issuance.
        _safeMint(recipient, tokenId);
        emit AlbumCopyMinted(copyKey, tokenId, recipient);
    }
}
