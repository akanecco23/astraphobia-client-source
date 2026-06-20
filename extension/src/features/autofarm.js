import { getEntityManager, state } from '../core.js';
import { calculateDistance, moveAndClickElement, getAnimalPosition } from './movement.js';
import { showNotification } from '../ui/interaction.js';
import { findEntitiesInRange, findNearestEntity, calculateAvoidanceVector } from './aimbot.js';
import { getGameCanvas } from '../ui/radar.js';

window.autoFarmActive = false;
window.autoFarmMode = "nearest";
window.autoFarmRange = 3000;
window.autoFarmBoost = true;
window.autoFarmEvolve = true;
window.autoFarmAvoidPlayers = true;
window.autoFarmAvoidDistance = 800;
window.autoFarmStats = {
  collected: 0,
  startTime: 0
};
window.autoFarmPatrolPoints = [];
window.autoFarmPatrolIndex = 0;
window.autoFarmCurrentTarget = null;
window.autoFarmTargetStartTime = 0;
window.autoFarmSkipIds = new Set();
window.autoFarmSkipClearTime = 0;
window.autoFarmSkipAreas = [];


function getGameState() {
  try {
    if (state.animalData && state.animalData.myAnimals && state.animalData.myAnimals.length > 0) {
      return state.animalData;
    }
    const states = window.__ss?.states;
    if (!states) {
      return state.animalData || null;
    }
    for (let stateIndex = 0; stateIndex < states.length; stateIndex++) {
      if (states[stateIndex]?.gameScene?.myAnimals) {
        return states[stateIndex].gameScene;
      }
      if (states[stateIndex]?.gameManager) {
        for (const managerKey of Object.keys(states[stateIndex].gameManager)) {
          if (states[stateIndex].gameManager[managerKey]?.myAnimals) {
            return states[stateIndex].gameManager[managerKey];
          }
        }
      }
    }
    return state.animalData || null;
  } catch (error) {
    return state.animalData || null;
  }
}
function findEntityById(entityId) {
  try {
    const gameState = getGameState();
    if (!gameState) {
      return null;
    }
    const worldData = getEntityManager(gameState);
    if (!worldData) {
      return null;
    }
    let entity = worldData.entitiesById ? worldData.entitiesById[entityId] : null;
    if (!entity && worldData.entitiesList) {
      entity = worldData.entitiesList.find(selectedItem => selectedItem.id === entityId);
    }
    if (!entity && worldData.animalsByPlayerRoomId) {
      for (let roomId of Object.keys(worldData.animalsByPlayerRoomId)) {
        const animals = worldData.animalsByPlayerRoomId[roomId];
        if (Array.isArray(animals)) {
          entity = animals.find(currentItem => currentItem && currentItem.id === entityId);
        } else if (animals && animals.id === entityId) {
          entity = animals;
        }
        if (entity) {
          break;
        }
      }
    }
    return entity;
  } catch (error) {
    return null;
  }
}
const proximityLimit = 400;
const maxFailCount = 2;
const timeoutDuration = 20000;
let lastEventTimestamp = 0;
const eventIntervalThreshold = 600;
function markAreaAsFailed(posX, posY) {
  const currentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(timestamp => state.currentTime - timestamp.time < timeoutDuration);
  let existingArea = window.autoFarmSkipAreas.find(position => calculateDistance(posX, posY, position.x, position.y) < proximityLimit);
  if (existingArea) {
    existingArea.failCount++;
    existingArea.time = state.currentTime;
    if (existingArea.failCount >= maxFailCount) {
      existingArea.skipped = true;
      showNotification("Skipping unreachable food area");
    }
  } else {
    window.autoFarmSkipAreas.push({
      x: posX,
      y: posY,
      radius: proximityLimit,
      time: state.currentTime,
      failCount: 1,
      skipped: false
    });
  }
}
function isAreaSkipped(x, y) {
  const now = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(lastUpdateTime => now - lastUpdateTime.time < timeoutDuration);
  return window.autoFarmSkipAreas.some(skippedElement => skippedElement.skipped && calculateDistance(x, y, skippedElement.x, skippedElement.y) < skippedElement.radius);
}
function findBestFoodCluster(radius, rangeOverride) {
  const foodPoints = findEntitiesInRange(rangeOverride || window.autoFarmRange);
  if (!foodPoints.length) {
    return null;
  }
  let bestCluster = null;
  let maxCount = 0;
  foodPoints.forEach(calculateAveragePosition => {
    let elementCount = 0;
    let totalX = 0;
    let totalY = 0;
    foodPoints.forEach(targetPosition => {
      if (calculateDistance(calculateAveragePosition.x, calculateAveragePosition.y, targetPosition.x, targetPosition.y) < (radius || 500)) {
        elementCount++;
        totalX += targetPosition.x;
        totalY += targetPosition.y;
      }
    });
    if (elementCount > maxCount) {
      maxCount = elementCount;
      bestCluster = {
        x: totalX / elementCount,
        y: totalY / elementCount,
        foodCount: elementCount
      };
    }
  });
  return bestCluster;
}
let lastUpdateTimestamp = 0;
function triggerRandomEvolve() {
  if (!window.autoFarmEvolve) {
    return;
  }
  const now = Date.now();
  if (now - lastUpdateTimestamp < 5000) {
    return;
  }
  lastUpdateTimestamp = now;
  const gameCanvas = getGameCanvas();
  const randomDigit = String(Math.floor(Math.random() * 9) + 1);
  const keyEventData = {
    key: randomDigit,
    code: "Digit" + randomDigit,
    keyCode: randomDigit.charCodeAt(0),
    which: randomDigit.charCodeAt(0),
    bubbles: true,
    cancelable: true
  };
  [window, document, document.body, gameCanvas].forEach(targetElement => {
    if (!targetElement) {
      return;
    }
    try {
      targetElement.dispatchEvent(new KeyboardEvent("keydown", keyEventData));
      setTimeout(() => targetElement.dispatchEvent(new KeyboardEvent("keyup", keyEventData)), 50);
    } catch (context) {}
  });
}
let isAutoFarmActive = false;
let currentPosition = null;
let counter = 0;
let lastProcessedIndex = 0;
let randomAngle = 0;
let pointerMoveOffset = 0;
function checkStuckCondition(currentPos) {
  const currentTime = Date.now();
  if (state.currentTime - lastProcessedIndex < 1500) {
    return false;
  }
  lastProcessedIndex = state.currentTime;
  if (currentPosition) {
    if (calculateDistance(currentPos.x, currentPos.y, currentPosition.x, currentPosition.y) < 25) {
      counter++;
      if (counter >= 1 && window.autoFarmCurrentTarget) {
        markAreaAsFailed(window.autoFarmCurrentTarget.x, window.autoFarmCurrentTarget.y);
        window.autoFarmSkipIds.add(window.autoFarmCurrentTarget.id);
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        counter = 0;
      }
      if (counter >= 2) {
        counter = 0;
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        const randomAngle = Math.random() * Math.PI * 2;
        moveAndClickElement(currentPos.x + Math.cos(randomAngle) * 1500, currentPos.y + Math.sin(randomAngle) * 1500, true);
        return true;
      }
    } else {
      counter = 0;
    }
  }
  currentPosition = {
    x: currentPos.x,
    y: currentPos.y
  };
  return false;
}
function setupPatrolRoute() {
  const centerPos = getAnimalPosition();
  if (!centerPos) {
    return;
  }
  window.autoFarmPatrolPoints = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI * 2 * i / 6;
    window.autoFarmPatrolPoints.push({
      x: centerPos.x + Math.cos(angle) * 2000,
      y: centerPos.y + Math.sin(angle) * 2000
    });
  }
  window.autoFarmPatrolIndex = 0;
}
function autoFarmLoop() {
  if (!window.autoFarmActive) {
    isAutoFarmActive = false;
    return;
  }
  const currentTime = Date.now();
  if (state.currentTime - window.autoFarmSkipClearTime > 15000) {
    window.autoFarmSkipIds.clear();
    window.autoFarmSkipClearTime = state.currentTime;
  }
  if (window.autoFarmCurrentTarget && window.autoFarmTargetStartTime > 0 && state.currentTime - window.autoFarmTargetStartTime > 1000) {
    markAreaAsFailed(window.autoFarmCurrentTarget.x, window.autoFarmCurrentTarget.y);
    window.autoFarmSkipIds.add(window.autoFarmCurrentTarget.id);
    window.autoFarmCurrentTarget = null;
    window.autoFarmTargetStartTime = 0;
    setTimeout(autoFarmLoop, 100);
    return;
  }
  try {
    const currentTarget = getAnimalPosition();
    if (!currentTarget) {
      window.autoFarmActive = false;
      isAutoFarmActive = false;
      const autoFarmButton = document.getElementById("autoFarmBtn");
      if (autoFarmButton) {
        autoFarmButton.textContent = "Auto Farm";
        autoFarmButton.classList.remove("toggle-on");
      }
      return;
    }
    if (Math.random() < 0.015) {
      triggerRandomEvolve();
    }
    if (checkStuckCondition(currentTarget)) {
      setTimeout(autoFarmLoop, 100);
      return;
    }
    const playerOffset = calculateAvoidanceVector();
    if ((Math.abs(playerOffset.x) > 100 || Math.abs(playerOffset.y) > 100) && window.autoFarmAvoidPlayers) {
      const shouldBoost = window.autoFarmBoost && state.currentTime - lastEventTimestamp > eventIntervalThreshold;
      if (shouldBoost) {
        lastEventTimestamp = state.currentTime;
      }
      moveAndClickElement(currentTarget.x + playerOffset.x, currentTarget.y + playerOffset.y, shouldBoost);
      setTimeout(autoFarmLoop, 60);
      return;
    }
    let targetX = null;
    let targetY = null;
    let minDistance = Infinity;
    if (window.autoFarmMode === "nearest") {
      const nearestTarget = findNearestEntity();
      if (nearestTarget) {
        targetX = nearestTarget.x + playerOffset.x * 0.3;
        targetY = nearestTarget.y + playerOffset.y * 0.3;
        minDistance = nearestTarget.distance;
        if (!window.autoFarmCurrentTarget || window.autoFarmCurrentTarget.id !== nearestTarget.id) {
          if (window.autoFarmCurrentTarget) {
            window.autoFarmStats.collected++;
          }
          window.autoFarmCurrentTarget = nearestTarget;
          window.autoFarmTargetStartTime = state.currentTime;
          counter = 0;
        }
        if (nearestTarget.distance < 40) {
          targetX += (Math.random() - 0.5) * 80;
          targetY += (Math.random() - 0.5) * 80;
        }
      } else {
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        if (state.currentTime - pointerMoveOffset > 2500) {
          randomAngle = Math.random() * Math.PI * 2;
          pointerMoveOffset = state.currentTime;
        }
        targetX = currentTarget.x + Math.cos(randomAngle) * 1000;
        targetY = currentTarget.y + Math.sin(randomAngle) * 1000;
        minDistance = 1000;
      }
    } else if (window.autoFarmMode === "cluster") {
      const nearbyFoodSource = findBestFoodCluster(500, window.autoFarmRange);
      if (nearbyFoodSource && nearbyFoodSource.foodCount >= 2) {
        targetX = nearbyFoodSource.x + playerOffset.x * 0.3;
        targetY = nearbyFoodSource.y + playerOffset.y * 0.3;
        minDistance = calculateDistance(currentTarget.x, currentTarget.y, nearbyFoodSource.x, nearbyFoodSource.y);
      } else {
        const randomTarget = findNearestEntity();
        if (randomTarget) {
          targetX = randomTarget.x;
          targetY = randomTarget.y;
          minDistance = randomTarget.distance;
          if (!window.autoFarmCurrentTarget || window.autoFarmCurrentTarget.id !== randomTarget.id) {
            window.autoFarmCurrentTarget = randomTarget;
            window.autoFarmTargetStartTime = state.currentTime;
          }
        } else {
          window.autoFarmCurrentTarget = null;
          window.autoFarmTargetStartTime = 0;
          if (state.currentTime - pointerMoveOffset > 2500) {
            randomAngle = Math.random() * Math.PI * 2;
            pointerMoveOffset = state.currentTime;
          }
          targetX = currentTarget.x + Math.cos(randomAngle) * 1000;
          targetY = currentTarget.y + Math.sin(randomAngle) * 1000;
          minDistance = 1000;
        }
      }
    } else if (window.autoFarmMode === "patrol") {
      if (!window.autoFarmPatrolPoints.length) {
        setupPatrolRoute();
      }
      const specificTarget = findNearestEntity(800);
      if (specificTarget) {
        targetX = specificTarget.x;
        targetY = specificTarget.y;
        minDistance = specificTarget.distance;
        if (!window.autoFarmCurrentTarget || window.autoFarmCurrentTarget.id !== specificTarget.id) {
          window.autoFarmCurrentTarget = specificTarget;
          window.autoFarmTargetStartTime = state.currentTime;
        }
      } else {
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        const currentPatrolPoint = window.autoFarmPatrolPoints[window.autoFarmPatrolIndex];
        if (currentPatrolPoint) {
          minDistance = calculateDistance(currentTarget.x, currentTarget.y, currentPatrolPoint.x, currentPatrolPoint.y);
          if (minDistance < 200) {
            window.autoFarmPatrolIndex = (window.autoFarmPatrolIndex + 1) % window.autoFarmPatrolPoints.length;
          }
          targetX = currentPatrolPoint.x;
          targetY = currentPatrolPoint.y;
        }
      }
    }
    if (targetX != null) {
      const shouldApplyBoost = window.autoFarmBoost && minDistance > 350 && state.currentTime - lastEventTimestamp > eventIntervalThreshold;
      if (shouldApplyBoost) {
        lastEventTimestamp = state.currentTime;
      }
      moveAndClickElement(targetX, targetY, shouldApplyBoost);
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
  currentPosition = null;
  counter = 0;
  lastProcessedIndex = 0;
  lastEventTimestamp = 0;
  if (farmMode === "patrol") {
    setupPatrolRoute();
  }
  showNotification("Auto farm started (" + window.autoFarmMode + ")");
  if (!isAutoFarmActive) {
    isAutoFarmActive = true;
    autoFarmLoop();
  }
}
function stopAutoFarm() {
  window.autoFarmActive = false;
  isAutoFarmActive = false;
  showNotification("Farm stopped. ~" + window.autoFarmStats.collected + " food in " + ((Date.now() - window.autoFarmStats.startTime) / 1000).toFixed(0) + "s");
}
function toggleMinimapSize() {
  if (!state.animalData || !state.animalData.minimap) {
    showNotification("Minimap not available");
    return;
  }
  if (state.isMinimapSmall) {
    state.animalData.minimap.scale.set(1);
    state.animalData.minimap.pivot.set(0, 0);
    state.isMinimapSmall = false;
    showNotification("Minimap restored");
  } else {
    state.animalData.minimap.scale.set(0.5);
    state.animalData.minimap.pivot.set(-70, -45);
    state.isMinimapSmall = true;
    showNotification("Small minimap enabled");
  }
}

export { getGameState, findEntityById, markAreaAsFailed, isAreaSkipped, findBestFoodCluster, triggerRandomEvolve, checkStuckCondition, setupPatrolRoute, autoFarmLoop, startAutoFarm, stopAutoFarm, toggleMinimapSize };
