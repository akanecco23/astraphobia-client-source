import { featuresentitytrailState } from "./entitytrail.js";
import { showNotification } from "../ui/interaction.js";
import { angles, radius, state } from "../core.js";
import { getGameCanvas } from "../utils.js";

function startAntiAfk() {
  if (featuresentitytrailState.modEntityTrailInterval) {
    return;
  }
  const gameCanvas = getGameCanvas();
  if (!gameCanvas) {
    showNotification("Game canvas not found!");
    return;
  }
  featuresentitytrailState.modEntityTrailInterval = setInterval(() => {
    const angleDegrees = angles[state.angleIndex];
    const angleRadians = (Math.PI * 2 * angleDegrees) / 360;
    const v37c7OffsetX = Math.round(radius * Math.sin(angleRadians));
    const v1578OffsetY = Math.round(radius * Math.cos(angleRadians));
    gameCanvas.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: window.innerWidth / 2 + v37c7OffsetX,
        clientY: window.innerHeight / 2 + v1578OffsetY,
        bubbles: true,
      }),
    );
    state.angleIndex = (state.angleIndex + 1) % angles.length;
  }, 15);
}

export { startAntiAfk };
