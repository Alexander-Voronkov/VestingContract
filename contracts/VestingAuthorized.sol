//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VestingAuthorized is Ownable {
    using ECDSA for bytes32;

    address public immutable signer; 
    uint256 public immutable cliff;  
    mapping(address => bool) public claimed;

    constructor(address _signer, uint256 _cliff) Ownable(msg.sender) payable {
        require(_cliff > 0 && _cliff > block.timestamp, 'Wring cliff');
        require(msg.value > 0, "Need to fund ETH");
        signer = _signer;
        cliff = _cliff;
    }

    function claim(uint256 amount, bytes memory signature) external {
        require(block.timestamp >= cliff, "Cliff not reached");
        require(!claimed[msg.sender], "Already claimed");

        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, amount));
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        require(ethSignedMessageHash.recover(signature) == signer, "Invalid signature");

        claimed[msg.sender] = true;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "ETH transfer failed");
    }

    function recoverUnclaimed() external onlyOwner {
        require(block.timestamp >= cliff + 365 days, "Wait 1 year after cliff");

        (bool sent, ) = payable(owner()).call{value: address(this).balance}("");
        require(sent, "ETH recovery failed");
    }

    receive() external payable {}
}
