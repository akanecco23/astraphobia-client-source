import {
  angles,
  radius,
  offsetValue,
  getFirstAnimalPosition,
  state,
} from "../core.js";
import { featuresentitytrailState } from "./entitytrail.js";
import { showToast } from "../ui/interaction.js";
import { getGameCanvas } from "../utils.js";

function startCircularMovement() {
  if (featuresentitytrailState.globalEntityTrailInterval) {
    return;
  }
  const canvas = getGameCanvas();
  if (!canvas) {
    showToast("Canvas not found");
    return;
  }
  featuresentitytrailState.globalEntityTrailInterval = setInterval(() => {
    const angleDegrees = angles[state.angleIndex];
    const angleRadians = (Math.PI * 2 * angleDegrees) / 360;
    const v5ecdOffsetX = Math.round(radius * Math.sin(angleRadians));
    const v504cOffsetY = Math.round(radius * Math.cos(angleRadians));
    canvas.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: window.innerWidth / 2 + v5ecdOffsetX,
        clientY: window.innerHeight / 2 + v504cOffsetY,
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
function moveMouseToSide(side) {
  const v3e63Canvas = getGameCanvas();
  if (!v3e63Canvas) {
    return;
  }
  const rect = v3e63Canvas.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const targetX =
    side === "left" ? centerX - offsetValue : centerX + offsetValue;
  v3e63Canvas.dispatchEvent(
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
function simulateMoveAndClick(v3f58TargetX, targetY, shouldClick) {
  const v21d7TargetElement = getGameCanvas();
  if (!v21d7TargetElement) {
    return;
  }
  const playerPosition = getFirstAnimalPosition();
  if (!playerPosition) {
    return;
  }
  const elementRect = v21d7TargetElement.getBoundingClientRect();
  const v39c0CenterX = elementRect.left + elementRect.width / 2;
  const v11cfCenterY = elementRect.top + elementRect.height / 2;
  const deltaX = v3f58TargetX - playerPosition.x;
  const deltaY = targetY - playerPosition.y;
  const e1adDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  let speedMultiplier = 1;
  if (e1adDistance > 5000) {
    speedMultiplier = 3;
  } else if (e1adDistance > 2000) {
    speedMultiplier = 2;
  } else if (e1adDistance > 1000) {
    speedMultiplier = 1.5;
  } else if (e1adDistance > 500) {
    speedMultiplier = 1.2;
  } else if (e1adDistance < 50) {
    speedMultiplier = 0.5;
  } else if (e1adDistance < 150) {
    speedMultiplier = 0.8;
  }
  const v4daeOffsetX = deltaX * speedMultiplier;
  const v1429OffsetY = deltaY * speedMultiplier;
  const maxOffset = Math.min(elementRect.width, elementRect.height) * 0.85;
  const currentOffset = Math.sqrt(
    v4daeOffsetX * v4daeOffsetX + v1429OffsetY * v1429OffsetY,
  );
  let finalX = v39c0CenterX + v4daeOffsetX;
  let finalY = v11cfCenterY + v1429OffsetY;
  if (currentOffset > maxOffset) {
    const clampFactor = maxOffset / currentOffset;
    finalX = v39c0CenterX + v4daeOffsetX * clampFactor;
    finalY = v11cfCenterY + v1429OffsetY * clampFactor;
  }
  v21d7TargetElement.dispatchEvent(
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
  startCircularMovement,
  stopEntityTrail,
  toggleMouseSimulation,
  moveMouseToSide,
  simulateClick,
  simulateMoveAndClick,
};
