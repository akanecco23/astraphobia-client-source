import { angleSteps, radius, coreSharedState } from "../core.js";
import { showNotification } from "../ui/interaction.js";
import { getGameCanvas } from "../utils.js";

function startAntiAfk() {
  if (coreSharedState.rotationInterval) {
    return;
  }
  const gameCanvas = getGameCanvas();
  if (!gameCanvas) {
    showNotification("Game canvas not found!");
    return;
  }
  coreSharedState.rotationInterval = setInterval(() => {
    const angleDegrees = angleSteps[coreSharedState.angleIndex];
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
    coreSharedState.angleIndex =
      (coreSharedState.angleIndex + 1) % angleSteps.length;
  }, 15);
}

export { startAntiAfk };
