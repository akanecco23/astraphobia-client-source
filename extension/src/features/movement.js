import { featuresentitytrailState } from "./entitytrail.js";
import { angles, radius, state } from "../core.js";
import { showToast } from "../ui/interaction.js";
import { getGameCanvas } from "../utils.js";

function startCircularMouseMovement() {
  if (featuresentitytrailState.entityTrailInterval_rkn) {
    return;
  }
  const gameCanvas = getGameCanvas();
  if (!gameCanvas) {
    showToast("Game canvas not found!");
    return;
  }
  featuresentitytrailState.entityTrailInterval_rkn = setInterval(() => {
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
function stopEntityTrail() {
  if (featuresentitytrailState.entityTrailInterval_rkn) {
    clearInterval(featuresentitytrailState.entityTrailInterval_rkn);
    featuresentitytrailState.entityTrailInterval_rkn = null;
  }
}
function toggleMouseSimulation() {
  if (featuresentitytrailState.entityTrailInterval_rkn) {
    stopEntityTrail();
  } else {
    startCircularMouseMovement();
  }
}

export { startCircularMouseMovement, stopEntityTrail, toggleMouseSimulation };
