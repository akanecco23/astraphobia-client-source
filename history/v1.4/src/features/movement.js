import { getGameCanvas } from "../utils.js";
import { showNotification } from "../ui/interaction.js";
import { rotationAngles, orbitRadius, state } from "../core.js";

function startAntiAfkMouseMovement() {
  if (state.animationIntervalId) {
    return;
  }
  const gameCanvas = getGameCanvas();
  if (!gameCanvas) {
    showNotification("Game canvas not found!");
    return;
  }
  state.animationIntervalId = setInterval(() => {
    const angleDegrees = rotationAngles[state.angleIndex];
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
    state.angleIndex = (state.angleIndex + 1) % rotationAngles.length;
  }, 15);
}
function stopMouseSimulation() {
  if (state.animationIntervalId) {
    clearInterval(state.animationIntervalId);
    state.animationIntervalId = null;
  }
}
function toggleMouseSimulation() {
  if (state.animationIntervalId) {
    stopMouseSimulation();
  } else {
    startAntiAfkMouseMovement();
  }
}

export {
  startAntiAfkMouseMovement,
  stopMouseSimulation,
  toggleMouseSimulation,
};
