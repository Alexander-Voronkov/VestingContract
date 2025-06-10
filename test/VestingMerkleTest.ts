import { ethers, ignition } from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import VestingMerkleModule from "../ignition/modules/VestingMerkleModule";
import { VestingMerkle } from "../typechain-types";

describe("VestingMerkle", () => {
  let cliffDuration: number;
  let merkleRoot: string;

  async function deployVestingMapping() {
      const cliff = (await time.latest()) + cliffDuration;

      const [owner, ...otherAccounts] = await ethers.getSigners();

      console.log(otherAccounts.length);

      console.log('start generate');
      const rewards = Array.from({ length: 500 }, () => BigInt((Math.random() * 10).toFixed(0)) * ethers.parseEther("10"));
      console.log('end generate');

      const { vestingMapping } = await ignition.deploy(VestingMerkleModule(cliff, merkleRoot));

      const typedVestingMapping = vestingMapping as unknown as VestingMerkle;

      return { vestingMapping: typedVestingMapping, owner, otherAccounts };  
  }

  it("should allow valid claim", async () => {
    const [owner, ...other] = await ethers.getSigners();
    const amount = ethers.parseEther("50");

    const leaves = other.map((user) =>
      keccak256(ethers.solidityPacked(["address", "uint256"], [user.address, amount]))
    );

    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const merkleRoot = tree.getHexRoot();

    const { vestingMerkle } = await loadFixture(deployVestingMerkle);
    const cliffDuration = 0;
    const contract = await VestingMerkle.deploy(cliffDuration, merkleRoot, { value: ethers.parseEther("2") });

    const cliff = await contract.cliff();
    const contractBalanceBefore = await ethers.provider.getBalance(contract.target);
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const userBalanceBefore = await ethers.provider.getBalance(other[0].address);

    console.log("cliff date:", new Date(Number(cliff) * 1000));
    console.log("contract balance before claim:", ethers.formatEther(contractBalanceBefore), "ETH");
    console.log("owner balance before claim:", ethers.formatEther(ownerBalanceBefore), "ETH");
    console.log("user balance before claim:", ethers.formatEther(userBalanceBefore), "ETH");

    const leaf = keccak256(ethers.solidityPacked(["address", "uint256"], [other[0].address, amount]));
    const proof = tree.getHexProof(leaf);

    await expect(contract.connect(other[0]).claim(amount, proof)).to.changeEtherBalance(other[0], amount);

    const contractBalanceAfterClaim = await ethers.provider.getBalance(contract.target);
    const userBalanceAfterClaim = await ethers.provider.getBalance(other[0].address);

    console.log("contract balance after claim:", ethers.formatEther(contractBalanceAfterClaim), "ETH");
    console.log("user balance after claim:", ethers.formatEther(userBalanceAfterClaim), "ETH");

    await expect(contract.connect(other[0]).claim(amount, proof)).to.be.revertedWith("Already claimed");
  });
});