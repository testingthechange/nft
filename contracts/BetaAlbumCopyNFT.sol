// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @notice AJINE BETA on Polygon Amoy ONLY.
 * Each test album ID + copy number can be minted at most once.
 * No personal data, payment information, or buyer identifiers are stored on-chain.
 * Mint is restricted to the deployer-designated owner, never browser callers.
 *
 * The key remains reserved even if a token is later transferred or burned.
 * Production mint authorization and burn/key contracts are NOT implemented here.
 */
contract BetaAlbumCopyNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId = 1;
    mapping(bytes32 => uint256) private _tokenByCopy;
    mapping(uint256 => bytes32) public copyKeyOfToken;

    event BetaAlbumCopyMinted(bytes32 indexed copyKey, uint256 indexed tokenId, address indexed recipient);

    constructor(address initialOwner)
        ERC721("AJINE BETA Album Copy", "AJBETA")
        Ownable(initialOwner)
    {}

    function copyKey(string memory albumId, string memory copyNumber)
        public pure returns (bytes32)
    {
        require(bytes(albumId).length != 0 && bytes(copyNumber).length != 0, "empty copy identity");
        return keccak256(abi.encode(albumId, copyNumber));
    }

    function tokenIdForCopy(string calldata albumId, string calldata copyNumber)
        external view returns (uint256)
    {
        return _tokenByCopy[copyKey(albumId, copyNumber)]; // 0 = not minted
    }

    function mintBetaCopy(
        address recipient,
        string calldata albumId,
        string calldata copyNumber,
        string calldata metadataUri
    ) external onlyOwner returns (uint256 tokenId) {
        require(recipient != address(0), "invalid recipient");
        require(bytes(metadataUri).length != 0, "missing metadata");
        // Extra guardrail: this contract only accepts named beta fixtures.
        require(_startsWith(albumId, "ALBUM-BETA-"), "beta album only");
        require(_startsWith(copyNumber, "COPY-BETA-"), "beta copy only");
        bytes32 key = copyKey(albumId, copyNumber);
        require(_tokenByCopy[key] == 0, "copy already minted");

        tokenId = _nextTokenId++;
        _tokenByCopy[key] = tokenId;
        copyKeyOfToken[tokenId] = key;
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, metadataUri);
        emit BetaAlbumCopyMinted(key, tokenId, recipient);
    }

    function _startsWith(string calldata value, string memory prefix)
        private pure returns (bool)
    {
        bytes calldata raw = bytes(value);
        bytes memory start = bytes(prefix);
        if (raw.length < start.length) return false;
        for (uint256 i = 0; i < start.length; ++i) {
            if (raw[i] != start[i]) return false;
        }
        return true;
    }
}
