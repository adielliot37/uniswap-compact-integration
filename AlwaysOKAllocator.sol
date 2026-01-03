// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title AlwaysOKAllocator
 * @notice A simple allocator that always approves transfers and claims
 * @dev This is for testing purposes only - always approves everything
 */
interface IAllocator {
    function attest(address operator, address from, address to, uint256 id, uint256 amount) 
        external returns (bytes4);
    
    function authorizeClaim(
        bytes32 claimHash,
        address arbiter,
        address sponsor,
        uint256 nonce,
        uint256 expires,
        uint256[2][] calldata idsAndAmounts,
        bytes calldata allocatorData
    ) external returns (bytes4);
    
    function isClaimAuthorized(
        bytes32 claimHash,
        address arbiter,
        address sponsor,
        uint256 nonce,
        uint256 expires,
        uint256[2][] calldata idsAndAmounts,
        bytes calldata allocatorData
    ) external view returns (bool);
}

contract AlwaysOKAllocator is IAllocator {
    // Function selector for attest: 0x1a808f91
    bytes4 public constant ATTEST_SELECTOR = IAllocator.attest.selector;
    
    // Function selector for authorizeClaim: 0x7bb023f7
    bytes4 public constant AUTHORIZE_CLAIM_SELECTOR = IAllocator.authorizeClaim.selector;
    
    /**
     * @notice Always approves transfers
     * @return The attest function selector
     */
    function attest(address, address, address, uint256, uint256) 
        external pure override returns (bytes4) {
        return ATTEST_SELECTOR;
    }
    
    /**
     * @notice Always approves claims
     * @return The authorizeClaim function selector
     */
    function authorizeClaim(
        bytes32,
        address,
        address,
        uint256,
        uint256,
        uint256[2][] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return AUTHORIZE_CLAIM_SELECTOR;
    }
    
    /**
     * @notice Always returns true for claim authorization checks
     * @return Always returns true
     */
    function isClaimAuthorized(
        bytes32,
        address,
        address,
        uint256,
        uint256,
        uint256[2][] calldata,
        bytes calldata
    ) external pure override returns (bool) {
        return true;
    }
}

