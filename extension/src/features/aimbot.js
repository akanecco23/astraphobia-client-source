import {
  getAnimalPosition,
  extractPosition,
  buildEntityState,
  calculateDistance,
  moveAndClickElement,
} from "./movement.js";
import { findEntityById, getGameState, isAreaSkipped } from "./autofarm.js";
import { getGameCanvas, updateLockButtonUI } from "../ui/radar.js";
import { isProcessed, getEntityManager, state } from "../core.js";
import { showNotification } from "../ui/interaction.js";
import { isValidEntity } from "../utils.js";

window.lockEnabled = false;
window.lockTargetId = null;
window.autoDodgeEnabled = false;

function updateLockLoop() {
  if (!isProcessed) {
    return;
  }
  requestAnimationFrame(updateLockLoop);
  if (!window.lockEnabled || !window.lockTargetId) {
    return;
  }
  try {
    const targetEntity = findEntityById(window.lockTargetId);
    if (!targetEntity) {
      showNotification("Lock target lost");
      window.lockTargetId = null;
      window.lockEnabled = false;
      updateLockButtonUI();
      return;
    }
    const targetPos = extractPosition(targetEntity);
    const currentPos = getAnimalPosition();
    if (!targetPos || !currentPos) {
      return;
    }
    const canvas = getGameCanvas();
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const relX = targetPos.x - currentPos.x;
    const relY = targetPos.y - currentPos.y;
    const distToTarget = Math.sqrt(relX * relX + relY * relY);
    let predictedX = targetPos.x;
    let predictedY = targetPos.y;
    if (targetEntity.velocity) {
      const velX = targetEntity.velocity._x || targetEntity.velocity.x || 0;
      const velY = targetEntity.velocity._y || targetEntity.velocity.y || 0;
      const predictionFactor = Math.min(distToTarget / 800, 0.5);
      predictedX += velX * predictionFactor;
      predictedY += velY * predictionFactor;
    }
    const finalRelX = predictedX - currentPos.x;
    const finalRelY = predictedY - currentPos.y;
    const finalDist = Math.sqrt(finalRelX * finalRelX + finalRelY * finalRelY);
    let multiplier = 1.5;
    if (finalDist > 2000) {
      multiplier = 3;
    } else if (finalDist > 1000) {
      multiplier = 2;
    } else if (finalDist < 200) {
      multiplier = 0.8;
    }
    const maxOffset = Math.min(rect.width, rect.height) * 0.85;
    let scaledX = finalRelX * multiplier;
    let scaledY = finalRelY * multiplier;
    const scaledDist = Math.sqrt(scaledX * scaledX + scaledY * scaledY);
    if (scaledDist > maxOffset) {
      const scaleFactor = maxOffset / scaledDist;
      scaledX *= scaleFactor;
      scaledY *= scaleFactor;
    }
    canvas.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: centerX + scaledX,
        clientY: centerY + scaledY,
        bubbles: true,
        view: window,
      }),
    );
  } catch (context) {}
}
function toggleLock() {
  if (window.lockEnabled && window.lockTargetId) {
    window.lockEnabled = false;
    window.lockTargetId = null;
    showNotification("Lock released");
  } else {
    const currentState = buildEntityState();
    if (
      currentState &&
      currentState.players &&
      currentState.players.length > 0
    ) {
      window.lockEnabled = true;
      window.lockTargetId = currentState.players[0].id;
      const targetName =
        currentState.players[0].entity?.name || "ID:" + window.lockTargetId;
      showNotification("Locked: " + targetName);
    } else {
      showNotification("No players to lock on");
    }
  }
  updateLockButtonUI();
}
function trackNearestPlayer() {
  const gameData = buildEntityState();
  if (gameData && gameData.players && gameData.players.length > 0) {
    window.espTrackedEntityId = gameData.players[0].id;
    showNotification(
      "Tracking: " +
        (gameData.players[0].entity?.name || window.espTrackedEntityId),
    );
  } else {
    showNotification("No players nearby");
  }
}
function clearTracking() {
  window.espTrackedEntityId = null;
  showNotification("Tracking cleared");
}
const maxDistance = 600;
const maxDistanceThreshold = 800;
let lastPositionTimestamp = 0;
let currentCoordinates = null;
let iterationCounter = 0;
let previousPositionTimestamp = 0;
let dataBuffer = [];
function autoDodgeLoop() {
  if (!state.isTextInterceptorInitialized) {
    return;
  }
  setTimeout(autoDodgeLoop, 80);
  if (!window.autoDodgeEnabled) {
    return;
  }
  try {
    const currentPos = getAnimalPosition();
    if (!currentPos) {
      return;
    }
    const gameState = getGameState();
    const worldData = getEntityManager(gameState);
    const myAnimal = gameState?.myAnimals?.[0];
    if (!worldData || !myAnimal) {
      return;
    }
    let nearbyEntities = [];
    (worldData.entitiesList || []).forEach((targetEntity) => {
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
        currentPos.x,
        currentPos.y,
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
      currentCoordinates = null;
      iterationCounter = 0;
      dataBuffer = [];
      return;
    }
    const now = Date.now();
    let hasMoved = false;
    if (now - previousPositionTimestamp > 600) {
      previousPositionTimestamp = now;
      if (currentCoordinates) {
        const distFromLastPos = calculateDistance(
          currentPos.x,
          currentPos.y,
          currentCoordinates.x,
          currentCoordinates.y,
        );
        if (distFromLastPos < 20) {
          iterationCounter++;
          hasMoved = true;
        } else {
          iterationCounter = 0;
          dataBuffer = [];
        }
      }
      currentCoordinates = {
        x: currentPos.x,
        y: currentPos.y,
      };
    }
    let sumX = 0;
    let sumY = 0;
    nearbyEntities.forEach((sourceEntity) => {
      const deltaX = currentPos.x - sourceEntity.x;
      const deltaY = currentPos.y - sourceEntity.y;
      const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (magnitude > 0.01) {
        const normalizedDistance =
          (maxDistance - sourceEntity.dist) / maxDistance;
        sumX += (deltaX / magnitude) * normalizedDistance;
        sumY += (deltaY / magnitude) * normalizedDistance;
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
    let arrowAngle = Math.atan2(sumY, sumX);
    if (hasMoved && iterationCounter >= 1) {
      const anglePresets = [
        Math.PI / 4,
        -Math.PI / 4,
        Math.PI / 2,
        -Math.PI / 2,
        (Math.PI * 3) / 4,
        (-Math.PI * 3) / 4,
      ];
      let previousAngle = arrowAngle;
      let maxProjection = -Infinity;
      for (const angleOffset of anglePresets) {
        const rotatedAngle = arrowAngle + angleOffset;
        if (
          dataBuffer.some(
            (currentAngle) => Math.abs(currentAngle - rotatedAngle) < 0.3,
          ) &&
          iterationCounter < 5
        ) {
          continue;
        }
        let currentProjection = 0;
        nearbyEntities.forEach((positionEntity) => {
          currentProjection -=
            Math.cos(rotatedAngle) * (positionEntity.x - currentPos.x) +
            Math.sin(rotatedAngle) * (positionEntity.y - currentPos.y);
        });
        if (currentProjection > maxProjection) {
          maxProjection = currentProjection;
          previousAngle = rotatedAngle;
        }
      }
      arrowAngle = previousAngle;
      dataBuffer.push(arrowAngle);
      if (dataBuffer.length > 8) {
        dataBuffer.shift();
      }
      if (iterationCounter >= 5) {
        arrowAngle += Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
        iterationCounter = 0;
        dataBuffer = [];
      }
    }
    const isDistanceExceeded =
      now - lastPositionTimestamp > maxDistanceThreshold;
    if (isDistanceExceeded) {
      lastPositionTimestamp = now;
    }
    moveAndClickElement(
      currentPos.x + Math.cos(arrowAngle) * 2000,
      currentPos.y + Math.sin(arrowAngle) * 2000,
      isDistanceExceeded,
    );
  } catch (dataContainer) {}
}
function enableAutoDodge() {
  window.autoDodgeEnabled = true;
  currentCoordinates = null;
  iterationCounter = 0;
  dataBuffer = [];
  if (!state.isTextInterceptorInitialized) {
    state.isTextInterceptorInitialized = true;
    autoDodgeLoop();
  }
  showNotification("Auto dodge enabled");
}
function disableAutoDodge() {
  window.autoDodgeEnabled = false;
  showNotification("Auto dodge disabled");
}
function findNearestEntity(range) {
  range = range || window.autoFarmRange;
  try {
    const gameState = getGameState();
    const worldData = getEntityManager(gameState);
    const playerAnimal = gameState?.myAnimals?.[0];
    if (!worldData || !playerAnimal) {
      return null;
    }
    const playerX =
      playerAnimal.position._x !== undefined
        ? playerAnimal.position._x
        : playerAnimal.position.x;
    const playerY =
      playerAnimal.position._y !== undefined
        ? playerAnimal.position._y
        : playerAnimal.position.y;
    let nearestEntity = null;
    let minDistance = Infinity;
    (worldData.entitiesList || []).forEach((targetEntity) => {
      if (
        !targetEntity ||
        targetEntity.id === playerAnimal.id ||
        window.autoFarmSkipIds.has(targetEntity.id)
      ) {
        return;
      }
      const posX =
        targetEntity.position?._x !== undefined
          ? targetEntity.position._x
          : targetEntity.position?.x;
      const posY =
        targetEntity.position?._y !== undefined
          ? targetEntity.position._y
          : targetEntity.position?.y;
      if (
        posX == null ||
        posY == null ||
        isValidEntity(targetEntity) ||
        isAreaSkipped(posX, posY)
      ) {
        return;
      }
      const distance = calculateDistance(playerX, playerY, posX, posY);
      if (distance < minDistance && distance < range) {
        minDistance = distance;
        nearestEntity = {
          id: targetEntity.id,
          x: posX,
          y: posY,
          distance: distance,
          entity: targetEntity,
        };
      }
    });
    return nearestEntity;
  } catch (error) {
    return null;
  }
}
function findEntitiesInRange(searchRange) {
  searchRange = searchRange || window.autoFarmRange;
  try {
    const state = getGameState();
    const world = getEntityManager(state);
    const myAnimal = state?.myAnimals?.[0];
    if (!world || !myAnimal) {
      return [];
    }
    const myX =
      myAnimal.position._x !== undefined
        ? myAnimal.position._x
        : myAnimal.position.x;
    const myY =
      myAnimal.position._y !== undefined
        ? myAnimal.position._y
        : myAnimal.position.y;
    const entitiesInRange = [];
    (world.entitiesList || []).forEach((targetEntity) => {
      if (
        !targetEntity ||
        targetEntity.id === myAnimal.id ||
        window.autoFarmSkipIds.has(targetEntity.id)
      ) {
        return;
      }
      const posX =
        targetEntity.position?._x !== undefined
          ? targetEntity.position._x
          : targetEntity.position?.x;
      const posY =
        targetEntity.position?._y !== undefined
          ? targetEntity.position._y
          : targetEntity.position?.y;
      if (
        posX == null ||
        posY == null ||
        isValidEntity(targetEntity) ||
        isAreaSkipped(posX, posY)
      ) {
        return;
      }
      const distance = calculateDistance(myX, myY, posX, posY);
      if (distance < searchRange) {
        entitiesInRange.push({
          id: targetEntity.id,
          x: posX,
          y: posY,
          distance: distance,
          entity: targetEntity,
        });
      }
    });
    return entitiesInRange.sort(
      (entityA, entityB) => entityA.distance - entityB.distance,
    );
  } catch (err) {
    return [];
  }
}
function calculateAvoidanceVector() {
  if (!window.autoFarmAvoidPlayers) {
    return {
      x: 0,
      y: 0,
    };
  }
  const myPosition = getAnimalPosition();
  if (!myPosition) {
    return {
      x: 0,
      y: 0,
    };
  }
  let avoidX = 0;
  let avoidY = 0;
  try {
    const gameState = getGameState();
    const worldData = getEntityManager(gameState);
    const myAnimal = gameState?.myAnimals?.[0];
    if (!worldData || !myAnimal) {
      return {
        x: 0,
        y: 0,
      };
    }
    (worldData.entitiesList || []).forEach((targetEntity) => {
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
        myPosition.x,
        myPosition.y,
        targetX,
        targetY,
      );
      if (distanceToTarget < window.autoFarmAvoidDistance) {
        const deltaX = myPosition.x - targetX;
        const deltaY = myPosition.y - targetY;
        const hypotenuse = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const avoidanceFactor =
          (window.autoFarmAvoidDistance - Math.max(distanceToTarget, 50)) /
          window.autoFarmAvoidDistance;
        if (hypotenuse > 0) {
          avoidX += (deltaX / hypotenuse) * avoidanceFactor * 500;
          avoidY += (deltaY / hypotenuse) * avoidanceFactor * 500;
        }
      }
    });
  } catch (error) {}
  return {
    x: avoidX,
    y: avoidY,
  };
}

export {
  updateLockLoop,
  toggleLock,
  trackNearestPlayer,
  clearTracking,
  autoDodgeLoop,
  enableAutoDodge,
  disableAutoDodge,
  findNearestEntity,
  findEntitiesInRange,
  calculateAvoidanceVector,
};
