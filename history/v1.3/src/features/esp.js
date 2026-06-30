import { showNotification } from "../ui/interaction.js";
import { playerData, state } from "../core.js";

function toggleMinimapSize() {
  if (!playerData || !playerData.minimap) {
    showNotification("Minimap not available yet!");
    return;
  }
  if (state.isToggled_r45) {
    playerData.minimap.scale.set(1);
    playerData.minimap.pivot.set(0, 0);
    state.isToggled_r45 = false;
    showNotification("🗺️ Minimap restored to normal!");
  } else {
    playerData.minimap.scale.set(0.5);
    playerData.minimap.pivot.set(-70, -45);
    state.isToggled_r45 = true;
    showNotification("🗺️ Small Minimap enabled!");
  }
}

export { toggleMinimapSize };
