import {
  currentTime,
  radius,
  maxFailCount,
  timeoutLimit,
  isValidEntity,
  getGameState,
  getEntityManager,
  getFirstAnimalPosition,
  angle,
  tickInterval,
  startAutoFarm,
  state,
} from "../core.js";
import { calculateDistance, getGameCanvas } from "../utils.js";
import { showNotification } from "../ui/interaction.js";
import { moveAndClickTarget } from "./movement.js";

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

const maxDistance_tas = 400;
function handleFarmFailure(x, y) {
  const currentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(
    (timer) => currentTime - timer.time < timeoutLimit,
  );
  let existingArea = window.autoFarmSkipAreas.find(
    (position) =>
      calculateDistance(x, y, state.position.x, state.position.y) <
      maxDistance_tas,
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
      radius: maxDistance_tas,
      time: currentTime,
      failCount: 1,
      skipped: false,
    });
  }
}
function isAreaSkipped(x, y) {
  const currentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(
    (timerState) => currentTime - timerState.time < timeoutLimit,
  );
  return window.autoFarmSkipAreas.some(
    (cellState) =>
      cellState.skipped &&
      calculateDistance(x, y, cellState.x, cellState.y) < cellState.radius,
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
      const myY =
        targetEntity.position?._x !== undefined
          ? targetEntity.position._x
          : targetEntity.position?.x;
      const posY =
        targetEntity.position?._y !== undefined
          ? targetEntity.position._y
          : targetEntity.position?.y;
      if (
        myY == null ||
        posY == null ||
        isValidEntity(targetEntity) ||
        isAreaSkipped(myY, posY)
      ) {
        return;
      }
      const distance = calculateDistance(playerX, playerY, myY, posY);
      if (distance < minDistance && distance < farmRange) {
        minDistance = distance;
        closestEntity = {
          id: targetEntity.id,
          x: myY,
          y: posY,
          distance: distance,
          entity: targetEntity,
        };
      }
    });
    return closestEntity;
  } catch (error) {
    return null;
  }
}
function findNearbyFarmableEntities(farmRange) {
  farmRange = farmRange || window.autoFarmRange;
  try {
    const gameState = getGameState();
    const entityManager = getEntityManager(gameState);
    const playerAnimal = gameState?.myAnimals?.[0];
    if (!entityManager || !playerAnimal) {
      return [];
    }
    const playerX =
      playerAnimal.position._x !== undefined
        ? playerAnimal.position._x
        : playerAnimal.position.x;
    const playerY =
      playerAnimal.position._y !== undefined
        ? playerAnimal.position._y
        : playerAnimal.position.y;
    const nearbyEntities = [];
    (entityManager.entitiesList || []).forEach((targetEntity) => {
      if (
        !targetEntity ||
        targetEntity.id === playerAnimal.id ||
        window.autoFarmSkipIds.has(targetEntity.id)
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
      if (
        myY == null ||
        posY == null ||
        isValidEntity(targetEntity) ||
        isAreaSkipped(myY, posY)
      ) {
        return;
      }
      const distanceToTarget = calculateDistance(playerX, playerY, myY, posY);
      if (distanceToTarget < farmRange) {
        nearbyEntities.push({
          id: targetEntity.id,
          x: myY,
          y: posY,
          distance: distanceToTarget,
          entity: targetEntity,
        });
      }
    });
    return nearbyEntities.sort(
      (entityA, entityB) => entityA.distance - entityB.distance,
    );
  } catch (error) {
    return [];
  }
}
function findDensestFoodCluster(rangeThreshold, customRange) {
  const foodPoints = findNearbyFarmableEntities(
    customRange || window.autoFarmRange,
  );
  if (!foodPoints.length) {
    return null;
  }
  let bestCluster = null;
  let maxFoodCount = 0;
  foodPoints.forEach((calculateAveragePosition) => {
    let count = 0;
    let sumX = 0;
    let sumY = 0;
    foodPoints.forEach((targetPosition) => {
      if (
        calculateDistance(
          calculateAveragePosition.x,
          calculateAveragePosition.y,
          targetPosition.x,
          targetPosition.y,
        ) < (rangeThreshold || 500)
      ) {
        count++;
        sumX += targetPosition.x;
        sumY += targetPosition.y;
      }
    });
    if (count > maxFoodCount) {
      maxFoodCount = count;
      bestCluster = {
        x: sumX / count,
        y: sumY / count,
        foodCount: count,
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
      const currentDistance = calculateDistance(
        playerPosition.x,
        playerPosition.y,
        myY,
        posY,
      );
      if (currentDistance < window.autoFarmAvoidDistance) {
        const diffX = playerPosition.x - myY;
        const diffY = playerPosition.y - posY;
        const distance = Math.sqrt(diffX * diffX + diffY * diffY);
        const avoidanceFactor =
          (window.autoFarmAvoidDistance - Math.max(currentDistance, 50)) /
          window.autoFarmAvoidDistance;
        if (distance > 0) {
          avoidX += (diffX / distance) * avoidanceFactor * 500;
          avoidY += (diffY / distance) * avoidanceFactor * 500;
        }
      }
    });
  } catch (data) {}
  return {
    x: avoidX,
    y: avoidY,
  };
}
function triggerRandomEvolution() {
  if (!window.autoFarmEvolve) {
    return;
  }
  const currentTime = Date.now();
  if (currentTime - state.lastEventTime < 5000) {
    return;
  }
  state.lastEventTime = currentTime;
  const targetElement = getGameCanvas();
  const randomDigit = String(Math.floor(Math.random() * 9) + 1);
  const eventProperties = {
    key: randomDigit,
    code: "Digit" + randomDigit,
    keyCode: randomDigit.charCodeAt(0),
    which: randomDigit.charCodeAt(0),
    bubbles: true,
    cancelable: true,
  };
  [window, document, document.body, targetElement].forEach((eventTarget) => {
    if (!eventTarget) {
      return;
    }
    try {
      eventTarget.dispatchEvent(new KeyboardEvent("keydown", eventProperties));
      setTimeout(
        () =>
          eventTarget.dispatchEvent(
            new KeyboardEvent("keyup", eventProperties),
          ),
        50,
      );
    } catch (data) {}
  });
}
function detectAndHandleStuck(currentPos) {
  const now = Date.now();
  if (now - state.lastValue < 1500) {
    return false;
  }
  state.lastValue = now;
  if (state.position_s2v) {
    if (
      calculateDistance(
        currentPos.x,
        currentPos.y,
        state.position_s2v.x,
        state.position_s2v.y,
      ) < 25
    ) {
      state.counter_qpz++;
      if (state.counter_qpz >= 1 && window.autoFarmCurrentTarget) {
        handleFarmFailure(
          window.autoFarmCurrentTarget.x,
          window.autoFarmCurrentTarget.y,
        );
        window.autoFarmSkipIds.add(window.autoFarmCurrentTarget.id);
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        state.counter_qpz = 0;
      }
      if (state.counter_qpz >= 2) {
        state.counter_qpz = 0;
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        const randomAngle = Math.random() * Math.PI * 2;
        moveAndClickTarget(
          currentPos.x + Math.cos(randomAngle) * 1500,
          currentPos.y + Math.sin(randomAngle) * 1500,
          true,
        );
        return true;
      }
    } else {
      state.counter_qpz = 0;
    }
  }
  state.position_s2v = {
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
    state.isToggled_s1e = false;
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
    const currentTarget = getFirstAnimalPosition();
    if (!currentTarget) {
      window.autoFarmActive = false;
      state.isToggled_s1e = false;
      const autoFarmButton = document.getElementById("autoFarmBtn");
      if (autoFarmButton) {
        autoFarmButton.textContent = "Auto Farm";
        autoFarmButton.classList.remove("toggle-on");
      }
      return;
    }
    if (Math.random() < 0.015) {
      triggerRandomEvolution();
    }
    if (detectAndHandleStuck(currentTarget)) {
      setTimeout(autoFarmLoop, 100);
      return;
    }
    const playerOffset = calculatePlayerAvoidanceVector();
    if (
      (Math.abs(playerOffset.x) > 100 || Math.abs(playerOffset.y) > 100) &&
      window.autoFarmAvoidPlayers
    ) {
      const shouldBoost =
        window.autoFarmBoost && currentTime - state.lastTickTime > tickInterval;
      if (shouldBoost) {
        state.lastTickTime = currentTime;
      }
      moveAndClickTarget(
        currentTarget.x + playerOffset.x,
        currentTarget.y + playerOffset.y,
        shouldBoost,
      );
      setTimeout(autoFarmLoop, 60);
      return;
    }
    let targetX = null;
    let targetY = null;
    let minDistance = Infinity;
    if (window.autoFarmMode === "nearest") {
      const nearestTarget = findClosestFarmableEntity();
      if (nearestTarget) {
        targetX = nearestTarget.x + playerOffset.x * 0.3;
        targetY = nearestTarget.y + playerOffset.y * 0.3;
        minDistance = nearestTarget.distance;
        if (
          !window.autoFarmCurrentTarget ||
          window.autoFarmCurrentTarget.id !== nearestTarget.id
        ) {
          if (window.autoFarmCurrentTarget) {
            window.autoFarmStats.collected++;
          }
          window.autoFarmCurrentTarget = nearestTarget;
          window.autoFarmTargetStartTime = currentTime;
          state.counter_qpz = 0;
        }
        if (nearestTarget.distance < 40) {
          targetX += (Math.random() - 0.5) * 80;
          targetY += (Math.random() - 0.5) * 80;
        }
      } else {
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        if (currentTime - state.previousValue > 2500) {
          angle = Math.random() * Math.PI * 2;
          state.previousValue = currentTime;
        }
        targetX = currentTarget.x + Math.cos(angle) * 1000;
        targetY = currentTarget.y + Math.sin(angle) * 1000;
        minDistance = 1000;
      }
    } else if (window.autoFarmMode === "cluster") {
      const farmTarget = findDensestFoodCluster(500, window.autoFarmRange);
      if (farmTarget && farmTarget.foodCount >= 2) {
        targetX = farmTarget.x + playerOffset.x * 0.3;
        targetY = farmTarget.y + playerOffset.y * 0.3;
        minDistance = calculateDistance(
          currentTarget.x,
          currentTarget.y,
          farmTarget.x,
          farmTarget.y,
        );
      } else {
        const selectedTarget = findClosestFarmableEntity();
        if (selectedTarget) {
          targetX = selectedTarget.x;
          targetY = selectedTarget.y;
          minDistance = selectedTarget.distance;
          if (
            !window.autoFarmCurrentTarget ||
            window.autoFarmCurrentTarget.id !== selectedTarget.id
          ) {
            window.autoFarmCurrentTarget = selectedTarget;
            window.autoFarmTargetStartTime = currentTime;
          }
        } else {
          window.autoFarmCurrentTarget = null;
          window.autoFarmTargetStartTime = 0;
          if (currentTime - state.previousValue > 2500) {
            angle = Math.random() * Math.PI * 2;
            state.previousValue = currentTime;
          }
          targetX = currentTarget.x + Math.cos(angle) * 1000;
          targetY = currentTarget.y + Math.sin(angle) * 1000;
          minDistance = 1000;
        }
      }
    } else if (window.autoFarmMode === "patrol") {
      if (!window.autoFarmPatrolPoints.length) {
        setupPatrolPoints();
      }
      const selectedTarget_zfk = findClosestFarmableEntity(800);
      if (selectedTarget_zfk) {
        targetX = selectedTarget_zfk.x;
        targetY = selectedTarget_zfk.y;
        minDistance = selectedTarget_zfk.distance;
        if (
          !window.autoFarmCurrentTarget ||
          window.autoFarmCurrentTarget.id !== selectedTarget_zfk.id
        ) {
          window.autoFarmCurrentTarget = selectedTarget_zfk;
          window.autoFarmTargetStartTime = currentTime;
        }
      } else {
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        const currentPatrolPoint =
          window.autoFarmPatrolPoints[window.autoFarmPatrolIndex];
        if (currentPatrolPoint) {
          minDistance = calculateDistance(
            currentTarget.x,
            currentTarget.y,
            currentPatrolPoint.x,
            currentPatrolPoint.y,
          );
          if (minDistance < 200) {
            window.autoFarmPatrolIndex =
              (window.autoFarmPatrolIndex + 1) %
              window.autoFarmPatrolPoints.length;
          }
          targetX = currentPatrolPoint.x;
          targetY = currentPatrolPoint.y;
        }
      }
    }
    if (targetX != null) {
      const angle =
        window.autoFarmBoost &&
        minDistance > 350 &&
        currentTime - state.lastTickTime > tickInterval;
      if (angle) {
        state.lastTickTime = currentTime;
      }
      moveAndClickTarget(targetX, targetY, angle);
    }
  } catch (data) {
    console.error("[AutoFarm]", data);
  }
  setTimeout(autoFarmLoop, 60);
}
function stopAutoFarm() {
  window.autoFarmActive = false;
  state.isToggled_s1e = false;
  showNotification(
    "Farm stopped. ~" +
      window.autoFarmStats.collected +
      " food in " +
      ((Date.now() - window.autoFarmStats.startTime) / 1000).toFixed(0) +
      "s",
  );
}
document.addEventListener("keydown", (event_6gv) => {
  if (event_6gv.target.matches("input,textarea,select")) {
    return;
  }
  if (event_6gv.key === "F5") {
    event_6gv.preventDefault();
    if (window.autoFarmActive) {
      stopAutoFarm();
      const autoFarmBtn = document.getElementById("autoFarmBtn");
      if (autoFarmBtn) {
        autoFarmBtn.textContent = "Auto Farm";
        autoFarmBtn.classList.remove("toggle-on");
      }
    } else {
      const farmModeSelect = document.getElementById("farmModeSelect");
      startAutoFarm(farmModeSelect ? farmModeSelect.value : "nearest");
      const autoFarmBtn_6li = document.getElementById("autoFarmBtn");
      if (autoFarmBtn_6li) {
        autoFarmBtn_6li.textContent = "Stop Farm";
        autoFarmBtn_6li.classList.add("toggle-on");
      }
    }
  }
});

export {
  handleFarmFailure,
  isAreaSkipped,
  findClosestFarmableEntity,
  findNearbyFarmableEntities,
  findDensestFoodCluster,
  calculatePlayerAvoidanceVector,
  triggerRandomEvolution,
  detectAndHandleStuck,
  setupPatrolPoints,
  autoFarmLoop,
  stopAutoFarm,
};
