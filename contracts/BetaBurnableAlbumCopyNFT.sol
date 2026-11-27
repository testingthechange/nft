// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {BetaAlbumCopyNFT} from "./BetaAlbumCopyNFT.sol";

// Separate Amoy beta deployment; never replaces an existing NFT contract.
contract BetaBurnableAlbumCopyNFT is BetaAlbumCopyNFT {
    constructor(address initialOwner) BetaAlbumCopyNFT(initialOwner) {}
    function burnBetaCopy(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "token owner only");
        _burn(tokenId);
        // Original copy key remains permanently reserved by the base contract.
    }
}
