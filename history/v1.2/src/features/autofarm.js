import { securityConfigs, sendPacket, coreSharedState } from "../core.js";

const handleAnimalAction = (value) => {
  const id1 = 1;
  const id4 = 4;
  const id5 = 5;
  try {
    const fishLevelConfig = {
      ...securityConfigs.default,
      ...(securityConfigs[
        coreSharedState.userData?.myAnimals?.[0]?.visibleFishLevel
      ] || {}),
    };
    if (
      value < (coreSharedState.userData?.myAnimals?.[0]?._standing ? 40 : 100)
    ) {
      return sendPacket(id1);
    }
    if (coreSharedState.userData?.myAnimals?.[0]?._standing) {
      return sendPacket(id5, value);
    }
    if (fishLevelConfig.hasScaling) {
      return sendPacket(id5, value);
    }
    if (fishLevelConfig.hasSec) {
      return sendPacket(id4, value);
    }
    return sendPacket(id1);
  } catch {}
};

export { handleAnimalAction };
