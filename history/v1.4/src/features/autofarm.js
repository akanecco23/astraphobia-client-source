import { playerData, objConfig, sendPacket, state } from "../core.js";

const handleAnimalAction = (currentValue) => {
  const id1 = 1;
  const id4 = 4;
  const id5 = 5;
  try {
    const fishLevelConfig = {
      ...objConfig.default,
      ...(objConfig[playerData?.myAnimals?.[0]?.visibleFishLevel] || {}),
    };
    if (currentValue < (playerData?.myAnimals?.[0]?._standing ? 40 : 100)) {
      return sendPacket(id1);
    }
    if (playerData?.myAnimals?.[0]?._standing) {
      return sendPacket(id5, currentValue);
    }
    if (fishLevelConfig.hasScaling) {
      return sendPacket(id5, currentValue);
    }
    if (fishLevelConfig.hasSec) {
      return sendPacket(id4, currentValue);
    }
    return sendPacket(id1);
  } catch {}
};

export { handleAnimalAction };
