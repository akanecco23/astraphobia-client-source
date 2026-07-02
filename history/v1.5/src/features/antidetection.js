import { featuresentitytrailState } from "./entitytrail.js";
import { showNotification } from "../ui/interaction.js";
import { angles, radius, state } from "../core.js";
import { getGameCanvas } from "../utils.js";

function startAntiAfk() {
  if (featuresentitytrailState.appEntityTrailInterval) {
    return;
  }
  const gameCanvas = getGameCanvas();
  if (!gameCanvas) {
    showNotification("Game canvas not found!");
    return;
  }
  featuresentitytrailState.appEntityTrailInterval = setInterval(() => {
    const angleDegrees = angles[state.angleIndex];
    const angleRadians = (Math.PI * 2 * angleDegrees) / 360;
    const v54bdOffsetX = Math.round(radius * Math.sin(angleRadians));
    const v2219OffsetY = Math.round(radius * Math.cos(angleRadians));
    gameCanvas.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: window.innerWidth / 2 + v54bdOffsetX,
        clientY: window.innerHeight / 2 + v2219OffsetY,
        bubbles: true,
      }),
    );
    state.angleIndex = (state.angleIndex + 1) % angles.length;
  }, 15);
}

export { startAntiAfk };
