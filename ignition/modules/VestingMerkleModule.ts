import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "hardhat";

const VestingMerkleModule = (cliffValue: number, merkleRoot: string) =>
  buildModule("VestingMerkleModule", (m) => {

    const cliffParam = m.getParameter("cliff", cliffValue);
    const merkleRootParam = m.getParameter("merkleRoot", merkleRoot);

    const vestingMapping = m.contract("VestingMapping");

    m.call(vestingMapping, "initialize", [cliffParam, merkleRootParam], { value: ethers.parseEther('1000') });

    return { vestingMapping };
  });

export default VestingMerkleModule;