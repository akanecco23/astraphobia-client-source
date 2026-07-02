import { gameInstance, playerData, Config, state } from "../core.js";

const initializeViewportHacks = () => {
  if (state.appIsProcessed) {
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
    if (Config.setFlash) {
      playerData[Config.setFlash] = () => {};
    }
    if (Config.terrainManager) {
      const terrainManager = playerData[Config.terrainManager];
      if (terrainManager?.shadow) {
        terrainManager.shadow.setShadowSize(1000000);
        terrainManager.shadow.setShadowSize = () => {};
      }
    }
  } catch (v3e75Url) {
    console.error(v3e75Url);
  }
  state.appIsProcessed = true;
};

export { initializeViewportHacks };
