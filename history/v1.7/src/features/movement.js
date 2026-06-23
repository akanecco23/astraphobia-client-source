import { getGameCanvas } from "../utils.js";
import { showNotification } from "../ui/interaction.js";
import { angleDegrees, radius, offsetValue, state } from "../core.js";

function startCircularMovement() {
  if (state.animationIntervalId) {
    return;
  }
  const canvas = getGameCanvas();
  if (!canvas) {
    showNotification("Canvas not found");
    return;
  }
  state.animationIntervalId = setInterval(() => {
    const angleDegrees = angleDegrees[state.angleIndex];
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
    state.angleIndex = (state.angleIndex + 1) % angleDegrees.length;
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
    startCircularMovement();
  }
}
function moveMouseToSide(direction) {
  const canvas = getGameCanvas();
  if (!canvas) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const targetX =
    direction === "left" ? centerX - offsetValue : centerX + offsetValue;
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
  const targetElement = getGameCanvas();
  if (!targetElement) {
    return;
  }
  targetElement.dispatchEvent(
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
    targetElement.dispatchEvent(
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
  moveMouseToSide,
  simulateClick,
};
