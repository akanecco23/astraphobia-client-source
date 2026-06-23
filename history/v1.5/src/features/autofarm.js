import { securityConfigs, sendPacket, coreSharedState } from "../core.js";

const handleAnimalAction = (currentValue) => {
  const id1 = 1;
  const id4 = 4;
  const id5 = 5;
  try {
    const fishLevelSettings = {
      ...securityConfigs.default,
      ...(securityConfigs[
        coreSharedState.playerData?.myAnimals?.[0]?.visibleFishLevel
      ] || {}),
    };
    if (
      currentValue <
      (coreSharedState.playerData?.myAnimals?.[0]?._standing ? 40 : 100)
    ) {
      return sendPacket(id1);
    }
    if (coreSharedState.playerData?.myAnimals?.[0]?._standing) {
      return sendPacket(id5, currentValue);
    }
    if (fishLevelSettings.hasScaling) {
      return sendPacket(id5, currentValue);
    }
    if (fishLevelSettings.hasSec) {
      return sendPacket(id4, currentValue);
    }
    return sendPacket(id1);
  } catch {}
};

export { handleAnimalAction };
