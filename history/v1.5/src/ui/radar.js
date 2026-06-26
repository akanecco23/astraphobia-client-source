import { playerData, coreSharedState } from "../core.js";
import { showNotification } from "./interaction.js";

function toggleMinimapScale() {
  if (!playerData || !playerData.minimap) {
    showNotification("Minimap not available yet!");
    return;
  }
  if (coreSharedState.isProcessing_2) {
    playerData.minimap.scale.set(1);
    playerData.minimap.pivot.set(0, 0);
    coreSharedState.isProcessing_2 = false;
    showNotification("🗺️ Minimap restored to normal!");
  } else {
    playerData.minimap.scale.set(0.5);
    playerData.minimap.pivot.set(-70, -45);
    coreSharedState.isProcessing_2 = true;
    showNotification("🗺️ Small Minimap enabled!");
  }
}

export { toggleMinimapScale };
