import {
  currentTime,
  radius,
  timeoutLimit,
  maxFailCount,
  getGameState,
  getEntityManager,
  isAreaSkipped_sc8,
  getFirstAnimalPosition,
  angle,
  initAutoFarm,
  state,
} from "../core.js";
import { calculateDistance, isPlayer, getGameCanvas } from "../utils.js";
import { simulateMoveAndClick } from "./movement.js";
import { showToast } from "../ui/interaction.js";

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

const offsetValue_tz2 = 400;
const tickInterval_sco = 600;
function isAreaSkipped(x, y) {
  const currentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(
    (currentTime) => currentTime - currentTime.time < timeoutLimit,
  );
  return window.autoFarmSkipAreas.some(
    (circle) => calculateDistance(x, y, circle.x, circle.y) < circle.radius,
  );
}
function handleFarmFailure(x, y) {
  const currentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(
    (currentTime) => currentTime - currentTime.time < timeoutLimit,
  );
  let existingArea = window.autoFarmSkipAreas.find(
    (position) =>
      calculateDistance(x, y, state.position.x, state.position.y) <
      offsetValue_tz2,
  );
  if (existingArea) {
    existingArea.failCount++;
    existingArea.time = currentTime;
    if (existingArea.failCount >= maxFailCount) {
      existingArea.skipped = true;
      showToast("Skipping unreachable food area");
    }
  } else {
    window.autoFarmSkipAreas.push({
      x: x,
      y: y,
      radius: offsetValue_tz2,
      time: currentTime,
      failCount: 1,
      skipped: false,
    });
  }
}
function findClosestFarmable(farmRange) {
  farmRange = farmRange || window.autoFarmRange;
  try {
    const gameState = getGameState();
    const worldData = getEntityManager(gameState);
    const playerAnimal = gameState?.myAnimals?.[0];
    if (!worldData || !playerAnimal) {
      return null;
    }
    const playerX = playerAnimal.position._x || playerAnimal.position.x;
    const playerY = playerAnimal.position._y || playerAnimal.position.y;
    const entities = worldData.entitiesList || [];
    let closestEntity = null;
    let minDistance = Infinity;
    entities.forEach((targetEntity) => {
      if (!targetEntity || targetEntity.id === playerAnimal.id) {
        return;
      }
      if (window.autoFarmSkipIds.has(targetEntity.id)) {
        return;
      }
      const myY = targetEntity.position?._x || targetEntity.position?.x;
      const posY = targetEntity.position?._y || targetEntity.position?.y;
      if (myY == null || posY == null) {
        return;
      }
      if (isPlayer(targetEntity)) {
        return;
      }
      if (isAreaSkipped_sc8(myY, posY)) {
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
function getFarmableEntities(farmRange) {
  farmRange = farmRange || window.autoFarmRange;
  try {
    const gameState = getGameState();
    const worldData = getEntityManager(gameState);
    const playerAnimal = gameState?.myAnimals?.[0];
    if (!worldData || !playerAnimal) {
      return [];
    }
    const playerX = playerAnimal.position._x || playerAnimal.position.x;
    const playerY = playerAnimal.position._y || playerAnimal.position.y;
    const entities = worldData.entitiesList || [];
    const farmableList = [];
    entities.forEach((targetEntity) => {
      if (!targetEntity || targetEntity.id === playerAnimal.id) {
        return;
      }
      if (window.autoFarmSkipIds.has(targetEntity.id)) {
        return;
      }
      const posX = targetEntity.position?._x || targetEntity.position?.x;
      const posY = targetEntity.position?._y || targetEntity.position?.y;
      if (posX == null || posY == null) {
        return;
      }
      if (isPlayer(targetEntity)) {
        return;
      }
      if (isAreaSkipped_sc8(posX, posY)) {
        return;
      }
      const distance = calculateDistance(playerX, playerY, posX, posY);
      if (distance < farmRange) {
        farmableList.push({
          id: targetEntity.id,
          x: posX,
          y: posY,
          distance: distance,
          entity: targetEntity,
        });
      }
    });
    farmableList.sort(
      (entityA, entityB) => entityA.distance - entityB.distance,
    );
    return farmableList;
  } catch (error) {
    return [];
  }
}
function findOptimalFarmPosition(clusterRadius, farmRange) {
  clusterRadius = clusterRadius || 500;
  farmRange = farmRange || window.autoFarmRange;
  const farmables = getFarmableEntities(farmRange);
  if (farmables.length === 0) {
    return null;
  }
  let bestPosition = null;
  let maxCount = 0;
  farmables.forEach((calculateAveragePosition) => {
    let elementCount = 0;
    let sumX = 0;
    let sumY = 0;
    farmables.forEach((targetPosition) => {
      if (
        calculateDistance(
          calculateAveragePosition.x,
          calculateAveragePosition.y,
          targetPosition.x,
          targetPosition.y,
        ) < clusterRadius
      ) {
        elementCount++;
        sumX += targetPosition.x;
        sumY += targetPosition.y;
      }
    });
    if (elementCount > maxCount) {
      maxCount = elementCount;
      bestPosition = {
        x: sumX / elementCount,
        y: sumY / elementCount,
        foodCount: elementCount,
      };
    }
  });
  return bestPosition;
}
function getNearbyAvoidEntities(avoidDistance) {
  avoidDistance = avoidDistance || window.autoFarmAvoidDistance;
  try {
    const gameState = getGameState();
    const worldData = getEntityManager(gameState);
    const playerAnimal = gameState?.myAnimals?.[0];
    if (!worldData || !playerAnimal) {
      return [];
    }
    const playerX = playerAnimal.position._x || playerAnimal.position.x;
    const playerY = playerAnimal.position._y || playerAnimal.position.y;
    const entities = worldData.entitiesList || [];
    const avoidList = [];
    entities.forEach((targetObject) => {
      if (!targetObject || targetObject.id === playerAnimal.id) {
        return;
      }
      const myY = targetObject.position?._x || targetObject.position?.x;
      const posY = targetObject.position?._y || targetObject.position?.y;
      if (myY == null || posY == null) {
        return;
      }
      if (!isPlayer(targetObject)) {
        return;
      }
      const calculatedDistance = calculateDistance(playerX, playerY, myY, posY);
      if (calculatedDistance < avoidDistance) {
        avoidList.push({
          id: targetObject.id,
          x: myY,
          y: posY,
          distance: calculatedDistance,
        });
      }
    });
    avoidList.sort((itemA, itemB) => itemA.distance - itemB.distance);
    return avoidList;
  } catch (error) {
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
  const localPlayer = getFirstAnimalPosition();
  if (!localPlayer) {
    return {
      x: 0,
      y: 0,
    };
  }
  const nearbyPlayers = getNearbyAvoidEntities(window.autoFarmAvoidDistance);
  if (nearbyPlayers.length === 0) {
    return {
      x: 0,
      y: 0,
    };
  }
  let avoidX = 0;
  let avoidY = 0;
  nearbyPlayers.forEach((avoidancePoint) => {
    const deltaX = localPlayer.x - avoidancePoint.x;
    const deltaY = localPlayer.y - avoidancePoint.y;
    const clampedAvoidDistance = Math.max(avoidancePoint.distance, 50);
    const avoidanceFactor =
      (window.autoFarmAvoidDistance - clampedAvoidDistance) /
      window.autoFarmAvoidDistance;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance > 0) {
      avoidX += (deltaX / distance) * avoidanceFactor * 500;
      avoidY += (deltaY / distance) * avoidanceFactor * 500;
    }
  });
  return {
    x: avoidX,
    y: avoidY,
  };
}
let currentTime_sky = 0;
function simulateEvolveKeyPress() {
  if (!window.autoFarmEvolve) {
    return;
  }
  const now = Date.now();
  if (now - currentTime_sky < 5000) {
    return;
  }
  currentTime_sky = now;
  const gameElement = getGameCanvas();
  const randomDigit = Math.floor(Math.random() * 9) + 1;
  const digitString = String(randomDigit);
  const keyboardEventInit = {
    key: digitString,
    code: "Digit" + digitString,
    keyCode: digitString.charCodeAt(0),
    which: digitString.charCodeAt(0),
    bubbles: true,
    cancelable: true,
  };
  [window, document, document.body, gameElement].forEach((targetElement) => {
    if (!targetElement) {
      return;
    }
    try {
      targetElement.dispatchEvent(
        new KeyboardEvent("keydown", keyboardEventInit),
      );
      setTimeout(() => {
        targetElement.dispatchEvent(
          new KeyboardEvent("keyup", keyboardEventInit),
        );
      }, 50);
    } catch (context) {}
  });
}
let isToggled_rg1 = false;
let currentTime_r36 = 0;
function checkAntiStuck(currentPos) {
  const now = Date.now();
  if (now - state.counter_tkq < 1500) {
    return false;
  }
  state.counter_tkq = now;
  if (state.position_t9s) {
    const dist = calculateDistance(
      currentPos.x,
      currentPos.y,
      state.position_t9s.x,
      state.position_t9s.y,
    );
    if (dist < 25) {
      state.counter_sm3++;
      if (state.counter_sm3 >= 1 && window.autoFarmCurrentTarget) {
        handleFarmFailure(
          window.autoFarmCurrentTarget.x,
          window.autoFarmCurrentTarget.y,
        );
        window.autoFarmSkipIds.add(window.autoFarmCurrentTarget.id);
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        state.counter_sm3 = 0;
      }
      if (state.counter_sm3 >= 2) {
        state.counter_sm3 = 0;
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        const randomAngle = Math.random() * Math.PI * 2;
        const escapeX = currentPos.x + Math.cos(randomAngle) * 1500;
        const escapeY = currentPos.y + Math.sin(randomAngle) * 1500;
        simulateMoveAndClick(escapeX, escapeY, true);
        return true;
      }
    } else {
      state.counter_sm3 = 0;
    }
  }
  state.position_t9s = {
    x: currentPos.x,
    y: currentPos.y,
  };
  return false;
}
function generatePatrolPoints() {
  const localPlayer = getFirstAnimalPosition();
  if (!localPlayer) {
    return;
  }
  const patrolRadius = 2000;
  const pointCount = 6;
  window.autoFarmPatrolPoints = [];
  for (let i = 0; i < pointCount; i++) {
    const angle = (Math.PI * 2 * i) / pointCount;
    window.autoFarmPatrolPoints.push({
      x: localPlayer.x + Math.cos(angle) * patrolRadius,
      y: localPlayer.y + Math.sin(angle) * patrolRadius,
    });
  }
  window.autoFarmPatrolIndex = 0;
}
function autoFarmUpdate() {
  if (!window.autoFarmActive) {
    isToggled_rg1 = false;
    return;
  }
  const now = Date.now();
  if (now - window.autoFarmSkipClearTime > 15000) {
    window.autoFarmSkipIds.clear();
    window.autoFarmSkipClearTime = now;
  }
  if (window.autoFarmCurrentTarget && window.autoFarmTargetStartTime > 0) {
    if (now - window.autoFarmTargetStartTime > 1000) {
      handleFarmFailure(
        window.autoFarmCurrentTarget.x,
        window.autoFarmCurrentTarget.y,
      );
      window.autoFarmSkipIds.add(window.autoFarmCurrentTarget.id);
      window.autoFarmCurrentTarget = null;
      window.autoFarmTargetStartTime = 0;
      setTimeout(autoFarmUpdate, 100);
      return;
    }
  }
  try {
    const localPlayer = getFirstAnimalPosition();
    if (!localPlayer) {
      window.autoFarmActive = false;
      isToggled_rg1 = false;
      const farmButton = document.getElementById("autoFarmBtn");
      if (farmButton) {
        farmButton.textContent = "Auto Farm";
        farmButton.classList.remove("toggle-on");
      }
      return;
    }
    if (Math.random() < 0.015) {
      simulateEvolveKeyPress();
    }
    if (checkAntiStuck(localPlayer)) {
      setTimeout(autoFarmUpdate, 100);
      return;
    }
    const avoidanceVector = calculateAvoidanceVector();
    const shouldAvoid =
      Math.abs(avoidanceVector.x) > 100 || Math.abs(avoidanceVector.y) > 100;
    if (shouldAvoid && window.autoFarmAvoidPlayers) {
      const targetX = localPlayer.x + avoidanceVector.x;
      const targetY = localPlayer.y + avoidanceVector.y;
      const isBoosting =
        window.autoFarmBoost && now - state.counter_agp > tickInterval_sco;
      if (isBoosting) {
        state.counter_agp = now;
      }
      simulateMoveAndClick(targetX, targetY, isBoosting);
      setTimeout(autoFarmUpdate, 60);
      return;
    }
    let finalX = null;
    let finalY = null;
    let minDistance = Infinity;
    if (window.autoFarmMode === "nearest") {
      const nearestTarget = findClosestFarmable();
      if (nearestTarget) {
        finalX = nearestTarget.x + avoidanceVector.x * 0.3;
        finalY = nearestTarget.y + avoidanceVector.y * 0.3;
        minDistance = nearestTarget.distance;
        if (
          !window.autoFarmCurrentTarget ||
          window.autoFarmCurrentTarget.id !== nearestTarget.id
        ) {
          if (window.autoFarmCurrentTarget) {
            window.autoFarmStats.collected++;
          }
          window.autoFarmCurrentTarget = nearestTarget;
          window.autoFarmTargetStartTime = now;
          state.counter_sm3 = 0;
        }
        if (nearestTarget.distance < 40) {
          finalX += (Math.random() - 0.5) * 80;
          finalY += (Math.random() - 0.5) * 80;
        }
      } else {
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        if (now - currentTime_r36 > 2500) {
          angle = Math.random() * Math.PI * 2;
          currentTime_r36 = now;
        }
        finalX = localPlayer.x + Math.cos(angle) * 1000;
        finalY = localPlayer.y + Math.sin(angle) * 1000;
        minDistance = 1000;
      }
    } else if (window.autoFarmMode === "cluster") {
      const foodSource = findOptimalFarmPosition(500, window.autoFarmRange);
      if (foodSource && foodSource.foodCount >= 2) {
        finalX = foodSource.x + avoidanceVector.x * 0.3;
        finalY = foodSource.y + avoidanceVector.y * 0.3;
        minDistance = calculateDistance(
          localPlayer.x,
          localPlayer.y,
          foodSource.x,
          foodSource.y,
        );
      } else {
        const nearbyTarget = findClosestFarmable();
        if (nearbyTarget) {
          finalX = nearbyTarget.x;
          finalY = nearbyTarget.y;
          minDistance = nearbyTarget.distance;
          if (
            !window.autoFarmCurrentTarget ||
            window.autoFarmCurrentTarget.id !== nearbyTarget.id
          ) {
            window.autoFarmCurrentTarget = nearbyTarget;
            window.autoFarmTargetStartTime = now;
          }
        } else {
          window.autoFarmCurrentTarget = null;
          window.autoFarmTargetStartTime = 0;
          if (now - currentTime_r36 > 2500) {
            angle = Math.random() * Math.PI * 2;
            currentTime_r36 = now;
          }
          finalX = localPlayer.x + Math.cos(angle) * 1000;
          finalY = localPlayer.y + Math.sin(angle) * 1000;
          minDistance = 1000;
        }
      }
    } else if (window.autoFarmMode === "patrol") {
      if (window.autoFarmPatrolPoints.length === 0) {
        generatePatrolPoints();
      }
      const nearbyTarget_5dl = findClosestFarmable(800);
      if (nearbyTarget_5dl) {
        finalX = nearbyTarget_5dl.x;
        finalY = nearbyTarget_5dl.y;
        minDistance = nearbyTarget_5dl.distance;
        if (
          !window.autoFarmCurrentTarget ||
          window.autoFarmCurrentTarget.id !== nearbyTarget_5dl.id
        ) {
          window.autoFarmCurrentTarget = nearbyTarget_5dl;
          window.autoFarmTargetStartTime = now;
        }
      } else {
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        const currentPatrolPoint =
          window.autoFarmPatrolPoints[window.autoFarmPatrolIndex];
        if (currentPatrolPoint) {
          minDistance = calculateDistance(
            localPlayer.x,
            localPlayer.y,
            currentPatrolPoint.x,
            currentPatrolPoint.y,
          );
          if (minDistance < 200) {
            window.autoFarmPatrolIndex =
              (window.autoFarmPatrolIndex + 1) %
              window.autoFarmPatrolPoints.length;
          }
          finalX = currentPatrolPoint.x;
          finalY = currentPatrolPoint.y;
        }
      }
    }
    if (finalX != null && finalY != null) {
      const angle = minDistance > 350;
      const angle_6iu = now - state.counter_agp > tickInterval_sco;
      const angle_6jy = window.autoFarmBoost && angle && angle_6iu;
      if (angle_6jy) {
        state.counter_agp = now;
      }
      simulateMoveAndClick(finalX, finalY, angle_6jy);
    }
  } catch (data) {
    console.error("[AutoFarm] Error:", data);
  }
  setTimeout(autoFarmUpdate, 60);
}
function startAutoFarmLoop() {
  if (isToggled_rg1) {
    return;
  }
  isToggled_rg1 = true;
  autoFarmUpdate();
}
function stopAutoFarm() {
  window.autoFarmActive = false;
  isToggled_rg1 = false;
  const elapsedTime = (
    (Date.now() - window.autoFarmStats.startTime) /
    1000
  ).toFixed(0);
  showToast(
    "Auto farm stopped. ~" +
      window.autoFarmStats.collected +
      " food in " +
      elapsedTime +
      "s",
  );
}
document.addEventListener("keydown", (event_7o7) => {
  if (event_7o7.target.matches("input,textarea,select")) {
    return;
  }
  if (event_7o7.key === "F5") {
    event_7o7.preventDefault();
    if (window.autoFarmActive) {
      stopAutoFarm();
      const farmBtn = document.getElementById("autoFarmBtn");
      if (farmBtn) {
        farmBtn.textContent = "Auto Farm";
        farmBtn.classList.remove("toggle-on");
      }
    } else {
      const farmModeSelect = document.getElementById("farmModeSelect");
      initAutoFarm(farmModeSelect ? farmModeSelect.value : "nearest");
      const autoFarmButton = document.getElementById("autoFarmBtn");
      if (autoFarmButton) {
        autoFarmButton.textContent = "Stop Farm";
        autoFarmButton.classList.add("toggle-on");
      }
    }
  }
});

export {
  isAreaSkipped,
  handleFarmFailure,
  findClosestFarmable,
  getFarmableEntities,
  findOptimalFarmPosition,
  getNearbyAvoidEntities,
  calculateAvoidanceVector,
  simulateEvolveKeyPress,
  checkAntiStuck,
  generatePatrolPoints,
  autoFarmUpdate,
  startAutoFarmLoop,
  stopAutoFarm,
};
