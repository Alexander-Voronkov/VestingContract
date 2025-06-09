pragma solidity 0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VestingMapping is ReentrancyGuard, Initializable, Ownable {
    uint256 public cliff;
    mapping(address => uint256) public cliffRewards;

    constructor() Ownable(msg.sender) {}

    function initialize(
        uint256 _cliff,
        address[] memory _recipients,
        uint256[] memory _rewards) public payable initializer onlyOwner {
            
        require(_cliff > block.timestamp, "Invalid cliff");
        cliff = _cliff;

        for (uint256 i = 0; i < _recipients.length; i++) {
            cliffRewards[_recipients[i]] = _rewards[i];
        }
    }

    function claim() external nonReentrant {
        require(block.timestamp >= cliff, "Cliff not reached");
        require(cliffRewards[msg.sender] > 0, "No rewards to claim");

        uint256 unreleased = cliffRewards[msg.sender];
        cliffRewards[msg.sender] = 0;

        payable(msg.sender).transfer(unreleased);
    }
}