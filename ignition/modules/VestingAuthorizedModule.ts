import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "hardhat";

const VestingAuthorizedModule = (cliffValue: number, signer: string, amountToVest: bigint) =>
  buildModule("VestingAuthorizedModule", (m) => {
    const cliff = m.getParameter(
      "cliff",
      cliffValue
    );

    const signerParam = m.getParameter("signer", signer);

    const vestingAuthorized = m.contract("VestingAuthorized", [signerParam, cliff], { value: amountToVest });

    return { vestingAuthorized };
  });

export default VestingAuthorizedModule;