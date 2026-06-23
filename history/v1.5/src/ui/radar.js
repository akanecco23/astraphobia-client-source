import { showNotification } from "./interaction.js";
import { coreSharedState } from "../core.js";

function toggleMinimapScale() {
  if (!coreSharedState.playerData || !coreSharedState.playerData.minimap) {
    showNotification("Minimap not available yet!");
    return;
  }
  if (coreSharedState.isProcessing_2) {
    coreSharedState.playerData.minimap.scale.set(1);
    coreSharedState.playerData.minimap.pivot.set(0, 0);
    coreSharedState.isProcessing_2 = false;
    showNotification("🗺️ Minimap restored to normal!");
  } else {
    coreSharedState.playerData.minimap.scale.set(0.5);
    coreSharedState.playerData.minimap.pivot.set(-70, -45);
    coreSharedState.isProcessing_2 = true;
    showNotification("🗺️ Small Minimap enabled!");
  }
}

export { toggleMinimapScale };
