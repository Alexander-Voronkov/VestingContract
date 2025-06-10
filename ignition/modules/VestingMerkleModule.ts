import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const VestingMerkleModule = (cliffValue: number, merkleRoot: string, amountToVest: bigint) =>
  buildModule("VestingMerkleModule", (m) => {

    const cliffParam = m.getParameter("cliff", cliffValue);
    const merkleRootParam = m.getParameter("merkleRoot", merkleRoot);

    const vestingMerkle = m.contract("VestingMerkle", [cliffParam, merkleRootParam], { value: amountToVest });

    return { vestingMerkle };
  });

export default VestingMerkleModule;