import { angleSteps, orbitRadius, coreSharedState } from "../core.js";
import { showToast } from "../ui/interaction.js";
import { getGameCanvas } from "../utils.js";

function startCircularMouseMovement() {
  if (coreSharedState.rotationInterval) {
    return;
  }
  const gameCanvas = getGameCanvas();
  if (!gameCanvas) {
    showToast("Game canvas not found!");
    return;
  }
  coreSharedState.rotationInterval = setInterval(() => {
    const angleDegrees = angleSteps[coreSharedState.angleIndex];
    const angleRadians = (Math.PI * 2 * angleDegrees) / 360;
    const offsetX = Math.round(orbitRadius * Math.sin(angleRadians));
    const offsetY = Math.round(orbitRadius * Math.cos(angleRadians));
    gameCanvas.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: window.innerWidth / 2 + offsetX,
        clientY: window.innerHeight / 2 + offsetY,
        bubbles: true,
      }),
    );
    coreSharedState.angleIndex =
      (coreSharedState.angleIndex + 1) % angleSteps.length;
  }, 15);
}
function stopMouseSimulation() {
  if (coreSharedState.rotationInterval) {
    clearInterval(coreSharedState.rotationInterval);
    coreSharedState.rotationInterval = null;
  }
}
function toggleMouseSimulation() {
  if (coreSharedState.rotationInterval) {
    stopMouseSimulation();
  } else {
    startCircularMouseMovement();
  }
}

export {
  startCircularMouseMovement,
  stopMouseSimulation,
  toggleMouseSimulation,
};
