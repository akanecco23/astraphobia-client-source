import { gameInstance, playerData, config, state } from "../core.js";

const initializeViewportHacks = () => {
  if (state.isProcessed_3) {
    return;
  }
  if (!playerData) {
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
    if (config.setFlash) {
      playerData[config.setFlash] = () => {};
    }
    if (config.terrainManager) {
      const terrainManager = playerData[config.terrainManager];
      if (terrainManager?.shadow) {
        terrainManager.shadow.setShadowSize(1000000);
        terrainManager.shadow.setShadowSize = () => {};
      }
    }
  } catch (url) {
    console.error(url);
  }
  state.isProcessed_3 = true;
};

export { initializeViewportHacks };
