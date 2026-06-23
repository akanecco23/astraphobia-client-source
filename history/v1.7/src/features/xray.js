import { gameInstance, animalData, settings, state } from "../core.js";

const initializeViewportHacks = () => {
  if (state.isProcessed) {
    return;
  }
  if (!animalData) {
    setTimeout(initializeViewportHacks, 500);
    return;
  }
  setInterval(() => {
    try {
      gameInstance.viewport.clampZoom({
        minWidth: 0,
        maxWidth: 10000000,
      });
      gameInstance.viewport.plugins.plugins.clamp = null;
      gameInstance.viewport.plugins.plugins["clamp-zoom"] = null;
    } catch {}
  }, 300);
  try {
    if (settings.setFlash) {
      animalData[settings.setFlash] = () => {};
    }
    if (settings.terrainManager) {
      const terrainManager = animalData[settings.terrainManager];
      if (terrainManager?.shadow) {
        terrainManager.shadow.setShadowSize(1000000);
        terrainManager.shadow.setShadowSize = () => {};
      }
    }
  } catch (error) {
    console.error(error);
  }
  state.isProcessed = true;
};

export { initializeViewportHacks };
