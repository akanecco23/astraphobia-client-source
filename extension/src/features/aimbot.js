import {
  getFirstAnimalPosition,
  getEntityPosition,
  findEntityById,
  isProcessed_6,
  angle,
  getGameState_2,
  currentTime,
  isValidEntity,
  getGameState,
  getEntityManager,
  maxDistance,
  deltaThreshold,
  state,
} from "../core.js";
import { getGameCanvas, calculateDistance } from "../utils.js";
import { showNotification } from "../ui/interaction.js";
import { moveAndClickTarget } from "./movement.js";
import { updateLockButton } from "../ui/radar.js";

function updateLockTarget() {
  if (!isProcessed_6) {
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
      const angle = maxDimension / scaledDistance;
      scaledX *= angle;
      scaledY *= angle;
    }
    targetElement.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: centerX + scaledX,
        clientY: centerY + scaledY,
        bubbles: true,
        view: window,
      }),
    );
  } catch (data) {}
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
let previousTimestamp_2 = 0;
function autoDodgeLoop() {
  if (!state.isProcessed_7) {
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
      const myY =
        targetEntity.position?._x !== undefined
          ? targetEntity.position._x
          : targetEntity.position?.x;
      const posY =
        targetEntity.position?._y !== undefined
          ? targetEntity.position._y
          : targetEntity.position?.y;
      if (myY == null || posY == null) {
        return;
      }
      const distanceToTarget = calculateDistance(
        playerPos.x,
        playerPos.y,
        myY,
        posY,
      );
      if (distanceToTarget < maxDistance) {
        nearbyEntities.push({
          x: myY,
          y: posY,
          dist: distanceToTarget,
        });
      }
    });
    if (nearbyEntities.length === 0) {
      state.position = null;
      state.counter = 0;
      state.dataList = [];
      return;
    }
    const currentTime = Date.now();
    let isDodging = false;
    if (currentTime - previousTimestamp_2 > 600) {
      previousTimestamp_2 = currentTime;
      if (state.position) {
        const prevDist = calculateDistance(
          playerPos.x,
          playerPos.y,
          state.position.x,
          state.position.y,
        );
        if (prevDist < 20) {
          state.counter++;
          isDodging = true;
        } else {
          state.counter = 0;
          state.dataList = [];
        }
      }
      state.position = {
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
    const angle_2 = currentTime - state.previousTimestamp > deltaThreshold;
    if (angle_2) {
      state.previousTimestamp = currentTime;
    }
    moveAndClickTarget(
      playerPos.x + Math.cos(angle) * 2000,
      playerPos.y + Math.sin(angle) * 2000,
      angle_2,
    );
  } catch (data) {}
}
function enableAutoDodge() {
  window.autoDodgeEnabled = true;
  state.position = null;
  state.counter = 0;
  state.dataList = [];
  if (!state.isProcessed_7) {
    state.isProcessed_7 = true;
    autoDodgeLoop();
  }
  showNotification("Auto dodge enabled");
}

export { updateLockTarget, toggleLock, autoDodgeLoop, enableAutoDodge };
