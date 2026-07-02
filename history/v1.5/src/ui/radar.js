import { showNotification } from "./interaction.js";
import { playerData, state } from "../core.js";

function toggleMinimapScale() {
  if (!playerData || !playerData.minimap) {
    showNotification("Minimap not available yet!");
    return;
  }
  if (state.boolIsToggled) {
    playerData.minimap.scale.set(1);
    playerData.minimap.pivot.set(0, 0);
    state.boolIsToggled = false;
    showNotification("🗺️ Minimap restored to normal!");
  } else {
    playerData.minimap.scale.set(0.5);
    playerData.minimap.pivot.set(-70, -45);
    state.boolIsToggled = true;
    showNotification("🗺️ Small Minimap enabled!");
  }
}

export { toggleMinimapScale };
