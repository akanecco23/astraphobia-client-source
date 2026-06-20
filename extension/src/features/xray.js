import { showNotification } from "../ui/interaction.js";
import { state } from "../core.js";

const initializeAstraVision = () => {
  if (state.isActive) {
    return;
  }
  if (!state.animalData) {
    setTimeout(initializeAstraVision, 500);
    return;
  }
  try {
    if (
      state.animalData.terrainManager &&
      state.animalData.terrainManager.shadow
    ) {
      state.animalData.terrainManager.shadow.setShadowSize(1000000);
      state.animalData.terrainManager.shadow.setShadowSize = () => {};
    } else {
      for (let keyA in state.animalData) {
        if (state.animalData[keyA] && state.animalData[keyA].shadow) {
          state.animalData[keyA].shadow.setShadowSize(1000000);
          state.animalData[keyA].shadow.setShadowSize = () => {};
        }
      }
    }
    if (typeof state.animalData.setFlash === "function") {
      state.animalData.setFlash = () => {};
    } else {
      for (let keyB of Object.getOwnPropertyNames(state.animalData.__proto__)) {
        if (
          keyB.startsWith("_0x") &&
          typeof state.animalData[keyB] === "function"
        ) {
          state.animalData[keyB] = () => {};
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
  } catch (errorMessage) {
    console.error("AstraVision Error:", errorMessage);
  }
  state.isActive = true;
};

export { initializeAstraVision };
