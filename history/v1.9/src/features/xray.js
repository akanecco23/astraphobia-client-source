import { showNotification } from "../ui/interaction.js";
import { gameInstance, playerData, state } from "../core.js";

const activateAstraVision = () => {
  if (state.isEnabled) {
    return;
  }
  if (!playerData) {
    setTimeout(activateAstraVision, 500);
    return;
  }
  try {
    if (playerData.terrainManager && playerData.terrainManager.shadow) {
      playerData.terrainManager.shadow.setShadowSize(1000000);
      playerData.terrainManager.shadow.setShadowSize = () => {};
    } else {
      for (let key1 in playerData) {
        if (playerData[key1] && playerData[key1].shadow) {
          playerData[key1].shadow.setShadowSize(1000000);
          playerData[key1].shadow.setShadowSize = () => {};
        }
      }
    }
    if (typeof playerData.setFlash === "function") {
      playerData.setFlash = () => {};
    } else {
      for (let key2 of Object.getOwnPropertyNames(playerData.__proto__)) {
        if (key2.startsWith("_0x") && typeof playerData[key2] === "function") {
          playerData[key2] = () => {};
        }
      }
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
    showNotification("Astra-Vision active");
  } catch (error) {
    console.error("AstraVision Error:", error);
  }
  state.isEnabled = true;
};

export { activateAstraVision };
