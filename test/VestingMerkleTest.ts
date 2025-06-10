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
  let amountToSend: bigint;

  async function deployVestingMerkle() {
      const [owner, ...otherAccounts] = await ethers.getSigners();

      const cliff = (await time.latest()) + cliffDuration;

      const { vestingMerkle } = await ignition.deploy(VestingMerkleModule(cliff, merkleRoot, amountToSend));

      const typedVestingMapping = vestingMerkle as unknown as VestingMerkle;

      return { vestingMerkle: typedVestingMapping, owner, otherAccounts };  
  }

  it("should allow valid claim", async function () {

    this.timeout(1000000);

    const [owner, ...other] = await ethers.getSigners();
    const amount = ethers.parseEther("50");

    const leaves = other.map((user) =>
      keccak256(ethers.solidityPacked(["address", "uint256"], [user.address, amount]))
    );
    
    cliffDuration = 365 * 24 * 60 * 60 * 2;

    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    merkleRoot = tree.getHexRoot();

    amountToSend = ethers.parseEther('1000');

    const { vestingMerkle } = await loadFixture(deployVestingMerkle);

    const block = await ethers.provider.getBlock("latest");
    const txs = await Promise.all(
        block!.transactions.map((txHash: string) => ethers.provider.getTransaction(txHash))
    );

    const initializeTx = txs.find(tx => tx && tx.to === null);

    let initializeReceipt = await ethers.provider.getTransactionReceipt(initializeTx!.hash);

    const gasPrice = initializeReceipt!.gasPrice;
    const ethPrice = 2800;

    const initGasUsed = initializeReceipt!.gasUsed;
    const initCostEth = Number(initGasUsed * gasPrice) / 1e18;
    const initCostUsd = initCostEth * ethPrice;
    console.log(`Initialize gas used: ${initGasUsed}`);
    console.log(`Initialize cost: ${initCostEth} ETH ($${initCostUsd.toFixed(2)})`);

    const cliff = await vestingMerkle.cliff();
    const contractBalanceBefore = await ethers.provider.getBalance(vestingMerkle);
    const ownerBalanceBefore = await ethers.provider.getBalance(owner);
    const userBalanceBefore = await ethers.provider.getBalance(other[0]);

    console.log("cliff date:", new Date(Number(cliff) * 1000));
    console.log("contract balance before claim:", ethers.formatEther(contractBalanceBefore), "ETH");
    console.log("owner balance before claim:", ethers.formatEther(ownerBalanceBefore), "ETH");
    console.log("user balance before claim:", ethers.formatEther(userBalanceBefore), "ETH");

    const leaf = keccak256(ethers.solidityPacked(["address", "uint256"], [other[0].address, amount]));
    const proof = tree.getHexProof(leaf);

    await expect(vestingMerkle.connect(other[0]).claim(amount, proof)).to.reverted;

    await time.increase(cliffDuration);

    await expect(vestingMerkle.connect(other[0]).claim(amount, proof)).to.changeEtherBalance(other[0], amount);

    const contractBalanceAfterClaim = await ethers.provider.getBalance(vestingMerkle);
    const userBalanceAfterClaim = await ethers.provider.getBalance(other[0].address);

    console.log("contract balance after claim:", ethers.formatEther(contractBalanceAfterClaim), "ETH");
    console.log("user balance after claim:", ethers.formatEther(userBalanceAfterClaim), "ETH");

    await expect(vestingMerkle.connect(other[0]).claim(amount, proof)).to.be.revertedWith("Already claimed");
  });
});