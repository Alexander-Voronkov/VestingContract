import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { expect } from "chai";

describe("VestingMerkle", () => {
  it("should allow valid claim", async () => {
    const [owner, user] = await ethers.getSigners();
    const amount = ethers.parseEther("1");

    const leaves = [
      keccak256(ethers.solidityPacked(["address", "uint256"], [owner.address, amount])),
      keccak256(ethers.solidityPacked(["address", "uint256"], [user.address, amount])),
    ];

    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const merkleRoot = tree.getHexRoot();

    const VestingMerkle = await ethers.getContractFactory("VestingMerkle");
    const cliffDuration = 0;
    const contract = await VestingMerkle.deploy(cliffDuration, merkleRoot, { value: ethers.parseEther("2") });

    const cliff = await contract.cliff();
    const contractBalanceBefore = await ethers.provider.getBalance(contract.target);
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const userBalanceBefore = await ethers.provider.getBalance(user.address);

    console.log("cliff date:", new Date(Number(cliff) * 1000));
    console.log("contract balance before claim:", ethers.formatEther(contractBalanceBefore), "ETH");
    console.log("owner balance before claim:", ethers.formatEther(ownerBalanceBefore), "ETH");
    console.log("user balance before claim:", ethers.formatEther(userBalanceBefore), "ETH");

    const leaf = keccak256(ethers.solidityPacked(["address", "uint256"], [user.address, amount]));
    const proof = tree.getHexProof(leaf);

    await expect(contract.connect(user).claim(amount, proof)).to.changeEtherBalance(user, amount);

    const contractBalanceAfterClaim = await ethers.provider.getBalance(contract.target);
    const userBalanceAfterClaim = await ethers.provider.getBalance(user.address);

    console.log("contract balance after claim:", ethers.formatEther(contractBalanceAfterClaim), "ETH");
    console.log("user balance after claim:", ethers.formatEther(userBalanceAfterClaim), "ETH");

    await expect(contract.connect(user).claim(amount, proof)).to.be.revertedWith("Already claimed");
  });
});