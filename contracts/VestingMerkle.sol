//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VestingMerkle is ReentrancyGuard, Ownable {
    uint256 public immutable cliff;
    bytes32 public immutable merkleRoot;

    mapping(address => bool) public claimed;

    constructor(uint256 _cliff, bytes32 _merkleRoot) Ownable(msg.sender) payable {
        require(_cliff > 0 && _cliff > block.timestamp, 'Wrong cliff');
        cliff = _cliff;
        merkleRoot = _merkleRoot;
        require(msg.value > 0, "Must send ETH for vesting");
    }

    function claim(uint256 amount, bytes32[] calldata proof) external {
        require(block.timestamp >= cliff, "Cliff not reached");
        require(!claimed[msg.sender], "Already claimed");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "Invalid proof");

        claimed[msg.sender] = true;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "ETH transfer failed");
    }

    function recoverUnclaimed() external onlyOwner {
        require(block.timestamp >= cliff + 365 days, "Wait 1 year after cliff");

        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {}
}