import { getGameCanvas } from "../utils.js";
import { showNotification } from "../ui/interaction.js";
import { angles, radius, coreSharedState } from "../core.js";

function startAntiAfk() {
  if (coreSharedState.animationInterval) {
    return;
  }
  const gameCanvas = getGameCanvas();
  if (!gameCanvas) {
    showNotification("Game canvas not found!");
    return;
  }
  coreSharedState.animationInterval = setInterval(() => {
    const angleDegrees = angles[coreSharedState.angleIndex];
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
      (coreSharedState.angleIndex + 1) % angles.length;
  }, 15);
}

export { startAntiAfk };
