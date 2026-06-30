import { showNotification } from "./interaction.js";
import { playerData, state } from "../core.js";

function toggleMinimapScale() {
  if (!playerData || !playerData.minimap) {
    showNotification("Minimap not available yet!");
    return;
  }
  if (state.isToggled_r5u) {
    playerData.minimap.scale.set(1);
    playerData.minimap.pivot.set(0, 0);
    state.isToggled_r5u = false;
    showNotification("🗺️ Minimap restored to normal!");
  } else {
    playerData.minimap.scale.set(0.5);
    playerData.minimap.pivot.set(-70, -45);
    state.isToggled_r5u = true;
    showNotification("🗺️ Small Minimap enabled!");
  }
}

export { toggleMinimapScale };
