import { calculateDistance, isPlayer, getGameCanvas } from "../utils.js";
import { showNotification } from "../ui/interaction.js";
import {
  radius,
  proximityThreshold,
  maxFailCount,
  timeoutLimit,
  getGameState,
  getEntityManager,
  getFirstAnimalPosition,
  randomAngle,
  timeThreshold,
  state,
} from "../core.js";
import { movePointerToTarget } from "./aimbot.js";

window.autoFarmActive = false;
window.autoFarmMode = "nearest";
window.autoFarmRange = 3000;
window.autoFarmBoost = true;
window.autoFarmEvolve = true;
window.autoFarmAvoidPlayers = true;
window.autoFarmAvoidDistance = 800;
window.autoFarmStats = {
  collected: 0,
  startTime: 0,
};
window.autoFarmPatrolPoints = [];
window.autoFarmPatrolIndex = 0;
window.autoFarmCurrentTarget = null;
window.autoFarmTargetStartTime = 0;
window.autoFarmSkipIds = new Set();
window.autoFarmSkipClearTime = 0;
window.autoFarmSkipAreas = [];

function handleFarmFailure(x, y) {
  const currentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(
    (timeData) => currentTime - timeData.time < timeoutLimit,
  );
  let existingArea = window.autoFarmSkipAreas.find(
    (position) =>
      calculateDistance(x, y, position.x, position.y) < proximityThreshold,
  );
  if (existingArea) {
    existingArea.failCount++;
    existingArea.time = currentTime;
    if (existingArea.failCount >= maxFailCount) {
      existingArea.skipped = true;
      showNotification("Skipping unreachable food area");
    }
  } else {
    window.autoFarmSkipAreas.push({
      x: x,
      y: y,
      radius: proximityThreshold,
      time: currentTime,
      failCount: 1,
      skipped: false,
    });
  }
}
function isAreaSkipped(x, y) {
  const currentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(
    (currentTime) => currentTime - currentTime.time < timeoutLimit,
  );
  return window.autoFarmSkipAreas.some(
    (cell) =>
      cell.skipped && calculateDistance(x, y, cell.x, cell.y) < cell.radius,
  );
}
function findClosestFarmableEntity(farmRange) {
  farmRange = farmRange || window.autoFarmRange;
  try {
    const gameState = getGameState();
    const entityManager = getEntityManager(gameState);
    const playerAnimal = gameState?.myAnimals?.[0];
    if (!entityManager || !playerAnimal) {
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
    let closestEntity = null;
    let minDistance = Infinity;
    (entityManager.entitiesList || []).forEach((targetEntity) => {
      if (
        !targetEntity ||
        targetEntity.id === playerAnimal.id ||
        window.autoFarmSkipIds.has(targetEntity.id)
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
      if (
        targetX == null ||
        targetY == null ||
        isPlayer(targetEntity) ||
        isAreaSkipped(targetX, targetY)
      ) {
        return;
      }
      const distanceToTarget = calculateDistance(
        playerX,
        playerY,
        targetX,
        targetY,
      );
      if (distanceToTarget < minDistance && distanceToTarget < farmRange) {
        minDistance = distanceToTarget;
        closestEntity = {
          id: targetEntity.id,
          x: targetX,
          y: targetY,
          distance: distanceToTarget,
          entity: targetEntity,
        };
      }
    });
    return closestEntity;
  } catch (error) {
    return null;
  }
}
function getNearbyFarmables(farmRange) {
  farmRange = farmRange || window.autoFarmRange;
  try {
    const gameState = getGameState();
    const worldData = getEntityManager(gameState);
    const myAnimal = gameState?.myAnimals?.[0];
    if (!worldData || !myAnimal) {
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
    const farmables = [];
    (worldData.entitiesList || []).forEach((targetEntity) => {
      if (
        !targetEntity ||
        targetEntity.id === myAnimal.id ||
        window.autoFarmSkipIds.has(targetEntity.id)
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
      if (
        targetX == null ||
        targetY == null ||
        isPlayer(targetEntity) ||
        isAreaSkipped(targetX, targetY)
      ) {
        return;
      }
      const distanceToTarget = calculateDistance(myX, myY, targetX, targetY);
      if (distanceToTarget < farmRange) {
        farmables.push({
          id: targetEntity.id,
          x: targetX,
          y: targetY,
          distance: distanceToTarget,
          entity: targetEntity,
        });
      }
    });
    return farmables.sort(
      (entityA, entityB) => entityA.distance - entityB.distance,
    );
  } catch (error) {
    return [];
  }
}
function findBestFoodCluster(clusterRadius, foodPoints) {
  const points = getNearbyFarmables(foodPoints || window.autoFarmRange);
  if (!points.length) {
    return null;
  }
  let bestCluster = null;
  let maxCount = 0;
  points.forEach((calculateAveragePosition) => {
    let pointCount = 0;
    let sumX = 0;
    let sumY = 0;
    points.forEach((targetPosition) => {
      if (
        calculateDistance(
          calculateAveragePosition.x,
          calculateAveragePosition.y,
          targetPosition.x,
          targetPosition.y,
        ) < (clusterRadius || 500)
      ) {
        pointCount++;
        sumX += targetPosition.x;
        sumY += targetPosition.y;
      }
    });
    if (pointCount > maxCount) {
      maxCount = pointCount;
      bestCluster = {
        x: sumX / pointCount,
        y: sumY / pointCount,
        foodCount: pointCount,
      };
    }
  });
  return bestCluster;
}
function calculatePlayerAvoidanceVector() {
  if (!window.autoFarmAvoidPlayers) {
    return {
      x: 0,
      y: 0,
    };
  }
  const playerPosition = getFirstAnimalPosition();
  if (!playerPosition) {
    return {
      x: 0,
      y: 0,
    };
  }
  let avoidX = 0;
  let avoidY = 0;
  try {
    const gameState = getGameState();
    const entities = getEntityManager(gameState);
    const myAnimal = gameState?.myAnimals?.[0];
    if (!entities || !myAnimal) {
      return {
        x: 0,
        y: 0,
      };
    }
    (entities.entitiesList || []).forEach((targetEntity) => {
      if (
        !targetEntity ||
        targetEntity.id === myAnimal.id ||
        !isPlayer(targetEntity)
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
      const distance = calculateDistance(
        playerPosition.x,
        playerPosition.y,
        targetX,
        targetY,
      );
      if (distance < window.autoFarmAvoidDistance) {
        const deltaX = playerPosition.x - targetX;
        const deltaY = playerPosition.y - targetY;
        const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const avoidanceFactor =
          (window.autoFarmAvoidDistance - Math.max(distance, 50)) /
          window.autoFarmAvoidDistance;
        if (magnitude > 0) {
          avoidX += (deltaX / magnitude) * avoidanceFactor * 500;
          avoidY += (deltaY / magnitude) * avoidanceFactor * 500;
        }
      }
    });
  } catch (data) {}
  return {
    x: avoidX,
    y: avoidY,
  };
}
function simulateEvolveKey() {
  if (!window.autoFarmEvolve) {
    return;
  }
  const now = Date.now();
  if (now - state.lastValue < 5000) {
    return;
  }
  state.lastValue = now;
  const gameCanvas = getGameCanvas();
  const randomDigit = String(Math.floor(Math.random() * 9) + 1);
  const eventInit = {
    key: randomDigit,
    code: "Digit" + randomDigit,
    keyCode: randomDigit.charCodeAt(0),
    which: randomDigit.charCodeAt(0),
    bubbles: true,
    cancelable: true,
  };
  [window, document, document.body, gameCanvas].forEach((targetElement) => {
    if (!targetElement) {
      return;
    }
    try {
      targetElement.dispatchEvent(new KeyboardEvent("keydown", eventInit));
      setTimeout(
        () =>
          targetElement.dispatchEvent(new KeyboardEvent("keyup", eventInit)),
        50,
      );
    } catch (context) {}
  });
}
function detectAndHandleStuck(currentPos) {
  const now = Date.now();
  if (now - state.lastTimestamp_2 < 1500) {
    return false;
  }
  state.lastTimestamp_2 = now;
  if (state.currentPosition) {
    if (
      calculateDistance(
        currentPos.x,
        currentPos.y,
        state.currentPosition.x,
        state.currentPosition.y,
      ) < 25
    ) {
      state.counter_2++;
      if (state.counter_2 >= 1 && window.autoFarmCurrentTarget) {
        handleFarmFailure(
          window.autoFarmCurrentTarget.x,
          window.autoFarmCurrentTarget.y,
        );
        window.autoFarmSkipIds.add(window.autoFarmCurrentTarget.id);
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        state.counter_2 = 0;
      }
      if (state.counter_2 >= 2) {
        state.counter_2 = 0;
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        const randomAngle = Math.random() * Math.PI * 2;
        movePointerToTarget(
          currentPos.x + Math.cos(randomAngle) * 1500,
          currentPos.y + Math.sin(randomAngle) * 1500,
          true,
        );
        return true;
      }
    } else {
      state.counter_2 = 0;
    }
  }
  state.currentPosition = {
    x: currentPos.x,
    y: currentPos.y,
  };
  return false;
}
function setupPatrolPoints() {
  const centerPos = getFirstAnimalPosition();
  if (!centerPos) {
    return;
  }
  window.autoFarmPatrolPoints = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6;
    window.autoFarmPatrolPoints.push({
      x: centerPos.x + Math.cos(angle) * 2000,
      y: centerPos.y + Math.sin(angle) * 2000,
    });
  }
  window.autoFarmPatrolIndex = 0;
}
function autoFarmLoop() {
  if (!window.autoFarmActive) {
    state.isActive_3 = false;
    return;
  }
  const currentTime = Date.now();
  if (currentTime - window.autoFarmSkipClearTime > 15000) {
    window.autoFarmSkipIds.clear();
    window.autoFarmSkipClearTime = currentTime;
  }
  if (
    window.autoFarmCurrentTarget &&
    window.autoFarmTargetStartTime > 0 &&
    currentTime - window.autoFarmTargetStartTime > 1000
  ) {
    handleFarmFailure(
      window.autoFarmCurrentTarget.x,
      window.autoFarmCurrentTarget.y,
    );
    window.autoFarmSkipIds.add(window.autoFarmCurrentTarget.id);
    window.autoFarmCurrentTarget = null;
    window.autoFarmTargetStartTime = 0;
    setTimeout(autoFarmLoop, 100);
    return;
  }
  try {
    const target = getFirstAnimalPosition();
    if (!target) {
      window.autoFarmActive = false;
      state.isActive_3 = false;
      const farmBtn = document.getElementById("autoFarmBtn");
      if (farmBtn) {
        farmBtn.textContent = "Auto Farm";
        farmBtn.classList.remove("toggle-on");
      }
      return;
    }
    if (Math.random() < 0.015) {
      simulateEvolveKey();
    }
    if (detectAndHandleStuck(target)) {
      setTimeout(autoFarmLoop, 100);
      return;
    }
    const playerOffset = calculatePlayerAvoidanceVector();
    if (
      (Math.abs(playerOffset.x) > 100 || Math.abs(playerOffset.y) > 100) &&
      window.autoFarmAvoidPlayers
    ) {
      const useBoost =
        window.autoFarmBoost &&
        currentTime - state.previousTimestamp > timeThreshold;
      if (useBoost) {
        state.previousTimestamp = currentTime;
      }
      movePointerToTarget(
        target.x + playerOffset.x,
        target.y + playerOffset.y,
        useBoost,
      );
      setTimeout(autoFarmLoop, 60);
      return;
    }
    let destX = null;
    let destY = null;
    let minDist = Infinity;
    if (window.autoFarmMode === "nearest") {
      const nearest = findClosestFarmableEntity();
      if (nearest) {
        destX = nearest.x + playerOffset.x * 0.3;
        destY = nearest.y + playerOffset.y * 0.3;
        minDist = nearest.distance;
        if (
          !window.autoFarmCurrentTarget ||
          window.autoFarmCurrentTarget.id !== nearest.id
        ) {
          if (window.autoFarmCurrentTarget) {
            window.autoFarmStats.collected++;
          }
          window.autoFarmCurrentTarget = nearest;
          window.autoFarmTargetStartTime = currentTime;
          state.counter_2 = 0;
        }
        if (nearest.distance < 40) {
          destX += (Math.random() - 0.5) * 80;
          destY += (Math.random() - 0.5) * 80;
        }
      } else {
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        if (currentTime - state.lastOffset > 2500) {
          randomAngle = Math.random() * Math.PI * 2;
          state.lastOffset = currentTime;
        }
        destX = target.x + Math.cos(randomAngle) * 1000;
        destY = target.y + Math.sin(randomAngle) * 1000;
        minDist = 1000;
      }
    } else if (window.autoFarmMode === "cluster") {
      const foodSource = findBestFoodCluster(500, window.autoFarmRange);
      if (foodSource && foodSource.foodCount >= 2) {
        destX = foodSource.x + playerOffset.x * 0.3;
        destY = foodSource.y + playerOffset.y * 0.3;
        minDist = calculateDistance(
          target.x,
          target.y,
          foodSource.x,
          foodSource.y,
        );
      } else {
        const currentTarget = findClosestFarmableEntity();
        if (currentTarget) {
          destX = currentTarget.x;
          destY = currentTarget.y;
          minDist = currentTarget.distance;
          if (
            !window.autoFarmCurrentTarget ||
            window.autoFarmCurrentTarget.id !== currentTarget.id
          ) {
            window.autoFarmCurrentTarget = currentTarget;
            window.autoFarmTargetStartTime = currentTime;
          }
        } else {
          window.autoFarmCurrentTarget = null;
          window.autoFarmTargetStartTime = 0;
          if (currentTime - state.lastOffset > 2500) {
            randomAngle = Math.random() * Math.PI * 2;
            state.lastOffset = currentTime;
          }
          destX = target.x + Math.cos(randomAngle) * 1000;
          destY = target.y + Math.sin(randomAngle) * 1000;
          minDist = 1000;
        }
      }
    } else if (window.autoFarmMode === "patrol") {
      if (!window.autoFarmPatrolPoints.length) {
        setupPatrolPoints();
      }
      const targetEntity = findClosestFarmableEntity(800);
      if (targetEntity) {
        destX = targetEntity.x;
        destY = targetEntity.y;
        minDist = targetEntity.distance;
        if (
          !window.autoFarmCurrentTarget ||
          window.autoFarmCurrentTarget.id !== targetEntity.id
        ) {
          window.autoFarmCurrentTarget = targetEntity;
          window.autoFarmTargetStartTime = currentTime;
        }
      } else {
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        const currentPatrolPoint =
          window.autoFarmPatrolPoints[window.autoFarmPatrolIndex];
        if (currentPatrolPoint) {
          minDist = calculateDistance(
            target.x,
            target.y,
            currentPatrolPoint.x,
            currentPatrolPoint.y,
          );
          if (minDist < 200) {
            window.autoFarmPatrolIndex =
              (window.autoFarmPatrolIndex + 1) %
              window.autoFarmPatrolPoints.length;
          }
          destX = currentPatrolPoint.x;
          destY = currentPatrolPoint.y;
        }
      }
    }
    if (destX != null) {
      const shouldBoost =
        window.autoFarmBoost &&
        minDist > 350 &&
        currentTime - state.previousTimestamp > timeThreshold;
      if (shouldBoost) {
        state.previousTimestamp = currentTime;
      }
      movePointerToTarget(destX, destY, shouldBoost);
    }
  } catch (errorMessage) {
    console.error("[AutoFarm]", errorMessage);
  }
  setTimeout(autoFarmLoop, 60);
}
function startAutoFarm(farmMode) {
  window.autoFarmMode = farmMode || "nearest";
  window.autoFarmActive = true;
  window.autoFarmStats.startTime = Date.now();
  window.autoFarmStats.collected = 0;
  window.autoFarmCurrentTarget = null;
  window.autoFarmTargetStartTime = 0;
  window.autoFarmSkipIds.clear();
  window.autoFarmSkipAreas = [];
  window.autoFarmSkipClearTime = Date.now();
  state.currentPosition = null;
  state.counter_2 = 0;
  state.lastTimestamp_2 = 0;
  state.previousTimestamp = 0;
  if (farmMode === "patrol") {
    setupPatrolPoints();
  }
  showNotification("Auto farm started (" + window.autoFarmMode + ")");
  if (!state.isActive_3) {
    state.isActive_3 = true;
    autoFarmLoop();
  }
}
function stopAutoFarm() {
  window.autoFarmActive = false;
  state.isActive_3 = false;
  showNotification(
    "Farm stopped. ~" +
      window.autoFarmStats.collected +
      " food in " +
      ((Date.now() - window.autoFarmStats.startTime) / 1000).toFixed(0) +
      "s",
  );
}
document.addEventListener("keydown", (event_5) => {
  if (event_5.target.matches("input,textarea,select")) {
    return;
  }
  if (event_5.key === "F5") {
    event_5.preventDefault();
    if (window.autoFarmActive) {
      stopAutoFarm();
      const autoFarmButton = document.getElementById("autoFarmBtn");
      if (autoFarmButton) {
        autoFarmButton.textContent = "Auto Farm";
        autoFarmButton.classList.remove("toggle-on");
      }
    } else {
      const farmModeSelect = document.getElementById("farmModeSelect");
      startAutoFarm(farmModeSelect ? farmModeSelect.value : "nearest");
      const autoFarmButton_2 = document.getElementById("autoFarmBtn");
      if (autoFarmButton_2) {
        autoFarmButton_2.textContent = "Stop Farm";
        autoFarmButton_2.classList.add("toggle-on");
      }
    }
  }
});

export {
  handleFarmFailure,
  isAreaSkipped,
  findClosestFarmableEntity,
  getNearbyFarmables,
  findBestFoodCluster,
  calculatePlayerAvoidanceVector,
  simulateEvolveKey,
  detectAndHandleStuck,
  setupPatrolPoints,
  autoFarmLoop,
  startAutoFarm,
  stopAutoFarm,
};
