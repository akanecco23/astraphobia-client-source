import {
  getFirstAnimalPosition,
  getEntityPosition,
  findEntityById,
  isProcessed_rjo,
  angle,
  getGameState,
  getEntityManager,
  tickInterval,
  deltaThreshold,
  state,
} from "../core.js";
import {
  getGameCanvas,
  getNearbyEntities,
  isPlayer,
  calculateDistance,
} from "../utils.js";
import { showNotification } from "../ui/interaction.js";
import { updateLockButtonUI } from "../ui/radar.js";
import { simulateClick } from "./movement.js";

function updateLockOnTarget() {
  if (!isProcessed_rjo) {
    return;
  }
  requestAnimationFrame(updateLockOnTarget);
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
    const targetPos = getEntityPosition(targetEntity);
    const playerPos = getFirstAnimalPosition();
    if (!targetPos || !playerPos) {
      return;
    }
    const canvas = getGameCanvas();
    if (!canvas) {
      return;
    }
    const canvasRect = canvas.getBoundingClientRect();
    const centerX = canvasRect.left + canvasRect.width / 2;
    const centerY = canvasRect.top + canvasRect.height / 2;
    const diffX = targetPos.x - playerPos.x;
    const diffY = targetPos.y - playerPos.y;
    const distance = Math.sqrt(diffX * diffX + diffY * diffY);
    let predictedX = targetPos.x;
    let predictedY = targetPos.y;
    if (targetEntity.velocity) {
      const velX = targetEntity.velocity._x || targetEntity.velocity.x || 0;
      const velY = targetEntity.velocity._y || targetEntity.velocity.y || 0;
      const predictionFactor = Math.min(distance / 800, 0.5);
      predictedX += velX * predictionFactor;
      predictedY += velY * predictionFactor;
    }
    const finalDiffX = predictedX - playerPos.x;
    const finalDiffY = predictedY - playerPos.y;
    const finalDistance = Math.sqrt(
      finalDiffX * finalDiffX + finalDiffY * finalDiffY,
    );
    let smoothingFactor = 1.5;
    if (finalDistance > 2000) {
      smoothingFactor = 3;
    } else if (finalDistance > 1000) {
      smoothingFactor = 2;
    } else if (finalDistance < 200) {
      smoothingFactor = 0.8;
    }
    const maxOffset = Math.min(canvasRect.width, canvasRect.height) * 0.85;
    let offsetX = finalDiffX * smoothingFactor;
    let offsetY = finalDiffY * smoothingFactor;
    const offsetMagnitude = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    if (offsetMagnitude > maxOffset) {
      const angle = maxOffset / offsetMagnitude;
      offsetX *= angle;
      offsetY *= angle;
    }
    canvas.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: centerX + offsetX,
        clientY: centerY + offsetY,
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
    const gameState = getNearbyEntities();
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
  updateLockButtonUI();
}
function aimAtTarget(targetX, targetY, shouldClick) {
  const gameCanvas = getGameCanvas();
  if (!gameCanvas) {
    return;
  }
  const playerPos = getFirstAnimalPosition();
  if (!playerPos) {
    return;
  }
  const canvasRect = gameCanvas.getBoundingClientRect();
  const canvasCenterX = canvasRect.left + canvasRect.width / 2;
  const canvasCenterY = canvasRect.top + canvasRect.height / 2;
  const diffX = targetX - playerPos.x;
  const diffY = targetY - playerPos.y;
  const distance = Math.sqrt(diffX * diffX + diffY * diffY);
  let smoothingScale = 1;
  if (distance > 5000) {
    smoothingScale = 3;
  } else if (distance > 2000) {
    smoothingScale = 2;
  } else if (distance > 1000) {
    smoothingScale = 1.5;
  } else if (distance > 500) {
    smoothingScale = 1.2;
  } else if (distance < 50) {
    smoothingScale = 0.5;
  } else if (distance < 150) {
    smoothingScale = 0.8;
  }
  let scaledX = diffX * smoothingScale;
  let scaledY = diffY * smoothingScale;
  const maxOffset = Math.min(canvasRect.width, canvasRect.height) * 0.85;
  const currentOffset = Math.sqrt(scaledX * scaledX + scaledY * scaledY);
  if (currentOffset > maxOffset) {
    const clampFactor = maxOffset / currentOffset;
    scaledX *= clampFactor;
    scaledY *= clampFactor;
  }
  const finalX = canvasCenterX + scaledX;
  const finalY = canvasCenterY + scaledY;
  gameCanvas.dispatchEvent(
    new MouseEvent("pointermove", {
      clientX: finalX,
      clientY: finalY,
      bubbles: true,
      view: window,
    }),
  );
  if (shouldClick) {
    simulateClick(finalX, finalY);
  }
}
let currentTime_qmc = 0;
let currentTime_trw = 0;
function autoDodgeLoop() {
  if (!state.isProcessed_r5v) {
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
    const entities = getEntityManager(gameState);
    const myAnimal = gameState?.myAnimals?.[0];
    if (!entities || !myAnimal) {
      return;
    }
    let nearbyEntities = [];
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
      const distanceToTarget = calculateDistance(
        playerPos.x,
        playerPos.y,
        myY,
        posY,
      );
      if (distanceToTarget < tickInterval) {
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
    const now = Date.now();
    let isDodging = false;
    if (now - currentTime_trw > 600) {
      currentTime_trw = now;
      if (state.position) {
        const moveDist = calculateDistance(
          playerPos.x,
          playerPos.y,
          state.position.x,
          state.position.y,
        );
        if (moveDist < 20) {
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
        const distanceRatio = (tickInterval - sourceEntity.dist) / tickInterval;
        sumX += (deltaX / distance) * distanceRatio;
        sumY += (deltaY / distance) * distanceRatio;
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
      let currentAngle = angle;
      let maxProjection = -Infinity;
      for (const angleOffset of anglePresets) {
        const rotatedAngle = angle + angleOffset;
        if (
          state.dataList.some(
            (myY_9nl) => Math.abs(myY_9nl - rotatedAngle) < 0.3,
          ) &&
          state.counter < 5
        ) {
          continue;
        }
        let projection = 0;
        nearbyEntities.forEach((entity) => {
          projection -=
            Math.cos(rotatedAngle) * (entity.x - playerPos.x) +
            Math.sin(rotatedAngle) * (entity.y - playerPos.y);
        });
        if (projection > maxProjection) {
          maxProjection = projection;
          currentAngle = rotatedAngle;
        }
      }
      angle = currentAngle;
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
    const angle_98u = now - currentTime_qmc > deltaThreshold;
    if (angle_98u) {
      currentTime_qmc = now;
    }
    aimAtTarget(
      playerPos.x + Math.cos(angle) * 2000,
      playerPos.y + Math.sin(angle) * 2000,
      angle_98u,
    );
  } catch (data) {}
}
function enableAutoDodge() {
  window.autoDodgeEnabled = true;
  state.position = null;
  state.counter = 0;
  state.dataList = [];
  if (!state.isProcessed_r5v) {
    state.isProcessed_r5v = true;
    autoDodgeLoop();
  }
  showNotification("Auto dodge enabled");
}

export {
  updateLockOnTarget,
  toggleLock,
  aimAtTarget,
  autoDodgeLoop,
  enableAutoDodge,
};
