import { showNotification } from "../ui/interaction.js";
import { state } from "../core.js";

function toggleMinimapSize() {
  if (!state.playerData || !state.playerData.minimap) {
    showNotification("Minimap not available yet!");
    return;
  }
  if (state.isProcessing_2) {
    state.playerData.minimap.scale.set(1);
    state.playerData.minimap.pivot.set(0, 0);
    state.isProcessing_2 = false;
    showNotification("🗺️ Minimap restored to normal!");
  } else {
    state.playerData.minimap.scale.set(0.5);
    state.playerData.minimap.pivot.set(-70, -45);
    state.isProcessing_2 = true;
    showNotification("🗺️ Small Minimap enabled!");
  }
}

export { toggleMinimapSize };
