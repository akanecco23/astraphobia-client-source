import {
  angleSteps,
  radius,
  offsetValue,
  getFirstAnimalPosition,
  coreSharedState,
} from "../core.js";
import { showToast } from "../ui/interaction.js";
import { getGameCanvas } from "../utils.js";

function startCircularMovement() {
  if (coreSharedState.animationInterval) {
    return;
  }
  const canvas = getGameCanvas();
  if (!canvas) {
    showToast("Canvas not found");
    return;
  }
  coreSharedState.animationInterval = setInterval(() => {
    const angleDegrees = angleSteps[coreSharedState.currentIndex];
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
    coreSharedState.currentIndex =
      (coreSharedState.currentIndex + 1) % angleSteps.length;
  }, 15);
}
function stopMouseSimulation() {
  if (coreSharedState.animationInterval) {
    clearInterval(coreSharedState.animationInterval);
    coreSharedState.animationInterval = null;
  }
}
function toggleMouseSimulation() {
  if (coreSharedState.animationInterval) {
    stopMouseSimulation();
  } else {
    startCircularMovement();
  }
}
function moveMouseToSide(side) {
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
function simulateMoveAndClick(targetX, targetY, shouldClick) {
  const targetElement = getGameCanvas();
  if (!targetElement) {
    return;
  }
  const playerPosition = getFirstAnimalPosition();
  if (!playerPosition) {
    return;
  }
  const elementRect = targetElement.getBoundingClientRect();
  const centerX = elementRect.left + elementRect.width / 2;
  const centerY = elementRect.top + elementRect.height / 2;
  const deltaX = targetX - playerPosition.x;
  const deltaY = targetY - playerPosition.y;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  let speedMultiplier = 1;
  if (distance > 5000) {
    speedMultiplier = 3;
  } else if (distance > 2000) {
    speedMultiplier = 2;
  } else if (distance > 1000) {
    speedMultiplier = 1.5;
  } else if (distance > 500) {
    speedMultiplier = 1.2;
  } else if (distance < 50) {
    speedMultiplier = 0.5;
  } else if (distance < 150) {
    speedMultiplier = 0.8;
  }
  const offsetX = deltaX * speedMultiplier;
  const offsetY = deltaY * speedMultiplier;
  const maxOffset = Math.min(elementRect.width, elementRect.height) * 0.85;
  const currentOffset = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
  let finalX = centerX + offsetX;
  let finalY = centerY + offsetY;
  if (currentOffset > maxOffset) {
    const clampFactor = maxOffset / currentOffset;
    finalX = centerX + offsetX * clampFactor;
    finalY = centerY + offsetY * clampFactor;
  }
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
  startCircularMovement,
  stopMouseSimulation,
  toggleMouseSimulation,
  moveMouseToSide,
  simulateClick,
  simulateMoveAndClick,
};
