import { featuresentitytrailState } from "./entitytrail.js";
import { showNotification } from "../ui/interaction.js";
import { angles, radius, state } from "../core.js";
import { getGameCanvas } from "../utils.js";

function startAntiAfkMouseMovement() {
  if (featuresentitytrailState.globalEntityTrailInterval) {
    return;
  }
  const gameCanvas = getGameCanvas();
  if (!gameCanvas) {
    showNotification("Game canvas not found!");
    return;
  }
  featuresentitytrailState.globalEntityTrailInterval = setInterval(() => {
    const angleDegrees = angles[state.angleIndex];
    const angleRadians = (Math.PI * 2 * angleDegrees) / 360;
    const v49baOffsetX = Math.round(radius * Math.sin(angleRadians));
    const v57eeOffsetY = Math.round(radius * Math.cos(angleRadians));
    gameCanvas.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: window.innerWidth / 2 + v49baOffsetX,
        clientY: window.innerHeight / 2 + v57eeOffsetY,
        bubbles: true,
      }),
    );
    state.angleIndex = (state.angleIndex + 1) % angles.length;
  }, 15);
}
function stopEntityTrail() {
  if (featuresentitytrailState.globalEntityTrailInterval) {
    clearInterval(featuresentitytrailState.globalEntityTrailInterval);
    featuresentitytrailState.globalEntityTrailInterval = null;
  }
}
function toggleMouseSimulation() {
  if (featuresentitytrailState.globalEntityTrailInterval) {
    stopEntityTrail();
  } else {
    startAntiAfkMouseMovement();
  }
}

export { startAntiAfkMouseMovement, stopEntityTrail, toggleMouseSimulation };
