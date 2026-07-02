import { angles, radius, offsetValue, state } from "../core.js";
import { featuresentitytrailState } from "./entitytrail.js";
import { showNotification } from "../ui/interaction.js";
import { getGameCanvas } from "../utils.js";

function startCircularMovement() {
  if (featuresentitytrailState.globalEntityTrailInterval) {
    return;
  }
  const canvas = getGameCanvas();
  if (!canvas) {
    showNotification("Canvas not found");
    return;
  }
  featuresentitytrailState.globalEntityTrailInterval = setInterval(() => {
    const angleDegrees = angles[state.angleIndex];
    const angleRadians = (Math.PI * 2 * angleDegrees) / 360;
    const v1ee9OffsetX = Math.round(radius * Math.sin(angleRadians));
    const v11d4OffsetY = Math.round(radius * Math.cos(angleRadians));
    canvas.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: window.innerWidth / 2 + v1ee9OffsetX,
        clientY: window.innerHeight / 2 + v11d4OffsetY,
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
    startCircularMovement();
  }
}
function moveMouseToSide(direction) {
  const v45cbCanvas = getGameCanvas();
  if (!v45cbCanvas) {
    return;
  }
  const rect = v45cbCanvas.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const targetX =
    direction === "left" ? centerX - offsetValue : centerX + offsetValue;
  v45cbCanvas.dispatchEvent(
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
  stopEntityTrail,
  toggleMouseSimulation,
  moveMouseToSide,
  simulateClick,
};
