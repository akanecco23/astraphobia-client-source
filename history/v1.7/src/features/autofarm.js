import {
  radius,
  maxFailCount,
  timeoutLimit,
  getGameState,
  getEntityManager,
  getFirstAnimalPosition,
  startAutoFarm,
  state,
} from "../core.js";
import { calculateDistance, isPlayer, getGameCanvas } from "../utils.js";
import { showNotification } from "../ui/interaction.js";
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

const OffsetValue = 400;
const TickInterval = 600;
function handleFarmFailure(x, y) {
  const v8662CurrentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(
    (timeData) => v8662CurrentTime - timeData.time < timeoutLimit,
  );
  let existingArea = window.autoFarmSkipAreas.find(
    (v57b1Position) =>
      calculateDistance(x, y, v57b1Position.x, v57b1Position.y) < OffsetValue,
  );
  if (existingArea) {
    existingArea.failCount++;
    existingArea.time = v8662CurrentTime;
    if (existingArea.failCount >= maxFailCount) {
      existingArea.skipped = true;
      showNotification("Skipping unreachable food area");
    }
  } else {
    window.autoFarmSkipAreas.push({
      x: x,
      y: y,
      radius: OffsetValue,
      time: v8662CurrentTime,
      failCount: 1,
      skipped: false,
    });
  }
}
function isAreaSkipped(v39caX, v40f2Y) {
  const v2de4CurrentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(
    (v369cCurrentTime) =>
      v2de4CurrentTime - v369cCurrentTime.time < timeoutLimit,
  );
  return window.autoFarmSkipAreas.some(
    (cell) =>
      cell.skipped &&
      calculateDistance(v39caX, v40f2Y, cell.x, cell.y) < cell.radius,
  );
}
function findClosestFarmableEntity(farmRange) {
  farmRange = farmRange || window.autoFarmRange;
  try {
    const v2970GameState = getGameState();
    const v2618EntityManager = getEntityManager(v2970GameState);
    const playerAnimal = v2970GameState?.myAnimals?.[0];
    if (!v2618EntityManager || !playerAnimal) {
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
    (v2618EntityManager.entitiesList || []).forEach((v3c4fTargetEntity) => {
      if (
        !v3c4fTargetEntity ||
        v3c4fTargetEntity.id === playerAnimal.id ||
        window.autoFarmSkipIds.has(v3c4fTargetEntity.id)
      ) {
        return;
      }
      const v11faMyY =
        v3c4fTargetEntity.position?._x !== undefined
          ? v3c4fTargetEntity.position._x
          : v3c4fTargetEntity.position?.x;
      const v3f7ePosY =
        v3c4fTargetEntity.position?._y !== undefined
          ? v3c4fTargetEntity.position._y
          : v3c4fTargetEntity.position?.y;
      if (
        v11faMyY == null ||
        v3f7ePosY == null ||
        isPlayer(v3c4fTargetEntity) ||
        isAreaSkipped(v11faMyY, v3f7ePosY)
      ) {
        return;
      }
      const v5157DistanceToTarget = calculateDistance(
        playerX,
        playerY,
        v11faMyY,
        v3f7ePosY,
      );
      if (
        v5157DistanceToTarget < minDistance &&
        v5157DistanceToTarget < farmRange
      ) {
        minDistance = v5157DistanceToTarget;
        closestEntity = {
          id: v3c4fTargetEntity.id,
          x: v11faMyY,
          y: v3f7ePosY,
          distance: v5157DistanceToTarget,
          entity: v3c4fTargetEntity,
        };
      }
    });
    return closestEntity;
  } catch (v5b13Error) {
    return null;
  }
}
function getNearbyFarmables(v535dFarmRange) {
  v535dFarmRange = v535dFarmRange || window.autoFarmRange;
  try {
    const v1a10GameState = getGameState();
    const v8539WorldData = getEntityManager(v1a10GameState);
    const v3c72MyAnimal = v1a10GameState?.myAnimals?.[0];
    if (!v8539WorldData || !v3c72MyAnimal) {
      return [];
    }
    const a722MyX =
      v3c72MyAnimal.position._x !== undefined
        ? v3c72MyAnimal.position._x
        : v3c72MyAnimal.position.x;
    const v2a28MyY =
      v3c72MyAnimal.position._y !== undefined
        ? v3c72MyAnimal.position._y
        : v3c72MyAnimal.position.y;
    const farmables = [];
    (v8539WorldData.entitiesList || []).forEach((v30b1TargetEntity) => {
      if (
        !v30b1TargetEntity ||
        v30b1TargetEntity.id === v3c72MyAnimal.id ||
        window.autoFarmSkipIds.has(v30b1TargetEntity.id)
      ) {
        return;
      }
      const v59e6MyY =
        v30b1TargetEntity.position?._x !== undefined
          ? v30b1TargetEntity.position._x
          : v30b1TargetEntity.position?.x;
      const v1b78PosY =
        v30b1TargetEntity.position?._y !== undefined
          ? v30b1TargetEntity.position._y
          : v30b1TargetEntity.position?.y;
      if (
        v59e6MyY == null ||
        v1b78PosY == null ||
        isPlayer(v30b1TargetEntity) ||
        isAreaSkipped(v59e6MyY, v1b78PosY)
      ) {
        return;
      }
      const v4d9eDistanceToTarget = calculateDistance(
        a722MyX,
        v2a28MyY,
        v59e6MyY,
        v1b78PosY,
      );
      if (v4d9eDistanceToTarget < v535dFarmRange) {
        farmables.push({
          id: v30b1TargetEntity.id,
          x: v59e6MyY,
          y: v1b78PosY,
          distance: v4d9eDistanceToTarget,
          entity: v30b1TargetEntity,
        });
      }
    });
    return farmables.sort(
      (v523cEntityA, v2901EntityB) =>
        v523cEntityA.distance - v2901EntityB.distance,
    );
  } catch (v4951Error) {
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
    let v146dSumX = 0;
    let v4f0fSumY = 0;
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
        v146dSumX += targetPosition.x;
        v4f0fSumY += targetPosition.y;
      }
    });
    if (pointCount > maxCount) {
      maxCount = pointCount;
      bestCluster = {
        x: v146dSumX / pointCount,
        y: v4f0fSumY / pointCount,
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
    const v2b34GameState = getGameState();
    const v1cd7Entities = getEntityManager(v2b34GameState);
    const v1d11MyAnimal = v2b34GameState?.myAnimals?.[0];
    if (!v1cd7Entities || !v1d11MyAnimal) {
      return {
        x: 0,
        y: 0,
      };
    }
    (v1cd7Entities.entitiesList || []).forEach((v111dTargetEntity) => {
      if (
        !v111dTargetEntity ||
        v111dTargetEntity.id === v1d11MyAnimal.id ||
        !isPlayer(v111dTargetEntity)
      ) {
        return;
      }
      const v1cdcMyY =
        v111dTargetEntity.position?._x !== undefined
          ? v111dTargetEntity.position._x
          : v111dTargetEntity.position?.x;
      const v3decPosY =
        v111dTargetEntity.position?._y !== undefined
          ? v111dTargetEntity.position._y
          : v111dTargetEntity.position?.y;
      if (v1cdcMyY == null || v3decPosY == null) {
        return;
      }
      const v3b60Distance = calculateDistance(
        playerPosition.x,
        playerPosition.y,
        v1cdcMyY,
        v3decPosY,
      );
      if (v3b60Distance < window.autoFarmAvoidDistance) {
        const v2f51DeltaX = playerPosition.x - v1cdcMyY;
        const v5140DeltaY = playerPosition.y - v3decPosY;
        const v3f1dMagnitude = Math.sqrt(
          v2f51DeltaX * v2f51DeltaX + v5140DeltaY * v5140DeltaY,
        );
        const avoidanceFactor =
          (window.autoFarmAvoidDistance - Math.max(v3b60Distance, 50)) /
          window.autoFarmAvoidDistance;
        if (v3f1dMagnitude > 0) {
          avoidX += (v2f51DeltaX / v3f1dMagnitude) * avoidanceFactor * 500;
          avoidY += (v5140DeltaY / v3f1dMagnitude) * avoidanceFactor * 500;
        }
      }
    });
  } catch (v2c28Data) {}
  return {
    x: avoidX,
    y: avoidY,
  };
}
let v5309CurrentTime = 0;
function simulateEvolveKey() {
  if (!window.autoFarmEvolve) {
    return;
  }
  const v5cc6Now = Date.now();
  if (v5cc6Now - v5309CurrentTime < 5000) {
    return;
  }
  v5309CurrentTime = v5cc6Now;
  const v57ceGameCanvas = getGameCanvas();
  const randomDigit = String(Math.floor(Math.random() * 9) + 1);
  const eventInit = {
    key: randomDigit,
    code: "Digit" + randomDigit,
    keyCode: randomDigit.charCodeAt(0),
    which: randomDigit.charCodeAt(0),
    bubbles: true,
    cancelable: true,
  };
  [window, document, document.body, v57ceGameCanvas].forEach(
    (v3d05TargetElement) => {
      if (!v3d05TargetElement) {
        return;
      }
      try {
        v3d05TargetElement.dispatchEvent(
          new KeyboardEvent("keydown", eventInit),
        );
        setTimeout(
          () =>
            v3d05TargetElement.dispatchEvent(
              new KeyboardEvent("keyup", eventInit),
            ),
          50,
        );
      } catch (context) {}
    },
  );
}
let Angle = 0;
let globalCurrentTime = 0;
function detectAndHandleStuck(currentPos) {
  const v49a5Now = Date.now();
  if (v49a5Now - state.modCounter < 1500) {
    return false;
  }
  state.modCounter = v49a5Now;
  if (state.modPosition) {
    if (
      calculateDistance(
        currentPos.x,
        currentPos.y,
        state.modPosition.x,
        state.modPosition.y,
      ) < 25
    ) {
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
        movePointerToTarget(
          currentPos.x + Math.cos(randomAngle) * 1500,
          currentPos.y + Math.sin(randomAngle) * 1500,
          true,
        );
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
function setupPatrolPoints() {
  const centerPos = getFirstAnimalPosition();
  if (!centerPos) {
    return;
  }
  window.autoFarmPatrolPoints = [];
  for (let v35beI = 0; v35beI < 6; v35beI++) {
    const v36f8Angle = (Math.PI * 2 * v35beI) / 6;
    window.autoFarmPatrolPoints.push({
      x: centerPos.x + Math.cos(v36f8Angle) * 2000,
      y: centerPos.y + Math.sin(v36f8Angle) * 2000,
    });
  }
  window.autoFarmPatrolIndex = 0;
}
function autoFarmLoop() {
  if (!window.autoFarmActive) {
    state.sysIsToggled = false;
    return;
  }
  const v378eCurrentTime = Date.now();
  if (v378eCurrentTime - window.autoFarmSkipClearTime > 15000) {
    window.autoFarmSkipIds.clear();
    window.autoFarmSkipClearTime = v378eCurrentTime;
  }
  if (
    window.autoFarmCurrentTarget &&
    window.autoFarmTargetStartTime > 0 &&
    v378eCurrentTime - window.autoFarmTargetStartTime > 1000
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
      state.sysIsToggled = false;
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
        window.autoFarmBoost && v378eCurrentTime - state.Counter > TickInterval;
      if (useBoost) {
        state.Counter = v378eCurrentTime;
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
          window.autoFarmTargetStartTime = v378eCurrentTime;
          state.numCounter = 0;
        }
        if (nearest.distance < 40) {
          destX += (Math.random() - 0.5) * 80;
          destY += (Math.random() - 0.5) * 80;
        }
      } else {
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        if (v378eCurrentTime - globalCurrentTime > 2500) {
          Angle = Math.random() * Math.PI * 2;
          globalCurrentTime = v378eCurrentTime;
        }
        destX = target.x + Math.cos(Angle) * 1000;
        destY = target.y + Math.sin(Angle) * 1000;
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
        const v22b3TargetEntity = findClosestFarmableEntity();
        if (v22b3TargetEntity) {
          destX = v22b3TargetEntity.x;
          destY = v22b3TargetEntity.y;
          minDist = v22b3TargetEntity.distance;
          if (
            !window.autoFarmCurrentTarget ||
            window.autoFarmCurrentTarget.id !== v22b3TargetEntity.id
          ) {
            window.autoFarmCurrentTarget = v22b3TargetEntity;
            window.autoFarmTargetStartTime = v378eCurrentTime;
          }
        } else {
          window.autoFarmCurrentTarget = null;
          window.autoFarmTargetStartTime = 0;
          if (v378eCurrentTime - globalCurrentTime > 2500) {
            Angle = Math.random() * Math.PI * 2;
            globalCurrentTime = v378eCurrentTime;
          }
          destX = target.x + Math.cos(Angle) * 1000;
          destY = target.y + Math.sin(Angle) * 1000;
          minDist = 1000;
        }
      }
    } else if (window.autoFarmMode === "patrol") {
      if (!window.autoFarmPatrolPoints.length) {
        setupPatrolPoints();
      }
      const v22b3V22b3TargetEntity = findClosestFarmableEntity(800);
      if (v22b3V22b3TargetEntity) {
        destX = v22b3V22b3TargetEntity.x;
        destY = v22b3V22b3TargetEntity.y;
        minDist = v22b3V22b3TargetEntity.distance;
        if (
          !window.autoFarmCurrentTarget ||
          window.autoFarmCurrentTarget.id !== v22b3V22b3TargetEntity.id
        ) {
          window.autoFarmCurrentTarget = v22b3V22b3TargetEntity;
          window.autoFarmTargetStartTime = v378eCurrentTime;
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
      const v1e3cAngle =
        window.autoFarmBoost &&
        minDist > 350 &&
        v378eCurrentTime - state.Counter > TickInterval;
      if (v1e3cAngle) {
        state.Counter = v378eCurrentTime;
      }
      movePointerToTarget(destX, destY, v1e3cAngle);
    }
  } catch (v1d25Data) {
    console.error("[AutoFarm]", v1d25Data);
  }
  setTimeout(autoFarmLoop, 60);
}
function stopAutoFarm() {
  window.autoFarmActive = false;
  state.sysIsToggled = false;
  showNotification(
    "Farm stopped. ~" +
      window.autoFarmStats.collected +
      " food in " +
      ((Date.now() - window.autoFarmStats.startTime) / 1000).toFixed(0) +
      "s",
  );
}
document.addEventListener("keydown", (v1b34Event) => {
  if (v1b34Event.target.matches("input,textarea,select")) {
    return;
  }
  if (v1b34Event.key === "F5") {
    v1b34Event.preventDefault();
    if (window.autoFarmActive) {
      stopAutoFarm();
      const f305FarmBtn = document.getElementById("autoFarmBtn");
      if (f305FarmBtn) {
        f305FarmBtn.textContent = "Auto Farm";
        f305FarmBtn.classList.remove("toggle-on");
      }
    } else {
      const v5347FarmModeSelect = document.getElementById("farmModeSelect");
      startAutoFarm(
        v5347FarmModeSelect ? v5347FarmModeSelect.value : "nearest",
      );
      const v80a4AutoFarmButton = document.getElementById("autoFarmBtn");
      if (v80a4AutoFarmButton) {
        v80a4AutoFarmButton.textContent = "Stop Farm";
        v80a4AutoFarmButton.classList.add("toggle-on");
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
  stopAutoFarm,
};
