import { showNotification } from "../ui/interaction.js";
import { gameInstance, animalData, state } from "../core.js";

const initializeAstraVision = () => {
  if (state.isEnabled) {
    return;
  }
  if (!animalData) {
    setTimeout(initializeAstraVision, 500);
    return;
  }
  try {
    if (animalData.terrainManager && animalData.terrainManager.shadow) {
      animalData.terrainManager.shadow.setShadowSize(1000000);
      animalData.terrainManager.shadow.setShadowSize = () => {};
    } else {
      for (let key1 in animalData) {
        if (animalData[key1] && animalData[key1].shadow) {
          animalData[key1].shadow.setShadowSize(1000000);
          animalData[key1].shadow.setShadowSize = () => {};
        }
      }
    }
    if (typeof animalData.setFlash === "function") {
      animalData.setFlash = () => {};
    } else {
      for (let key2 of Object.getOwnPropertyNames(animalData.__proto__)) {
        if (key2.startsWith("_0x") && typeof animalData[key2] === "function") {
          animalData[key2] = () => {};
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

export { initializeAstraVision };
