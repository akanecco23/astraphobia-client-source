import {
  playerData,
  securityConfig,
  sendPacket,
  coreSharedState,
} from "../core.js";

const handleAnimalAction = (currentValue) => {
  const const1 = 1;
  const const4 = 4;
  const const5 = 5;
  try {
    const fishLevelSettings = {
      ...securityConfig.default,
      ...(securityConfig[playerData?.myAnimals?.[0]?.visibleFishLevel] || {}),
    };
    if (currentValue < (playerData?.myAnimals?.[0]?._standing ? 40 : 100)) {
      return sendPacket(const1);
    }
    if (playerData?.myAnimals?.[0]?._standing) {
      return sendPacket(const5, currentValue);
    }
    if (fishLevelSettings.hasScaling) {
      return sendPacket(const5, currentValue);
    }
    if (fishLevelSettings.hasSec) {
      return sendPacket(const4, currentValue);
    }
    return sendPacket(const1);
  } catch {}
};

export { handleAnimalAction };
