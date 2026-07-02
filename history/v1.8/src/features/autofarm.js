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
import { aimAtTarget } from "./aimbot.js";

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
  const v4ffdCurrentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(
    (v2b25CurrentTime) =>
      v4ffdCurrentTime - v2b25CurrentTime.time < timeoutLimit,
  );
  let existingArea = window.autoFarmSkipAreas.find(
    (v17b3Position) =>
      calculateDistance(x, y, v17b3Position.x, v17b3Position.y) < OffsetValue,
  );
  if (existingArea) {
    existingArea.failCount++;
    existingArea.time = v4ffdCurrentTime;
    if (existingArea.failCount >= maxFailCount) {
      existingArea.skipped = true;
      showNotification("Skipping unreachable food area");
    }
  } else {
    window.autoFarmSkipAreas.push({
      x: x,
      y: y,
      radius: OffsetValue,
      time: v4ffdCurrentTime,
      failCount: 1,
      skipped: false,
    });
  }
}
function isAreaSkipped(v16a6X, v52e9Y) {
  const v3477CurrentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(
    (timer) => v3477CurrentTime - timer.time < timeoutLimit,
  );
  return window.autoFarmSkipAreas.some(
    (cell) =>
      cell.skipped &&
      calculateDistance(v16a6X, v52e9Y, cell.x, cell.y) < cell.radius,
  );
}
function findClosestFarmableEntity(farmRange) {
  farmRange = farmRange || window.autoFarmRange;
  try {
    const v5c43GameState = getGameState();
    const v45c7EntityManager = getEntityManager(v5c43GameState);
    const playerAnimal = v5c43GameState?.myAnimals?.[0];
    if (!v45c7EntityManager || !playerAnimal) {
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
    (v45c7EntityManager.entitiesList || []).forEach((v4a84TargetEntity) => {
      if (
        !v4a84TargetEntity ||
        v4a84TargetEntity.id === playerAnimal.id ||
        window.autoFarmSkipIds.has(v4a84TargetEntity.id)
      ) {
        return;
      }
      const v155dMyY =
        v4a84TargetEntity.position?._x !== undefined
          ? v4a84TargetEntity.position._x
          : v4a84TargetEntity.position?.x;
      const v3f5dPosY =
        v4a84TargetEntity.position?._y !== undefined
          ? v4a84TargetEntity.position._y
          : v4a84TargetEntity.position?.y;
      if (
        v155dMyY == null ||
        v3f5dPosY == null ||
        isPlayer(v4a84TargetEntity) ||
        isAreaSkipped(v155dMyY, v3f5dPosY)
      ) {
        return;
      }
      const v1dd0DistanceToTarget = calculateDistance(
        playerX,
        playerY,
        v155dMyY,
        v3f5dPosY,
      );
      if (
        v1dd0DistanceToTarget < minDistance &&
        v1dd0DistanceToTarget < farmRange
      ) {
        minDistance = v1dd0DistanceToTarget;
        closestEntity = {
          id: v4a84TargetEntity.id,
          x: v155dMyY,
          y: v3f5dPosY,
          distance: v1dd0DistanceToTarget,
          entity: v4a84TargetEntity,
        };
      }
    });
    return closestEntity;
  } catch (v4e05Error) {
    return null;
  }
}
function getNearbyFarmTargets(v46e0FarmRange) {
  v46e0FarmRange = v46e0FarmRange || window.autoFarmRange;
  try {
    const v4c14GameState = getGameState();
    const v10c2Entities = getEntityManager(v4c14GameState);
    const v5472MyAnimal = v4c14GameState?.myAnimals?.[0];
    if (!v10c2Entities || !v5472MyAnimal) {
      return [];
    }
    const myPosX =
      v5472MyAnimal.position._x !== undefined
        ? v5472MyAnimal.position._x
        : v5472MyAnimal.position.x;
    const myPosY =
      v5472MyAnimal.position._y !== undefined
        ? v5472MyAnimal.position._y
        : v5472MyAnimal.position.y;
    const targets = [];
    (v10c2Entities.entitiesList || []).forEach((v5579TargetEntity) => {
      if (
        !v5579TargetEntity ||
        v5579TargetEntity.id === v5472MyAnimal.id ||
        window.autoFarmSkipIds.has(v5579TargetEntity.id)
      ) {
        return;
      }
      const v371eMyY =
        v5579TargetEntity.position?._x !== undefined
          ? v5579TargetEntity.position._x
          : v5579TargetEntity.position?.x;
      const v2363PosY =
        v5579TargetEntity.position?._y !== undefined
          ? v5579TargetEntity.position._y
          : v5579TargetEntity.position?.y;
      if (
        v371eMyY == null ||
        v2363PosY == null ||
        isPlayer(v5579TargetEntity) ||
        isAreaSkipped(v371eMyY, v2363PosY)
      ) {
        return;
      }
      const v44cbDistanceToTarget = calculateDistance(
        myPosX,
        myPosY,
        v371eMyY,
        v2363PosY,
      );
      if (v44cbDistanceToTarget < v46e0FarmRange) {
        targets.push({
          id: v5579TargetEntity.id,
          x: v371eMyY,
          y: v2363PosY,
          distance: v44cbDistanceToTarget,
          entity: v5579TargetEntity,
        });
      }
    });
    return targets.sort(
      (entityA, entityB) => entityA.distance - entityB.distance,
    );
  } catch (v2369Err) {
    return [];
  }
}
function findBestFarmSpot(searchRadius, v1ea1FarmRange) {
  const targetPoints = getNearbyFarmTargets(
    v1ea1FarmRange || window.autoFarmRange,
  );
  if (!targetPoints.length) {
    return null;
  }
  let bestSpot = null;
  let maxPointCount = 0;
  targetPoints.forEach((calculateAveragePosition) => {
    let count = 0;
    let v5959SumX = 0;
    let v1907SumY = 0;
    targetPoints.forEach((targetPosition) => {
      if (
        calculateDistance(
          calculateAveragePosition.x,
          calculateAveragePosition.y,
          targetPosition.x,
          targetPosition.y,
        ) < (searchRadius || 500)
      ) {
        count++;
        v5959SumX += targetPosition.x;
        v1907SumY += targetPosition.y;
      }
    });
    if (count > maxPointCount) {
      maxPointCount = count;
      bestSpot = {
        x: v5959SumX / count,
        y: v1907SumY / count,
        foodCount: count,
      };
    }
  });
  return bestSpot;
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
    const v5dc5GameState = getGameState();
    const v420fEntities = getEntityManager(v5dc5GameState);
    const v1f3dMyAnimal = v5dc5GameState?.myAnimals?.[0];
    if (!v420fEntities || !v1f3dMyAnimal) {
      return {
        x: 0,
        y: 0,
      };
    }
    (v420fEntities.entitiesList || []).forEach((v2555TargetEntity) => {
      if (
        !v2555TargetEntity ||
        v2555TargetEntity.id === v1f3dMyAnimal.id ||
        !isPlayer(v2555TargetEntity)
      ) {
        return;
      }
      const v498dMyY =
        v2555TargetEntity.position?._x !== undefined
          ? v2555TargetEntity.position._x
          : v2555TargetEntity.position?.x;
      const v195ePosY =
        v2555TargetEntity.position?._y !== undefined
          ? v2555TargetEntity.position._y
          : v2555TargetEntity.position?.y;
      if (v498dMyY == null || v195ePosY == null) {
        return;
      }
      const currentDistance = calculateDistance(
        playerPosition.x,
        playerPosition.y,
        v498dMyY,
        v195ePosY,
      );
      if (currentDistance < window.autoFarmAvoidDistance) {
        const v2047DeltaX = playerPosition.x - v498dMyY;
        const v2f2aDeltaY = playerPosition.y - v195ePosY;
        const v3a21Distance = Math.sqrt(
          v2047DeltaX * v2047DeltaX + v2f2aDeltaY * v2f2aDeltaY,
        );
        const avoidanceFactor =
          (window.autoFarmAvoidDistance - Math.max(currentDistance, 50)) /
          window.autoFarmAvoidDistance;
        if (v3a21Distance > 0) {
          avoidX += (v2047DeltaX / v3a21Distance) * avoidanceFactor * 500;
          avoidY += (v2f2aDeltaY / v3a21Distance) * avoidanceFactor * 500;
        }
      }
    });
  } catch (v2c28Data) {}
  return {
    x: avoidX,
    y: avoidY,
  };
}
let v225bCurrentTime = 0;
function simulateEvolveKey() {
  if (!window.autoFarmEvolve) {
    return;
  }
  const v36baCurrentTime = Date.now();
  if (v36baCurrentTime - v225bCurrentTime < 5000) {
    return;
  }
  v225bCurrentTime = v36baCurrentTime;
  const v4a4cGameCanvas = getGameCanvas();
  const randomDigit = String(Math.floor(Math.random() * 9) + 1);
  const keyboardEventOptions = {
    key: randomDigit,
    code: "Digit" + randomDigit,
    keyCode: randomDigit.charCodeAt(0),
    which: randomDigit.charCodeAt(0),
    bubbles: true,
    cancelable: true,
  };
  [window, document, document.body, v4a4cGameCanvas].forEach(
    (v201eTargetElement) => {
      if (!v201eTargetElement) {
        return;
      }
      try {
        v201eTargetElement.dispatchEvent(
          new KeyboardEvent("keydown", keyboardEventOptions),
        );
        setTimeout(
          () =>
            v201eTargetElement.dispatchEvent(
              new KeyboardEvent("keyup", keyboardEventOptions),
            ),
          50,
        );
      } catch (v4414Data) {}
    },
  );
}
let Angle = 0;
let sysCurrentTime = 0;
function detectAndHandleStuck(currentPos) {
  const v47c3Now = Date.now();
  if (v47c3Now - state.modCounter < 1500) {
    return false;
  }
  state.modCounter = v47c3Now;
  if (state.appPosition) {
    if (
      calculateDistance(
        currentPos.x,
        currentPos.y,
        state.appPosition.x,
        state.appPosition.y,
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
        aimAtTarget(
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
  state.appPosition = {
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
  for (let v4f78I = 0; v4f78I < 6; v4f78I++) {
    const v2367Angle = (Math.PI * 2 * v4f78I) / 6;
    window.autoFarmPatrolPoints.push({
      x: centerPos.x + Math.cos(v2367Angle) * 2000,
      y: centerPos.y + Math.sin(v2367Angle) * 2000,
    });
  }
  window.autoFarmPatrolIndex = 0;
}
function autoFarmLoop() {
  if (!window.autoFarmActive) {
    state.globalIsToggled = false;
    return;
  }
  const aa3cNow = Date.now();
  if (aa3cNow - window.autoFarmSkipClearTime > 15000) {
    window.autoFarmSkipIds.clear();
    window.autoFarmSkipClearTime = aa3cNow;
  }
  if (
    window.autoFarmCurrentTarget &&
    window.autoFarmTargetStartTime > 0 &&
    aa3cNow - window.autoFarmTargetStartTime > 1000
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
    const player = getFirstAnimalPosition();
    if (!player) {
      window.autoFarmActive = false;
      state.globalIsToggled = false;
      const autoFarmBtnElement = document.getElementById("autoFarmBtn");
      if (autoFarmBtnElement) {
        autoFarmBtnElement.textContent = "Auto Farm";
        autoFarmBtnElement.classList.remove("toggle-on");
      }
      return;
    }
    if (Math.random() < 0.015) {
      simulateEvolveKey();
    }
    if (detectAndHandleStuck(player)) {
      setTimeout(autoFarmLoop, 100);
      return;
    }
    const playerOffset = calculatePlayerAvoidanceVector();
    if (
      (Math.abs(playerOffset.x) > 100 || Math.abs(playerOffset.y) > 100) &&
      window.autoFarmAvoidPlayers
    ) {
      const canBoost =
        window.autoFarmBoost && aa3cNow - state.Counter > TickInterval;
      if (canBoost) {
        state.Counter = aa3cNow;
      }
      aimAtTarget(
        player.x + playerOffset.x,
        player.y + playerOffset.y,
        canBoost,
      );
      setTimeout(autoFarmLoop, 60);
      return;
    }
    let v24d1TargetX = null;
    let v1ecbTargetY = null;
    let v2648MinDistance = Infinity;
    if (window.autoFarmMode === "nearest") {
      const nearestTarget = findClosestFarmableEntity();
      if (nearestTarget) {
        v24d1TargetX = nearestTarget.x + playerOffset.x * 0.3;
        v1ecbTargetY = nearestTarget.y + playerOffset.y * 0.3;
        v2648MinDistance = nearestTarget.distance;
        if (
          !window.autoFarmCurrentTarget ||
          window.autoFarmCurrentTarget.id !== nearestTarget.id
        ) {
          if (window.autoFarmCurrentTarget) {
            window.autoFarmStats.collected++;
          }
          window.autoFarmCurrentTarget = nearestTarget;
          window.autoFarmTargetStartTime = aa3cNow;
          state.numCounter = 0;
        }
        if (nearestTarget.distance < 40) {
          v24d1TargetX += (Math.random() - 0.5) * 80;
          v1ecbTargetY += (Math.random() - 0.5) * 80;
        }
      } else {
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        if (aa3cNow - sysCurrentTime > 2500) {
          Angle = Math.random() * Math.PI * 2;
          sysCurrentTime = aa3cNow;
        }
        v24d1TargetX = player.x + Math.cos(Angle) * 1000;
        v1ecbTargetY = player.y + Math.sin(Angle) * 1000;
        v2648MinDistance = 1000;
      }
    } else if (window.autoFarmMode === "cluster") {
      const foodSource = findBestFarmSpot(500, window.autoFarmRange);
      if (foodSource && foodSource.foodCount >= 2) {
        v24d1TargetX = foodSource.x + playerOffset.x * 0.3;
        v1ecbTargetY = foodSource.y + playerOffset.y * 0.3;
        v2648MinDistance = calculateDistance(
          player.x,
          player.y,
          foodSource.x,
          foodSource.y,
        );
      } else {
        const v4f14SelectedTarget = findClosestFarmableEntity();
        if (v4f14SelectedTarget) {
          v24d1TargetX = v4f14SelectedTarget.x;
          v1ecbTargetY = v4f14SelectedTarget.y;
          v2648MinDistance = v4f14SelectedTarget.distance;
          if (
            !window.autoFarmCurrentTarget ||
            window.autoFarmCurrentTarget.id !== v4f14SelectedTarget.id
          ) {
            window.autoFarmCurrentTarget = v4f14SelectedTarget;
            window.autoFarmTargetStartTime = aa3cNow;
          }
        } else {
          window.autoFarmCurrentTarget = null;
          window.autoFarmTargetStartTime = 0;
          if (aa3cNow - sysCurrentTime > 2500) {
            Angle = Math.random() * Math.PI * 2;
            sysCurrentTime = aa3cNow;
          }
          v24d1TargetX = player.x + Math.cos(Angle) * 1000;
          v1ecbTargetY = player.y + Math.sin(Angle) * 1000;
          v2648MinDistance = 1000;
        }
      }
    } else if (window.autoFarmMode === "patrol") {
      if (!window.autoFarmPatrolPoints.length) {
        setupPatrolPoints();
      }
      const v4f14V4f14SelectedTarget = findClosestFarmableEntity(800);
      if (v4f14V4f14SelectedTarget) {
        v24d1TargetX = v4f14V4f14SelectedTarget.x;
        v1ecbTargetY = v4f14V4f14SelectedTarget.y;
        v2648MinDistance = v4f14V4f14SelectedTarget.distance;
        if (
          !window.autoFarmCurrentTarget ||
          window.autoFarmCurrentTarget.id !== v4f14V4f14SelectedTarget.id
        ) {
          window.autoFarmCurrentTarget = v4f14V4f14SelectedTarget;
          window.autoFarmTargetStartTime = aa3cNow;
        }
      } else {
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        const currentPatrolPoint =
          window.autoFarmPatrolPoints[window.autoFarmPatrolIndex];
        if (currentPatrolPoint) {
          v2648MinDistance = calculateDistance(
            player.x,
            player.y,
            currentPatrolPoint.x,
            currentPatrolPoint.y,
          );
          if (v2648MinDistance < 200) {
            window.autoFarmPatrolIndex =
              (window.autoFarmPatrolIndex + 1) %
              window.autoFarmPatrolPoints.length;
          }
          v24d1TargetX = currentPatrolPoint.x;
          v1ecbTargetY = currentPatrolPoint.y;
        }
      }
    }
    if (v24d1TargetX != null) {
      const v5c90Angle =
        window.autoFarmBoost &&
        v2648MinDistance > 350 &&
        aa3cNow - state.Counter > TickInterval;
      if (v5c90Angle) {
        state.Counter = aa3cNow;
      }
      aimAtTarget(v24d1TargetX, v1ecbTargetY, v5c90Angle);
    }
  } catch (v9236Data) {
    console.error("[AutoFarm]", v9236Data);
  }
  setTimeout(autoFarmLoop, 60);
}
function stopAutoFarm() {
  window.autoFarmActive = false;
  state.globalIsToggled = false;
  showNotification(
    "Farm stopped. ~" +
      window.autoFarmStats.collected +
      " food in " +
      ((Date.now() - window.autoFarmStats.startTime) / 1000).toFixed(0) +
      "s",
  );
}
document.addEventListener("keydown", (v4dafEvent) => {
  if (v4dafEvent.target.matches("input,textarea,select")) {
    return;
  }
  if (v4dafEvent.key === "F5") {
    v4dafEvent.preventDefault();
    if (window.autoFarmActive) {
      stopAutoFarm();
      const farmBtn = document.getElementById("autoFarmBtn");
      if (farmBtn) {
        farmBtn.textContent = "Auto Farm";
        farmBtn.classList.remove("toggle-on");
      }
    } else {
      const v486cFarmModeSelect = document.getElementById("farmModeSelect");
      startAutoFarm(
        v486cFarmModeSelect ? v486cFarmModeSelect.value : "nearest",
      );
      const v3dd9AutoFarmButton = document.getElementById("autoFarmBtn");
      if (v3dd9AutoFarmButton) {
        v3dd9AutoFarmButton.textContent = "Stop Farm";
        v3dd9AutoFarmButton.classList.add("toggle-on");
      }
    }
  }
});

export {
  handleFarmFailure,
  isAreaSkipped,
  findClosestFarmableEntity,
  getNearbyFarmTargets,
  findBestFarmSpot,
  calculatePlayerAvoidanceVector,
  simulateEvolveKey,
  detectAndHandleStuck,
  setupPatrolPoints,
  autoFarmLoop,
  stopAutoFarm,
};
