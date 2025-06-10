import { ethers, ignition } from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import VestingAuthorizedModule from "../ignition/modules/VestingAuthorizedModule";
import { VestingAuthorized } from "../typechain-types";
import { Signer } from "ethers";

describe("VestingAuthorized", () => {
  const cliffDuration = 2 * 365 * 24 * 60 * 60; // 2 yrs
  const amountToVest = ethers.parseEther("1000");

  async function deployVestingAuthorizedFixture() {
    const [owner, signer, user, other] = await ethers.getSigners();

    const cliff = (await time.latest()) + cliffDuration;

    const { vestingAuthorized } = await ignition.deploy(
      VestingAuthorizedModule(cliff, signer.address, amountToVest)
    );

    const block = await ethers.provider.getBlock("latest");
    const txs = await Promise.all(
      block!.transactions.map((txHash: string) => ethers.provider.getTransaction(txHash))
    );
    const initializeTx = txs.find(tx => tx && tx.to === null);
    if (initializeTx) {
      const initializeReceipt = await ethers.provider.getTransactionReceipt(initializeTx.hash);
      const gasPrice = initializeReceipt!.gasPrice;
      const ethPrice = 2800;
      const initGasUsed = initializeReceipt!.gasUsed;
      const initCostEth = Number(initGasUsed * gasPrice) / 1e18;
      const initCostUsd = initCostEth * ethPrice;
      console.log(`VestingAuthorized: Initialize gas used: ${initGasUsed}`);
      console.log(`VestingAuthorized: Initialize cost: ${initCostEth} ETH ($${initCostUsd.toFixed(2)})`);
    }

    return {
      vestingAuthorized: vestingAuthorized as unknown as VestingAuthorized,
      owner,
      signer,
      user,
      other,
    };
  }

  async function signClaimMessage(
    recipient: string,
    amount: bigint,
    signer: Signer
  ): Promise<string> {
    const msgHash = ethers.solidityPackedKeccak256(
      ["address", "uint256"],
      [recipient, amount]
    );
    return await signer.signMessage(ethers.getBytes(msgHash));
  }

  it("should allow valid claim", async () => {
    const { vestingAuthorized, signer, user } = await loadFixture(deployVestingAuthorizedFixture);

    await time.increase(cliffDuration + 1);

    const signature = await signClaimMessage(await user.getAddress(), ethers.parseEther('1'), signer);

    const before = await ethers.provider.getBalance(await user.getAddress());

    const tx = await vestingAuthorized.connect(user).claim(ethers.parseEther('1'), signature);
    const receipt = await tx.wait();

    const after = await ethers.provider.getBalance(await user.getAddress());
    expect(after).to.be.gt(before);
  });

  it("should not allow claim before cliff", async () => {
    const { vestingAuthorized, signer, user } = await loadFixture(deployVestingAuthorizedFixture);

    const signature = await signClaimMessage(await user.getAddress(), ethers.parseEther('1'), signer);

    await expect(vestingAuthorized.connect(user).claim(ethers.parseEther('1'), signature)).to.be.revertedWith("Cliff not reached");
  });

  it("should reject double claim", async () => {
    const { vestingAuthorized, signer, user } = await loadFixture(deployVestingAuthorizedFixture);

    await time.increase(cliffDuration + 1);
    const signature = await signClaimMessage(await user.getAddress(), ethers.parseEther('1'), signer);

    await vestingAuthorized.connect(user).claim(ethers.parseEther('1'), signature);
    await expect(vestingAuthorized.connect(user).claim(ethers.parseEther('1'), signature)).to.be.revertedWith("Already claimed");
  });

  it("should reject invalid signature", async () => {
    const { vestingAuthorized, other, user } = await loadFixture(deployVestingAuthorizedFixture);

    await time.increase(cliffDuration + 1);
    const fakeSig = await signClaimMessage(await user.getAddress(), ethers.parseEther('1'), other); // wrong signer

    await expect(vestingAuthorized.connect(user).claim(ethers.parseEther('1'), fakeSig)).to.be.revertedWith("Invalid signature");
  });

  it("should allow owner to recover unclaimed ETH after 1 year post-cliff", async () => {
    const { vestingAuthorized, owner } = await loadFixture(deployVestingAuthorizedFixture);

    await time.increase(cliffDuration + 365 * 24 * 60 * 60); // +1 year

    const before = await ethers.provider.getBalance(await owner.getAddress());

    const tx = await vestingAuthorized.connect(owner).recoverUnclaimed();
    await tx.wait();

    const after = await ethers.provider.getBalance(await owner.getAddress());
    expect(after).to.be.gt(before);
  });
});
