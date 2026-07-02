import { featuresentitytrailState } from "./entitytrail.js";
import { angles, radius, state } from "../core.js";
import { showToast } from "../ui/interaction.js";
import { getGameCanvas } from "../utils.js";

function startCircularMouseMovement() {
  if (featuresentitytrailState.modEntityTrailInterval) {
    return;
  }
  const gameCanvas = getGameCanvas();
  if (!gameCanvas) {
    showToast("Game canvas not found!");
    return;
  }
  featuresentitytrailState.modEntityTrailInterval = setInterval(() => {
    const angleDegrees = angles[state.angleIndex];
    const angleRadians = (Math.PI * 2 * angleDegrees) / 360;
    const v41a7OffsetX = Math.round(radius * Math.sin(angleRadians));
    const v541cOffsetY = Math.round(radius * Math.cos(angleRadians));
    gameCanvas.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: window.innerWidth / 2 + v41a7OffsetX,
        clientY: window.innerHeight / 2 + v541cOffsetY,
        bubbles: true,
      }),
    );
    state.angleIndex = (state.angleIndex + 1) % angles.length;
  }, 15);
}
function stopEntityTrail() {
  if (featuresentitytrailState.modEntityTrailInterval) {
    clearInterval(featuresentitytrailState.modEntityTrailInterval);
    featuresentitytrailState.modEntityTrailInterval = null;
  }
}
function toggleMouseSimulation() {
  if (featuresentitytrailState.modEntityTrailInterval) {
    stopEntityTrail();
  } else {
    startCircularMouseMovement();
  }
}

export { startCircularMouseMovement, stopEntityTrail, toggleMouseSimulation };
