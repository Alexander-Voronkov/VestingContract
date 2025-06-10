import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "hardhat";

const VestingMappingModule = (cliffValue: number, recipients: string[], rewards: bigint[], amountToVest: bigint) =>
  buildModule("VestingMappingModule", (m) => {
    const cliff = m.getParameter(
      "cliff",
      cliffValue
    );

    const recipientsParam = m.getParameter("recipients", recipients);
    const rewardsParam = m.getParameter("rewards", rewards);

    const vestingMapping = m.contract("VestingMapping");

    m.call(vestingMapping, "initialize", [cliff, recipientsParam, rewardsParam], { value: amountToVest });

    return { vestingMapping };
  });

export default VestingMappingModule;