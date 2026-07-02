import { angles, radius, offsetValue, state } from "../core.js";
import { featuresentitytrailState } from "./entitytrail.js";
import { showNotification } from "../ui/interaction.js";
import { getGameCanvas } from "../utils.js";

function startCircularMovement() {
  if (featuresentitytrailState.sysEntityTrailInterval) {
    return;
  }
  const canvas = getGameCanvas();
  if (!canvas) {
    showNotification("Canvas not found");
    return;
  }
  featuresentitytrailState.sysEntityTrailInterval = setInterval(() => {
    const angleDegrees = angles[state.angleIndex];
    const angleRadians = (Math.PI * 2 * angleDegrees) / 360;
    const v4114OffsetX = Math.round(radius * Math.sin(angleRadians));
    const v2cf7OffsetY = Math.round(radius * Math.cos(angleRadians));
    canvas.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: window.innerWidth / 2 + v4114OffsetX,
        clientY: window.innerHeight / 2 + v2cf7OffsetY,
        bubbles: true,
      }),
    );
    state.angleIndex = (state.angleIndex + 1) % angles.length;
  }, 15);
}
function stopEntityTrail() {
  if (featuresentitytrailState.sysEntityTrailInterval) {
    clearInterval(featuresentitytrailState.sysEntityTrailInterval);
    featuresentitytrailState.sysEntityTrailInterval = null;
  }
}
function toggleMouseSimulation() {
  if (featuresentitytrailState.sysEntityTrailInterval) {
    stopEntityTrail();
  } else {
    startCircularMovement();
  }
}
function moveMouseSide(side) {
  const v5687Canvas = getGameCanvas();
  if (!v5687Canvas) {
    return;
  }
  const rect = v5687Canvas.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const targetX =
    side === "left" ? centerX - offsetValue : centerX + offsetValue;
  v5687Canvas.dispatchEvent(
    new MouseEvent("pointermove", {
      clientX: targetX,
      clientY: centerY,
      bubbles: true,
      view: window,
    }),
  );
}
function simulateClick(clientX, clientY) {
  const v1940GameCanvas = getGameCanvas();
  if (!v1940GameCanvas) {
    return;
  }
  v1940GameCanvas.dispatchEvent(
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
    v1940GameCanvas.dispatchEvent(
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
  moveMouseSide,
  simulateClick,
};
