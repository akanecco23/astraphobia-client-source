import { getGameCanvas } from "../utils.js";
import { showNotification } from "../ui/interaction.js";
import { angles, radius, offsetValue, state } from "../core.js";

function startCircularMovement() {
  if (state.secondaryIntervalId) {
    return;
  }
  const canvas = getGameCanvas();
  if (!canvas) {
    showNotification("Canvas not found");
    return;
  }
  state.secondaryIntervalId = setInterval(() => {
    const angleDegrees = angles[state.currentIndex];
    const angleRadians = (Math.PI * 2 * angleDegrees) / 360;
    const offsetX = Math.round(radius * Math.sin(angleRadians));
    const offsetY = Math.round(radius * Math.cos(angleRadians));
    canvas.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: window.innerWidth / 2 + offsetX,
        clientY: window.innerHeight / 2 + offsetY,
        bubbles: true,
      }),
    );
    state.currentIndex = (state.currentIndex + 1) % angles.length;
  }, 15);
}
function stopMouseSimulation() {
  if (state.secondaryIntervalId) {
    clearInterval(state.secondaryIntervalId);
    state.secondaryIntervalId = null;
  }
}
function toggleMouseSimulation() {
  if (state.secondaryIntervalId) {
    stopMouseSimulation();
  } else {
    startCircularMovement();
  }
}
function moveMouseSide(side) {
  const canvas = getGameCanvas();
  if (!canvas) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const targetX =
    side === "left" ? centerX - offsetValue : centerX + offsetValue;
  canvas.dispatchEvent(
    new MouseEvent("pointermove", {
      clientX: targetX,
      clientY: centerY,
      bubbles: true,
      view: window,
    }),
  );
}
function simulateClick(clientX, clientY) {
  const gameCanvas = getGameCanvas();
  if (!gameCanvas) {
    return;
  }
  gameCanvas.dispatchEvent(
    new PointerEvent("pointerdown", {
      clientX: clientX,
      clientY: clientY,
      button: 0,
      buttons: 1,
      bubbles: true,
      view: window,
    }),
  );
  setTimeout(() => {
    gameCanvas.dispatchEvent(
      new PointerEvent("pointerup", {
        clientX: clientX,
        clientY: clientY,
        buttons: 0,
        bubbles: true,
        view: window,
      }),
    );
  }, 80);
}

export {
  startCircularMovement,
  stopMouseSimulation,
  toggleMouseSimulation,
  moveMouseSide,
  simulateClick,
};
