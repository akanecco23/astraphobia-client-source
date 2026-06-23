import { showNotification } from "../ui/interaction.js";
import { state } from "../core.js";

const activateAstraVision = () => {
  if (state.isEnabled) {
    return;
  }
  if (!state.playerData) {
    setTimeout(activateAstraVision, 500);
    return;
  }
  try {
    if (
      state.playerData.terrainManager &&
      state.playerData.terrainManager.shadow
    ) {
      state.playerData.terrainManager.shadow.setShadowSize(1000000);
      state.playerData.terrainManager.shadow.setShadowSize = () => {};
    } else {
      for (let key1 in state.playerData) {
        if (state.playerData[key1] && state.playerData[key1].shadow) {
          state.playerData[key1].shadow.setShadowSize(1000000);
          state.playerData[key1].shadow.setShadowSize = () => {};
        }
      }
    }
    if (typeof state.playerData.setFlash === "function") {
      state.playerData.setFlash = () => {};
    } else {
      for (let key2 of Object.getOwnPropertyNames(state.playerData.__proto__)) {
        if (
          key2.startsWith("_0x") &&
          typeof state.playerData[key2] === "function"
        ) {
          state.playerData[key2] = () => {};
        }
      }
    }
    setInterval(() => {
      try {
        state.gameInstance.viewport.clampZoom({
          minWidth: 0,
          maxWidth: 10000000,
        });
        state.gameInstance.viewport.plugins.plugins.clamp = null;
        state.gameInstance.viewport.plugins.plugins["clamp-zoom"] = null;
      } catch {}
    }, 300);
    showNotification("Astra-Vision active");
  } catch (error) {
    console.error("AstraVision Error:", error);
  }
  state.isEnabled = true;
};

export { activateAstraVision };
