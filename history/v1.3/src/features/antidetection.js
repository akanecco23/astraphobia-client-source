import { featuresentitytrailState } from "./entitytrail.js";
import { showNotification } from "../ui/interaction.js";
import { angles, radius, state } from "../core.js";
import { getGameCanvas } from "../utils.js";

function startAntiAfk() {
  if (featuresentitytrailState.entityTrailInterval_qpd) {
    return;
  }
  const gameCanvas = getGameCanvas();
  if (!gameCanvas) {
    showNotification("Game canvas not found!");
    return;
  }
  featuresentitytrailState.entityTrailInterval_qpd = setInterval(() => {
    const angleDegrees = angles[state.angleIndex];
    const angleRadians = (Math.PI * 2 * angleDegrees) / 360;
    const offsetX = Math.round(radius * Math.sin(angleRadians));
    const offsetY = Math.round(radius * Math.cos(angleRadians));
    gameCanvas.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: window.innerWidth / 2 + offsetX,
        clientY: window.innerHeight / 2 + offsetY,
        bubbles: true,
      }),
    );
    state.angleIndex = (state.angleIndex + 1) % angles.length;
  }, 15);
}

export { startAntiAfk };
