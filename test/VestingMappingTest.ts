import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, ignition, network } from "hardhat";
import VestingMappingModule from "../ignition/modules/VestingMappingModule";
import type { VestingMapping } from "../typechain-types";

describe("VestingMapping", () => {

    let cliffDuration: number;

    async function deployVestingMapping() {
        const cliff = (await time.latest()) + cliffDuration;

        const [owner, ...otherAccounts] = await ethers.getSigners();

        console.log(otherAccounts.length);

        console.log('start generate');
        const rewards = Array.from({ length: 500 }, () => BigInt((Math.random() * 10).toFixed(0)) * ethers.parseEther("10"));
        console.log('end generate');

        const { vestingMapping } = await ignition.deploy(VestingMappingModule(cliff, otherAccounts.slice(0, 500).map(x => x.address), rewards));

        const typedVestingMapping = vestingMapping as unknown as VestingMapping;

        return { vestingMapping: typedVestingMapping, owner, otherAccounts };  
    }

    it('should deploy and initialize VestingMapping contract', async function () {

        cliffDuration = 365 * 24 * 60 * 60 * 2;

        const { vestingMapping, owner, otherAccounts } = await loadFixture(deployVestingMapping);

        console.log('cliff', new Date(Number(await vestingMapping.cliff()) * 1000));
        console.log('time', new Date(Number(await time.latest()) * 1000));

        await expect(vestingMapping.connect(otherAccounts[0]).claim()).reverted;

        await time.increase(cliffDuration);

        console.log('time after mine', new Date(Number(await time.latest()) * 1000));

        console.log('contract balance ', ethers.formatEther(await ethers.provider.getBalance(vestingMapping)) + ' ETH');
        console.log('can be claimed ', ethers.formatEther(await vestingMapping.cliffRewards(otherAccounts[0])) + ' ETH');

        await expect(vestingMapping.connect(otherAccounts[0]).claim()).not.reverted;
        console.log('contract balance after claim', ethers.formatEther(await ethers.provider.getBalance(vestingMapping)) + ' ETH');
        console.log('my balance after claim', ethers.formatEther(await ethers.provider.getBalance(otherAccounts[0])) + ' ETH');
    });

});