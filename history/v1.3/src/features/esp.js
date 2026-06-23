import { showNotification } from "../ui/interaction.js";
import { coreSharedState } from "../core.js";

function toggleMinimapSize() {
  if (!coreSharedState.player || !coreSharedState.player.minimap) {
    showNotification("Minimap not available yet!");
    return;
  }
  if (coreSharedState.isActive_2) {
    coreSharedState.player.minimap.scale.set(1);
    coreSharedState.player.minimap.pivot.set(0, 0);
    coreSharedState.isActive_2 = false;
    showNotification("🗺️ Minimap restored to normal!");
  } else {
    coreSharedState.player.minimap.scale.set(0.5);
    coreSharedState.player.minimap.pivot.set(-70, -45);
    coreSharedState.isActive_2 = true;
    showNotification("🗺️ Small Minimap enabled!");
  }
}

export { toggleMinimapSize };
