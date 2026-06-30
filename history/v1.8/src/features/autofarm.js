import {
  currentTime,
  radius,
  maxFailCount,
  timeoutLimit,
  getGameState,
  getEntityManager,
  getFirstAnimalPosition,
  angle,
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

const offsetValue_qn6 = 400;
const tickInterval_st4 = 600;
function handleFarmFailure(x, y) {
  const currentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(
    (currentTime) => currentTime - currentTime.time < timeoutLimit,
  );
  let existingArea = window.autoFarmSkipAreas.find(
    (position) =>
      calculateDistance(x, y, state.position.x, state.position.y) <
      offsetValue_qn6,
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
      radius: offsetValue_qn6,
      time: currentTime,
      failCount: 1,
      skipped: false,
    });
  }
}
function isAreaSkipped(x, y) {
  const currentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(
    (timer) => currentTime - timer.time < timeoutLimit,
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
        isPlayer(targetEntity) ||
        isAreaSkipped(myY, posY)
      ) {
        return;
      }
      const distanceToTarget = calculateDistance(playerX, playerY, myY, posY);
      if (distanceToTarget < minDistance && distanceToTarget < farmRange) {
        minDistance = distanceToTarget;
        closestEntity = {
          id: targetEntity.id,
          x: myY,
          y: posY,
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
function getNearbyFarmTargets(farmRange) {
  farmRange = farmRange || window.autoFarmRange;
  try {
    const gameState = getGameState();
    const entities = getEntityManager(gameState);
    const myAnimal = gameState?.myAnimals?.[0];
    if (!entities || !myAnimal) {
      return [];
    }
    const myPosX =
      myAnimal.position._x !== undefined
        ? myAnimal.position._x
        : myAnimal.position.x;
    const myPosY =
      myAnimal.position._y !== undefined
        ? myAnimal.position._y
        : myAnimal.position.y;
    const targets = [];
    (entities.entitiesList || []).forEach((targetEntity) => {
      if (
        !targetEntity ||
        targetEntity.id === myAnimal.id ||
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
        isPlayer(targetEntity) ||
        isAreaSkipped(myY, posY)
      ) {
        return;
      }
      const distanceToTarget = calculateDistance(myPosX, myPosY, myY, posY);
      if (distanceToTarget < farmRange) {
        targets.push({
          id: targetEntity.id,
          x: myY,
          y: posY,
          distance: distanceToTarget,
          entity: targetEntity,
        });
      }
    });
    return targets.sort(
      (entityA, entityB) => entityA.distance - entityB.distance,
    );
  } catch (err) {
    return [];
  }
}
function findBestFarmSpot(searchRadius, farmRange) {
  const targetPoints = getNearbyFarmTargets(farmRange || window.autoFarmRange);
  if (!targetPoints.length) {
    return null;
  }
  let bestSpot = null;
  let maxPointCount = 0;
  targetPoints.forEach((calculateAveragePosition) => {
    let count = 0;
    let sumX = 0;
    let sumY = 0;
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
        sumX += targetPosition.x;
        sumY += targetPosition.y;
      }
    });
    if (count > maxPointCount) {
      maxPointCount = count;
      bestSpot = {
        x: sumX / count,
        y: sumY / count,
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
        const deltaX = playerPosition.x - myY;
        const deltaY = playerPosition.y - posY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const avoidanceFactor =
          (window.autoFarmAvoidDistance - Math.max(currentDistance, 50)) /
          window.autoFarmAvoidDistance;
        if (distance > 0) {
          avoidX += (deltaX / distance) * avoidanceFactor * 500;
          avoidY += (deltaY / distance) * avoidanceFactor * 500;
        }
      }
    });
  } catch (data) {}
  return {
    x: avoidX,
    y: avoidY,
  };
}
let currentTime_r3o = 0;
function simulateEvolveKey() {
  if (!window.autoFarmEvolve) {
    return;
  }
  const currentTime = Date.now();
  if (currentTime - currentTime_r3o < 5000) {
    return;
  }
  currentTime_r3o = currentTime;
  const gameCanvas = getGameCanvas();
  const randomDigit = String(Math.floor(Math.random() * 9) + 1);
  const keyboardEventOptions = {
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
      targetElement.dispatchEvent(
        new KeyboardEvent("keydown", keyboardEventOptions),
      );
      setTimeout(
        () =>
          targetElement.dispatchEvent(
            new KeyboardEvent("keyup", keyboardEventOptions),
          ),
        50,
      );
    } catch (data) {}
  });
}
let currentTime_sz8 = 0;
function detectAndHandleStuck(currentPos) {
  const now = Date.now();
  if (now - state.counter_rlc < 1500) {
    return false;
  }
  state.counter_rlc = now;
  if (state.position_r79) {
    if (
      calculateDistance(
        currentPos.x,
        currentPos.y,
        state.position_r79.x,
        state.position_r79.y,
      ) < 25
    ) {
      state.counter_ss2++;
      if (state.counter_ss2 >= 1 && window.autoFarmCurrentTarget) {
        handleFarmFailure(
          window.autoFarmCurrentTarget.x,
          window.autoFarmCurrentTarget.y,
        );
        window.autoFarmSkipIds.add(window.autoFarmCurrentTarget.id);
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        state.counter_ss2 = 0;
      }
      if (state.counter_ss2 >= 2) {
        state.counter_ss2 = 0;
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
      state.counter_ss2 = 0;
    }
  }
  state.position_r79 = {
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
    state.isToggled_suc = false;
    return;
  }
  const now = Date.now();
  if (now - window.autoFarmSkipClearTime > 15000) {
    window.autoFarmSkipIds.clear();
    window.autoFarmSkipClearTime = now;
  }
  if (
    window.autoFarmCurrentTarget &&
    window.autoFarmTargetStartTime > 0 &&
    now - window.autoFarmTargetStartTime > 1000
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
      state.isToggled_suc = false;
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
        window.autoFarmBoost && now - state.counter_ta8 > tickInterval_st4;
      if (canBoost) {
        state.counter_ta8 = now;
      }
      aimAtTarget(
        player.x + playerOffset.x,
        player.y + playerOffset.y,
        canBoost,
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
          window.autoFarmTargetStartTime = now;
          state.counter_ss2 = 0;
        }
        if (nearestTarget.distance < 40) {
          targetX += (Math.random() - 0.5) * 80;
          targetY += (Math.random() - 0.5) * 80;
        }
      } else {
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        if (now - currentTime_sz8 > 2500) {
          angle = Math.random() * Math.PI * 2;
          currentTime_sz8 = now;
        }
        targetX = player.x + Math.cos(angle) * 1000;
        targetY = player.y + Math.sin(angle) * 1000;
        minDistance = 1000;
      }
    } else if (window.autoFarmMode === "cluster") {
      const foodSource = findBestFarmSpot(500, window.autoFarmRange);
      if (foodSource && foodSource.foodCount >= 2) {
        targetX = foodSource.x + playerOffset.x * 0.3;
        targetY = foodSource.y + playerOffset.y * 0.3;
        minDistance = calculateDistance(
          player.x,
          player.y,
          foodSource.x,
          foodSource.y,
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
            window.autoFarmTargetStartTime = now;
          }
        } else {
          window.autoFarmCurrentTarget = null;
          window.autoFarmTargetStartTime = 0;
          if (now - currentTime_sz8 > 2500) {
            angle = Math.random() * Math.PI * 2;
            currentTime_sz8 = now;
          }
          targetX = player.x + Math.cos(angle) * 1000;
          targetY = player.y + Math.sin(angle) * 1000;
          minDistance = 1000;
        }
      }
    } else if (window.autoFarmMode === "patrol") {
      if (!window.autoFarmPatrolPoints.length) {
        setupPatrolPoints();
      }
      const selectedTarget_1m3 = findClosestFarmableEntity(800);
      if (selectedTarget_1m3) {
        targetX = selectedTarget_1m3.x;
        targetY = selectedTarget_1m3.y;
        minDistance = selectedTarget_1m3.distance;
        if (
          !window.autoFarmCurrentTarget ||
          window.autoFarmCurrentTarget.id !== selectedTarget_1m3.id
        ) {
          window.autoFarmCurrentTarget = selectedTarget_1m3;
          window.autoFarmTargetStartTime = now;
        }
      } else {
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        const currentPatrolPoint =
          window.autoFarmPatrolPoints[window.autoFarmPatrolIndex];
        if (currentPatrolPoint) {
          minDistance = calculateDistance(
            player.x,
            player.y,
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
        now - state.counter_ta8 > tickInterval_st4;
      if (angle) {
        state.counter_ta8 = now;
      }
      aimAtTarget(targetX, targetY, angle);
    }
  } catch (data) {
    console.error("[AutoFarm]", data);
  }
  setTimeout(autoFarmLoop, 60);
}
function stopAutoFarm() {
  window.autoFarmActive = false;
  state.isToggled_suc = false;
  showNotification(
    "Farm stopped. ~" +
      window.autoFarmStats.collected +
      " food in " +
      ((Date.now() - window.autoFarmStats.startTime) / 1000).toFixed(0) +
      "s",
  );
}
document.addEventListener("keydown", (event_6s3) => {
  if (event_6s3.target.matches("input,textarea,select")) {
    return;
  }
  if (event_6s3.key === "F5") {
    event_6s3.preventDefault();
    if (window.autoFarmActive) {
      stopAutoFarm();
      const farmBtn = document.getElementById("autoFarmBtn");
      if (farmBtn) {
        farmBtn.textContent = "Auto Farm";
        farmBtn.classList.remove("toggle-on");
      }
    } else {
      const farmModeSelect = document.getElementById("farmModeSelect");
      startAutoFarm(farmModeSelect ? farmModeSelect.value : "nearest");
      const autoFarmButton = document.getElementById("autoFarmBtn");
      if (autoFarmButton) {
        autoFarmButton.textContent = "Stop Farm";
        autoFarmButton.classList.add("toggle-on");
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
