pragma solidity 0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract VestingMerkle is ReentrancyGuard {
    address public immutable owner;
    uint256 public immutable cliff;
    bytes32 public immutable merkleRoot;

    mapping(address => bool) public claimed;

    constructor(uint256 _cliffDuration, bytes32 _merkleRoot) payable {
        owner = msg.sender;
        cliff = block.timestamp + _cliffDuration;
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

    function recoverUnclaimed() external {
        require(msg.sender == owner, "Not owner");
        require(block.timestamp >= cliff + 365 days, "Wait 1 year after cliff");

        (bool sent, ) = payable(owner).call{value: address(this).balance}("");
        require(sent, "ETH transfer failed");
    }

    receive() external payable {}
}