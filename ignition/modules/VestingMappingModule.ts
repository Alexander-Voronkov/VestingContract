import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { Wallet } from "ethers";
import { VestingMapping__factory } from "../../typechain-types";
import { ethers } from "hardhat";

const VestingMappingModule = (cliffValue: number, recipients: string[], rewards: number[]) =>
  buildModule("VestingMappingModule", (m) => {
    const cliff = m.getParameter(
      "cliff",
      cliffValue
    );

    const recipientsParam = m.getParameter("recipients", recipients);
    const rewardsParam = m.getParameter("rewards", rewards);

    const vestingMapping = m.contract("VestingMapping");

    m.call(vestingMapping, "initialize", [cliff, recipientsParam, rewardsParam], { value: BigInt(100_000_000) });

    return { vestingMapping };
  });

export default VestingMappingModule;