import {
  player,
  securitySettings,
  sendPacket,
  coreSharedState,
} from "../core.js";

const handleAnimalAction = (currentValue) => {
  const id1 = 1;
  const id4 = 4;
  const id5 = 5;
  try {
    const fishLevelConfig = {
      ...securitySettings.default,
      ...(securitySettings[player?.myAnimals?.[0]?.visibleFishLevel] || {}),
    };
    if (currentValue < (player?.myAnimals?.[0]?._standing ? 40 : 100)) {
      return sendPacket(id1);
    }
    if (player?.myAnimals?.[0]?._standing) {
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
