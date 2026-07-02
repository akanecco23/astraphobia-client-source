import {
  radius,
  timeoutLimit,
  maxFailCount,
  getGameState,
  getEntityManager,
  modIsAreaSkipped,
  getFirstAnimalPosition,
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

const OffsetValue = 400;
const TickInterval = 600;
function isAreaSkipped(x, y) {
  const v39acCurrentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(
    (v13e5CurrentTime) =>
      v39acCurrentTime - v13e5CurrentTime.time < timeoutLimit,
  );
  return window.autoFarmSkipAreas.some(
    (circle) => calculateDistance(x, y, circle.x, circle.y) < circle.radius,
  );
}
function handleFarmFailure(v1bc0X, v1a0cY) {
  const v1cf7CurrentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(
    (v4a43CurrentTime) =>
      v1cf7CurrentTime - v4a43CurrentTime.time < timeoutLimit,
  );
  let existingArea = window.autoFarmSkipAreas.find(
    (v3df3Position) =>
      calculateDistance(v1bc0X, v1a0cY, v3df3Position.x, v3df3Position.y) <
      OffsetValue,
  );
  if (existingArea) {
    existingArea.failCount++;
    existingArea.time = v1cf7CurrentTime;
    if (existingArea.failCount >= maxFailCount) {
      existingArea.skipped = true;
      showToast("Skipping unreachable food area");
    }
  } else {
    window.autoFarmSkipAreas.push({
      x: v1bc0X,
      y: v1a0cY,
      radius: OffsetValue,
      time: v1cf7CurrentTime,
      failCount: 1,
      skipped: false,
    });
  }
}
function findClosestFarmable(farmRange) {
  farmRange = farmRange || window.autoFarmRange;
  try {
    const v286cGameState = getGameState();
    const worldData = getEntityManager(v286cGameState);
    const playerAnimal = v286cGameState?.myAnimals?.[0];
    if (!worldData || !playerAnimal) {
      return null;
    }
    const playerX = playerAnimal.position._x || playerAnimal.position.x;
    const playerY = playerAnimal.position._y || playerAnimal.position.y;
    const v52a6Entities = worldData.entitiesList || [];
    let closestEntity = null;
    let minDistance = Infinity;
    v52a6Entities.forEach((v4a18TargetEntity) => {
      if (!v4a18TargetEntity || v4a18TargetEntity.id === playerAnimal.id) {
        return;
      }
      if (window.autoFarmSkipIds.has(v4a18TargetEntity.id)) {
        return;
      }
      const v27c8MyY =
        v4a18TargetEntity.position?._x || v4a18TargetEntity.position?.x;
      const v28caPosY =
        v4a18TargetEntity.position?._y || v4a18TargetEntity.position?.y;
      if (v27c8MyY == null || v28caPosY == null) {
        return;
      }
      if (isPlayer(v4a18TargetEntity)) {
        return;
      }
      if (modIsAreaSkipped(v27c8MyY, v28caPosY)) {
        return;
      }
      const v1d58Distance = calculateDistance(
        playerX,
        playerY,
        v27c8MyY,
        v28caPosY,
      );
      if (v1d58Distance < minDistance && v1d58Distance < farmRange) {
        minDistance = v1d58Distance;
        closestEntity = {
          id: v4a18TargetEntity.id,
          x: v27c8MyY,
          y: v28caPosY,
          distance: v1d58Distance,
          entity: v4a18TargetEntity,
        };
      }
    });
    return closestEntity;
  } catch (b76cError) {
    return null;
  }
}
function getFarmableEntities(v2ebbFarmRange) {
  v2ebbFarmRange = v2ebbFarmRange || window.autoFarmRange;
  try {
    const v4e0dGameState = getGameState();
    const v3570WorldData = getEntityManager(v4e0dGameState);
    const v50dbPlayerAnimal = v4e0dGameState?.myAnimals?.[0];
    if (!v3570WorldData || !v50dbPlayerAnimal) {
      return [];
    }
    const v2d86PlayerX =
      v50dbPlayerAnimal.position._x || v50dbPlayerAnimal.position.x;
    const v3903PlayerY =
      v50dbPlayerAnimal.position._y || v50dbPlayerAnimal.position.y;
    const v4086Entities = v3570WorldData.entitiesList || [];
    const farmableList = [];
    v4086Entities.forEach((v467bTargetEntity) => {
      if (!v467bTargetEntity || v467bTargetEntity.id === v50dbPlayerAnimal.id) {
        return;
      }
      if (window.autoFarmSkipIds.has(v467bTargetEntity.id)) {
        return;
      }
      const v1818PosX =
        v467bTargetEntity.position?._x || v467bTargetEntity.position?.x;
      const v209fPosY =
        v467bTargetEntity.position?._y || v467bTargetEntity.position?.y;
      if (v1818PosX == null || v209fPosY == null) {
        return;
      }
      if (isPlayer(v467bTargetEntity)) {
        return;
      }
      if (modIsAreaSkipped(v1818PosX, v209fPosY)) {
        return;
      }
      const v4664Distance = calculateDistance(
        v2d86PlayerX,
        v3903PlayerY,
        v1818PosX,
        v209fPosY,
      );
      if (v4664Distance < v2ebbFarmRange) {
        farmableList.push({
          id: v467bTargetEntity.id,
          x: v1818PosX,
          y: v209fPosY,
          distance: v4664Distance,
          entity: v467bTargetEntity,
        });
      }
    });
    farmableList.sort(
      (v3407EntityA, v1492EntityB) =>
        v3407EntityA.distance - v1492EntityB.distance,
    );
    return farmableList;
  } catch (d2b2Error) {
    return [];
  }
}
function findOptimalFarmPosition(clusterRadius, v5362FarmRange) {
  clusterRadius = clusterRadius || 500;
  v5362FarmRange = v5362FarmRange || window.autoFarmRange;
  const farmables = getFarmableEntities(v5362FarmRange);
  if (farmables.length === 0) {
    return null;
  }
  let bestPosition = null;
  let maxCount = 0;
  farmables.forEach((calculateAveragePosition) => {
    let elementCount = 0;
    let v6a21SumX = 0;
    let v5516SumY = 0;
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
        v6a21SumX += targetPosition.x;
        v5516SumY += targetPosition.y;
      }
    });
    if (elementCount > maxCount) {
      maxCount = elementCount;
      bestPosition = {
        x: v6a21SumX / elementCount,
        y: v5516SumY / elementCount,
        foodCount: elementCount,
      };
    }
  });
  return bestPosition;
}
function getNearbyAvoidEntities(avoidDistance) {
  avoidDistance = avoidDistance || window.autoFarmAvoidDistance;
  try {
    const v342eGameState = getGameState();
    const v4c53WorldData = getEntityManager(v342eGameState);
    const f07aPlayerAnimal = v342eGameState?.myAnimals?.[0];
    if (!v4c53WorldData || !f07aPlayerAnimal) {
      return [];
    }
    const v5ed8PlayerX =
      f07aPlayerAnimal.position._x || f07aPlayerAnimal.position.x;
    const v2a18PlayerY =
      f07aPlayerAnimal.position._y || f07aPlayerAnimal.position.y;
    const v3a21Entities = v4c53WorldData.entitiesList || [];
    const avoidList = [];
    v3a21Entities.forEach((v587dTargetObject) => {
      if (!v587dTargetObject || v587dTargetObject.id === f07aPlayerAnimal.id) {
        return;
      }
      const v33d0MyY =
        v587dTargetObject.position?._x || v587dTargetObject.position?.x;
      const v544aPosY =
        v587dTargetObject.position?._y || v587dTargetObject.position?.y;
      if (v33d0MyY == null || v544aPosY == null) {
        return;
      }
      if (!isPlayer(v587dTargetObject)) {
        return;
      }
      const calculatedDistance = calculateDistance(
        v5ed8PlayerX,
        v2a18PlayerY,
        v33d0MyY,
        v544aPosY,
      );
      if (calculatedDistance < avoidDistance) {
        avoidList.push({
          id: v587dTargetObject.id,
          x: v33d0MyY,
          y: v544aPosY,
          distance: calculatedDistance,
        });
      }
    });
    avoidList.sort((itemA, itemB) => itemA.distance - itemB.distance);
    return avoidList;
  } catch (v1a2aError) {
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
    const v4fe7DeltaX = localPlayer.x - avoidancePoint.x;
    const v1d29DeltaY = localPlayer.y - avoidancePoint.y;
    const clampedAvoidDistance = Math.max(avoidancePoint.distance, 50);
    const avoidanceFactor =
      (window.autoFarmAvoidDistance - clampedAvoidDistance) /
      window.autoFarmAvoidDistance;
    const c71eDistance = Math.sqrt(
      v4fe7DeltaX * v4fe7DeltaX + v1d29DeltaY * v1d29DeltaY,
    );
    if (c71eDistance > 0) {
      avoidX += (v4fe7DeltaX / c71eDistance) * avoidanceFactor * 500;
      avoidY += (v1d29DeltaY / c71eDistance) * avoidanceFactor * 500;
    }
  });
  return {
    x: avoidX,
    y: avoidY,
  };
}
let mainCurrentTime = 0;
function simulateEvolveKeyPress() {
  if (!window.autoFarmEvolve) {
    return;
  }
  const now = Date.now();
  if (now - mainCurrentTime < 5000) {
    return;
  }
  mainCurrentTime = now;
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
  [window, document, document.body, gameElement].forEach(
    (v135bTargetElement) => {
      if (!v135bTargetElement) {
        return;
      }
      try {
        v135bTargetElement.dispatchEvent(
          new KeyboardEvent("keydown", keyboardEventInit),
        );
        setTimeout(() => {
          v135bTargetElement.dispatchEvent(
            new KeyboardEvent("keyup", keyboardEventInit),
          );
        }, 50);
      } catch (context) {}
    },
  );
}
let appIsToggled = false;
let Angle = 0;
let modCurrentTime = 0;
function checkAntiStuck(currentPos) {
  const v4793Now = Date.now();
  if (v4793Now - state.modCounter < 1500) {
    return false;
  }
  state.modCounter = v4793Now;
  if (state.modPosition) {
    const dist = calculateDistance(
      currentPos.x,
      currentPos.y,
      state.modPosition.x,
      state.modPosition.y,
    );
    if (dist < 25) {
      state.numCounter++;
      if (state.numCounter >= 1 && window.autoFarmCurrentTarget) {
        handleFarmFailure(
          window.autoFarmCurrentTarget.x,
          window.autoFarmCurrentTarget.y,
        );
        window.autoFarmSkipIds.add(window.autoFarmCurrentTarget.id);
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        state.numCounter = 0;
      }
      if (state.numCounter >= 2) {
        state.numCounter = 0;
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        const randomAngle = Math.random() * Math.PI * 2;
        const escapeX = currentPos.x + Math.cos(randomAngle) * 1500;
        const escapeY = currentPos.y + Math.sin(randomAngle) * 1500;
        simulateMoveAndClick(escapeX, escapeY, true);
        return true;
      }
    } else {
      state.numCounter = 0;
    }
  }
  state.modPosition = {
    x: currentPos.x,
    y: currentPos.y,
  };
  return false;
}
function generatePatrolPoints() {
  const v4942LocalPlayer = getFirstAnimalPosition();
  if (!v4942LocalPlayer) {
    return;
  }
  const patrolRadius = 2000;
  const pointCount = 6;
  window.autoFarmPatrolPoints = [];
  for (let ffe3I = 0; ffe3I < pointCount; ffe3I++) {
    const v40f0Angle = (Math.PI * 2 * ffe3I) / pointCount;
    window.autoFarmPatrolPoints.push({
      x: v4942LocalPlayer.x + Math.cos(v40f0Angle) * patrolRadius,
      y: v4942LocalPlayer.y + Math.sin(v40f0Angle) * patrolRadius,
    });
  }
  window.autoFarmPatrolIndex = 0;
}
function autoFarmUpdate() {
  if (!window.autoFarmActive) {
    appIsToggled = false;
    return;
  }
  const v2a82Now = Date.now();
  if (v2a82Now - window.autoFarmSkipClearTime > 15000) {
    window.autoFarmSkipIds.clear();
    window.autoFarmSkipClearTime = v2a82Now;
  }
  if (window.autoFarmCurrentTarget && window.autoFarmTargetStartTime > 0) {
    if (v2a82Now - window.autoFarmTargetStartTime > 1000) {
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
    const v3269LocalPlayer = getFirstAnimalPosition();
    if (!v3269LocalPlayer) {
      window.autoFarmActive = false;
      appIsToggled = false;
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
    if (checkAntiStuck(v3269LocalPlayer)) {
      setTimeout(autoFarmUpdate, 100);
      return;
    }
    const avoidanceVector = calculateAvoidanceVector();
    const shouldAvoid =
      Math.abs(avoidanceVector.x) > 100 || Math.abs(avoidanceVector.y) > 100;
    if (shouldAvoid && window.autoFarmAvoidPlayers) {
      const v37b1TargetX = v3269LocalPlayer.x + avoidanceVector.x;
      const v4051TargetY = v3269LocalPlayer.y + avoidanceVector.y;
      const isBoosting =
        window.autoFarmBoost && v2a82Now - state.Counter > TickInterval;
      if (isBoosting) {
        state.Counter = v2a82Now;
      }
      simulateMoveAndClick(v37b1TargetX, v4051TargetY, isBoosting);
      setTimeout(autoFarmUpdate, 60);
      return;
    }
    let v2cffFinalX = null;
    let v556bFinalY = null;
    let v13a2MinDistance = Infinity;
    if (window.autoFarmMode === "nearest") {
      const nearestTarget = findClosestFarmable();
      if (nearestTarget) {
        v2cffFinalX = nearestTarget.x + avoidanceVector.x * 0.3;
        v556bFinalY = nearestTarget.y + avoidanceVector.y * 0.3;
        v13a2MinDistance = nearestTarget.distance;
        if (
          !window.autoFarmCurrentTarget ||
          window.autoFarmCurrentTarget.id !== nearestTarget.id
        ) {
          if (window.autoFarmCurrentTarget) {
            window.autoFarmStats.collected++;
          }
          window.autoFarmCurrentTarget = nearestTarget;
          window.autoFarmTargetStartTime = v2a82Now;
          state.numCounter = 0;
        }
        if (nearestTarget.distance < 40) {
          v2cffFinalX += (Math.random() - 0.5) * 80;
          v556bFinalY += (Math.random() - 0.5) * 80;
        }
      } else {
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        if (v2a82Now - modCurrentTime > 2500) {
          Angle = Math.random() * Math.PI * 2;
          modCurrentTime = v2a82Now;
        }
        v2cffFinalX = v3269LocalPlayer.x + Math.cos(Angle) * 1000;
        v556bFinalY = v3269LocalPlayer.y + Math.sin(Angle) * 1000;
        v13a2MinDistance = 1000;
      }
    } else if (window.autoFarmMode === "cluster") {
      const foodSource = findOptimalFarmPosition(500, window.autoFarmRange);
      if (foodSource && foodSource.foodCount >= 2) {
        v2cffFinalX = foodSource.x + avoidanceVector.x * 0.3;
        v556bFinalY = foodSource.y + avoidanceVector.y * 0.3;
        v13a2MinDistance = calculateDistance(
          v3269LocalPlayer.x,
          v3269LocalPlayer.y,
          foodSource.x,
          foodSource.y,
        );
      } else {
        const v5d64NearbyTarget = findClosestFarmable();
        if (v5d64NearbyTarget) {
          v2cffFinalX = v5d64NearbyTarget.x;
          v556bFinalY = v5d64NearbyTarget.y;
          v13a2MinDistance = v5d64NearbyTarget.distance;
          if (
            !window.autoFarmCurrentTarget ||
            window.autoFarmCurrentTarget.id !== v5d64NearbyTarget.id
          ) {
            window.autoFarmCurrentTarget = v5d64NearbyTarget;
            window.autoFarmTargetStartTime = v2a82Now;
          }
        } else {
          window.autoFarmCurrentTarget = null;
          window.autoFarmTargetStartTime = 0;
          if (v2a82Now - modCurrentTime > 2500) {
            Angle = Math.random() * Math.PI * 2;
            modCurrentTime = v2a82Now;
          }
          v2cffFinalX = v3269LocalPlayer.x + Math.cos(Angle) * 1000;
          v556bFinalY = v3269LocalPlayer.y + Math.sin(Angle) * 1000;
          v13a2MinDistance = 1000;
        }
      }
    } else if (window.autoFarmMode === "patrol") {
      if (window.autoFarmPatrolPoints.length === 0) {
        generatePatrolPoints();
      }
      const v5d64V5d64NearbyTarget = findClosestFarmable(800);
      if (v5d64V5d64NearbyTarget) {
        v2cffFinalX = v5d64V5d64NearbyTarget.x;
        v556bFinalY = v5d64V5d64NearbyTarget.y;
        v13a2MinDistance = v5d64V5d64NearbyTarget.distance;
        if (
          !window.autoFarmCurrentTarget ||
          window.autoFarmCurrentTarget.id !== v5d64V5d64NearbyTarget.id
        ) {
          window.autoFarmCurrentTarget = v5d64V5d64NearbyTarget;
          window.autoFarmTargetStartTime = v2a82Now;
        }
      } else {
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        const currentPatrolPoint =
          window.autoFarmPatrolPoints[window.autoFarmPatrolIndex];
        if (currentPatrolPoint) {
          v13a2MinDistance = calculateDistance(
            v3269LocalPlayer.x,
            v3269LocalPlayer.y,
            currentPatrolPoint.x,
            currentPatrolPoint.y,
          );
          if (v13a2MinDistance < 200) {
            window.autoFarmPatrolIndex =
              (window.autoFarmPatrolIndex + 1) %
              window.autoFarmPatrolPoints.length;
          }
          v2cffFinalX = currentPatrolPoint.x;
          v556bFinalY = currentPatrolPoint.y;
        }
      }
    }
    if (v2cffFinalX != null && v556bFinalY != null) {
      const v463eAngle = v13a2MinDistance > 350;
      const v4857V463eAngle = v2a82Now - state.Counter > TickInterval;
      const v463eV463eAngle =
        window.autoFarmBoost && v463eAngle && v4857V463eAngle;
      if (v463eV463eAngle) {
        state.Counter = v2a82Now;
      }
      simulateMoveAndClick(v2cffFinalX, v556bFinalY, v463eV463eAngle);
    }
  } catch (v4630Data) {
    console.error("[AutoFarm] Error:", v4630Data);
  }
  setTimeout(autoFarmUpdate, 60);
}
function startAutoFarmLoop() {
  if (appIsToggled) {
    return;
  }
  appIsToggled = true;
  autoFarmUpdate();
}
function stopAutoFarm() {
  window.autoFarmActive = false;
  appIsToggled = false;
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
document.addEventListener("keydown", (v6b14Event) => {
  if (v6b14Event.target.matches("input,textarea,select")) {
    return;
  }
  if (v6b14Event.key === "F5") {
    v6b14Event.preventDefault();
    if (window.autoFarmActive) {
      stopAutoFarm();
      const v3b29FarmBtn = document.getElementById("autoFarmBtn");
      if (v3b29FarmBtn) {
        v3b29FarmBtn.textContent = "Auto Farm";
        v3b29FarmBtn.classList.remove("toggle-on");
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
