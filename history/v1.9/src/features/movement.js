import {
  angles,
  radius,
  offsetValue,
  getFirstAnimalPosition,
  state,
} from "../core.js";
import { featuresentitytrailState } from "./entitytrail.js";
import { showNotification } from "../ui/interaction.js";
import { getGameCanvas } from "../utils.js";

function startMouseSimulation() {
  if (featuresentitytrailState.entityTrailInterval_2) {
    return;
  }
  const canvas = getGameCanvas();
  if (!canvas) {
    showNotification("Canvas not found");
    return;
  }
  featuresentitytrailState.entityTrailInterval_2 = setInterval(() => {
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
  if (featuresentitytrailState.entityTrailInterval_2) {
    clearInterval(featuresentitytrailState.entityTrailInterval_2);
    featuresentitytrailState.entityTrailInterval_2 = null;
  }
}
function toggleMouseSimulation() {
  if (featuresentitytrailState.entityTrailInterval_2) {
    stopEntityTrail();
  } else {
    startMouseSimulation();
  }
}
function simulatePointerMove(direction) {
  const targetElement = getGameCanvas();
  if (!targetElement) {
    return;
  }
  const rect = targetElement.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const targetX =
    direction === "left" ? centerX - offsetValue : centerX + offsetValue;
  targetElement.dispatchEvent(
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
function moveAndClickTarget(targetX, targetY, shouldClick) {
  const targetElement = getGameCanvas();
  if (!targetElement) {
    return;
  }
  const playerPos = getFirstAnimalPosition();
  if (!playerPos) {
    return;
  }
  const rect = targetElement.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const diffX = targetX - playerPos.x;
  const diffY = targetY - playerPos.y;
  const distance = Math.sqrt(diffX * diffX + diffY * diffY);
  let multiplier = 1;
  if (distance > 5000) {
    multiplier = 3;
  } else if (distance > 2000) {
    multiplier = 2;
  } else if (distance > 1000) {
    multiplier = 1.5;
  } else if (distance > 500) {
    multiplier = 1.2;
  } else if (distance < 50) {
    multiplier = 0.5;
  } else if (distance < 150) {
    multiplier = 0.8;
  }
  let offsetX = diffX * multiplier;
  let offsetY = diffY * multiplier;
  const maxRadius = Math.min(rect.width, rect.height) * 0.85;
  const currentDist = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
  if (currentDist > maxRadius) {
    const scale = maxRadius / currentDist;
    offsetX *= scale;
    offsetY *= scale;
  }
  const finalX = centerX + offsetX;
  const finalY = centerY + offsetY;
  targetElement.dispatchEvent(
    new MouseEvent("pointermove", {
      clientX: finalX,
      clientY: finalY,
      bubbles: true,
      view: window,
    }),
  );
  if (shouldClick) {
    simulateClick(finalX, finalY);
  }
}

export {
  startMouseSimulation,
  stopEntityTrail,
  toggleMouseSimulation,
  simulatePointerMove,
  simulateClick,
  moveAndClickTarget,
};
