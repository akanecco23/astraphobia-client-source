import { angles, radius, offsetValue, state } from "../core.js";
import { featuresentitytrailState } from "./entitytrail.js";
import { showNotification } from "../ui/interaction.js";
import { getGameCanvas } from "../utils.js";

function startCircularMovement() {
  if (featuresentitytrailState.entityTrailInterval_sje) {
    return;
  }
  const canvas = getGameCanvas();
  if (!canvas) {
    showNotification("Canvas not found");
    return;
  }
  featuresentitytrailState.entityTrailInterval_sje = setInterval(() => {
    const angleDegrees = angles[state.angleIndex];
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
    state.angleIndex = (state.angleIndex + 1) % angles.length;
  }, 15);
}
function stopEntityTrail() {
  if (featuresentitytrailState.entityTrailInterval_sje) {
    clearInterval(featuresentitytrailState.entityTrailInterval_sje);
    featuresentitytrailState.entityTrailInterval_sje = null;
  }
}
function toggleMouseSimulation() {
  if (featuresentitytrailState.entityTrailInterval_sje) {
    stopEntityTrail();
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
  stopEntityTrail,
  toggleMouseSimulation,
  moveMouseSide,
  simulateClick,
};
