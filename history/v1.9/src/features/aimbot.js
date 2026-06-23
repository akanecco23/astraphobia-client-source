import {
  getFirstAnimalPosition,
  getEntityPosition,
  findEntityById,
  isLoaded,
  getGameState_2,
  currentTime,
  isValidEntity,
  getGameState,
  getEntityManager,
  maxDistance,
  deltaThreshold,
  angle,
  state,
} from "../core.js";
import { showNotification } from "../ui/interaction.js";
import { updateLockButton } from "../ui/radar.js";
import { getGameCanvas, calculateDistance } from "../utils.js";
import { moveAndClickTarget } from "./movement.js";

window.autoDodgeEnabled = false;

function updateLockTarget() {
  if (!isLoaded) {
    return;
  }
  requestAnimationFrame(updateLockTarget);
  if (!window.lockEnabled || !window.lockTargetId) {
    return;
  }
  try {
    const targetEntity = findEntityById(window.lockTargetId);
    if (!targetEntity) {
      showNotification("Lock target lost");
      window.lockTargetId = null;
      window.lockEnabled = false;
      updateLockButton();
      return;
    }
    const targetPos = getEntityPosition(targetEntity);
    const myPos = getFirstAnimalPosition();
    if (!targetPos || !myPos) {
      return;
    }
    const targetElement = getGameCanvas();
    if (!targetElement) {
      return;
    }
    const rect = targetElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const targetDx = targetPos.x - myPos.x;
    const targetDy = targetPos.y - myPos.y;
    const targetDistance = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
    let predictedX = targetPos.x;
    let predictedY = targetPos.y;
    if (targetEntity.velocity) {
      const velX = targetEntity.velocity._x || targetEntity.velocity.x || 0;
      const velY = targetEntity.velocity._y || targetEntity.velocity.y || 0;
      const predictionFactor = Math.min(targetDistance / 800, 0.5);
      predictedX += velX * predictionFactor;
      predictedY += velY * predictionFactor;
    }
    const relX = predictedX - myPos.x;
    const relY = predictedY - myPos.y;
    const relDistance = Math.sqrt(relX * relX + relY * relY);
    let scaleMultiplier = 1.5;
    if (relDistance > 2000) {
      scaleMultiplier = 3;
    } else if (relDistance > 1000) {
      scaleMultiplier = 2;
    } else if (relDistance < 200) {
      scaleMultiplier = 0.8;
    }
    const maxDimension = Math.min(rect.width, rect.height) * 0.85;
    let scaledX = relX * scaleMultiplier;
    let scaledY = relY * scaleMultiplier;
    const scaledDistance = Math.sqrt(scaledX * scaledX + scaledY * scaledY);
    if (scaledDistance > maxDimension) {
      const scaleFactor = maxDimension / scaledDistance;
      scaledX *= scaleFactor;
      scaledY *= scaleFactor;
    }
    targetElement.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: centerX + scaledX,
        clientY: centerY + scaledY,
        bubbles: true,
        view: window,
      }),
    );
  } catch (tempValue) {}
}
function toggleLock() {
  if (window.lockEnabled && window.lockTargetId) {
    window.lockEnabled = false;
    window.lockTargetId = null;
    showNotification("Lock released");
  } else {
    const gameState = getGameState_2();
    if (gameState && gameState.players && gameState.players.length > 0) {
      window.lockEnabled = true;
      window.lockTargetId = gameState.players[0].id;
      const targetName =
        gameState.players[0].entity?.name || "ID:" + window.lockTargetId;
      showNotification("Locked: " + targetName);
    } else {
      showNotification("No players to lock on");
    }
  }
  updateLockButton();
}
function autoDodgeLoop() {
  if (!state.isActive) {
    return;
  }
  setTimeout(autoDodgeLoop, 80);
  if (!window.autoDodgeEnabled) {
    return;
  }
  try {
    const playerPos = getFirstAnimalPosition();
    if (!playerPos) {
      return;
    }
    const gameState = getGameState();
    const entityManager = getEntityManager(gameState);
    const myAnimal = gameState?.myAnimals?.[0];
    if (!entityManager || !myAnimal) {
      return;
    }
    let nearbyEntities = [];
    (entityManager.entitiesList || []).forEach((targetEntity) => {
      if (
        !targetEntity ||
        targetEntity.id === myAnimal.id ||
        !isValidEntity(targetEntity)
      ) {
        return;
      }
      const targetX =
        targetEntity.position?._x !== undefined
          ? targetEntity.position._x
          : targetEntity.position?.x;
      const targetY =
        targetEntity.position?._y !== undefined
          ? targetEntity.position._y
          : targetEntity.position?.y;
      if (targetX == null || targetY == null) {
        return;
      }
      const distanceToTarget = calculateDistance(
        playerPos.x,
        playerPos.y,
        targetX,
        targetY,
      );
      if (distanceToTarget < maxDistance) {
        nearbyEntities.push({
          x: targetX,
          y: targetY,
          dist: distanceToTarget,
        });
      }
    });
    if (nearbyEntities.length === 0) {
      state.currentPosition = null;
      state.counter = 0;
      state.dataList = [];
      return;
    }
    const currentTime = Date.now();
    let isDodging = false;
    if (currentTime - state.previousTimestamp > 600) {
      state.previousTimestamp = currentTime;
      if (state.currentPosition) {
        const prevDist = calculateDistance(
          playerPos.x,
          playerPos.y,
          state.currentPosition.x,
          state.currentPosition.y,
        );
        if (prevDist < 20) {
          state.counter++;
          isDodging = true;
        } else {
          state.counter = 0;
          state.dataList = [];
        }
      }
      state.currentPosition = {
        x: playerPos.x,
        y: playerPos.y,
      };
    }
    let sumX = 0;
    let sumY = 0;
    nearbyEntities.forEach((sourceEntity) => {
      const deltaX = playerPos.x - sourceEntity.x;
      const deltaY = playerPos.y - sourceEntity.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance > 0.01) {
        const distanceFactor = (maxDistance - sourceEntity.dist) / maxDistance;
        sumX += (deltaX / distance) * distanceFactor;
        sumY += (deltaY / distance) * distanceFactor;
      }
    });
    let magnitude = Math.sqrt(sumX * sumX + sumY * sumY);
    if (magnitude < 0.01) {
      sumX = 1;
      sumY = 0;
      magnitude = 1;
    }
    sumX /= magnitude;
    sumY /= magnitude;
    let angle = Math.atan2(sumY, sumX);
    if (isDodging && state.counter >= 1) {
      const anglePresets = [
        Math.PI / 4,
        -Math.PI / 4,
        Math.PI / 2,
        -Math.PI / 2,
        (Math.PI * 3) / 4,
        (-Math.PI * 3) / 4,
      ];
      let storedAngle = angle;
      let maxProjection = -Infinity;
      for (const angleOffset of anglePresets) {
        const adjustedAngle = angle + angleOffset;
        if (
          state.dataList.some(
            (currentAngle) => Math.abs(currentAngle - adjustedAngle) < 0.3,
          ) &&
          state.counter < 5
        ) {
          continue;
        }
        let projectionValue = 0;
        nearbyEntities.forEach((targetPoint) => {
          projectionValue -=
            Math.cos(adjustedAngle) * (targetPoint.x - playerPos.x) +
            Math.sin(adjustedAngle) * (targetPoint.y - playerPos.y);
        });
        if (projectionValue > maxProjection) {
          maxProjection = projectionValue;
          storedAngle = adjustedAngle;
        }
      }
      angle = storedAngle;
      state.dataList.push(angle);
      if (state.dataList.length > 8) {
        state.dataList.shift();
      }
      if (state.counter >= 5) {
        angle += Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
        state.counter = 0;
        state.dataList = [];
      }
    }
    const isAboveThreshold = currentTime - state.lastTimestamp > deltaThreshold;
    if (isAboveThreshold) {
      state.lastTimestamp = currentTime;
    }
    moveAndClickTarget(
      playerPos.x + Math.cos(angle) * 2000,
      playerPos.y + Math.sin(angle) * 2000,
      isAboveThreshold,
    );
  } catch (tempValue) {}
}
function enableAutoDodge() {
  window.autoDodgeEnabled = true;
  state.currentPosition = null;
  state.counter = 0;
  state.dataList = [];
  if (!state.isActive) {
    state.isActive = true;
    autoDodgeLoop();
  }
  showNotification("Auto dodge enabled");
}
function disableAutoDodge() {
  window.autoDodgeEnabled = false;
  showNotification("Auto dodge disabled");
}

export {
  updateLockTarget,
  toggleLock,
  autoDodgeLoop,
  enableAutoDodge,
  disableAutoDodge,
};
