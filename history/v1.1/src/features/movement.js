import { featuresentitytrailState } from "./entitytrail.js";
import { angles, radius, state } from "../core.js";
import { showToast } from "../ui/interaction.js";
import { getGameCanvas } from "../utils.js";

function startCircularMouseMovement() {
  if (featuresentitytrailState.entityTrailInterval_2) {
    return;
  }
  const gameCanvas = getGameCanvas();
  if (!gameCanvas) {
    showToast("Game canvas not found!");
    return;
  }
  featuresentitytrailState.entityTrailInterval_2 = setInterval(() => {
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
  if (featuresentitytrailState.entityTrailInterval_2) {
    clearInterval(featuresentitytrailState.entityTrailInterval_2);
    featuresentitytrailState.entityTrailInterval_2 = null;
  }
}
function toggleMouseSimulation() {
  if (featuresentitytrailState.entityTrailInterval_2) {
    stopEntityTrail();
  } else {
    startCircularMouseMovement();
  }
}

export { startCircularMouseMovement, stopEntityTrail, toggleMouseSimulation };
