import {
  getFirstAnimalPosition,
  getEntityPosition,
  isProcessed_l68,
  angle,
  getGameState,
  getEntityManager,
  tickInterval,
  deltaThreshold,
  state,
} from "../core.js";
import {
  getGameCanvas,
  getEntityById,
  getNearbyEntities,
  isPlayer,
  calculateDistance,
} from "../utils.js";
import { showNotification } from "../ui/interaction.js";
import { updateLockButtonUI } from "../ui/radar.js";
import { simulateClick } from "./movement.js";

function updateLockOnTarget() {
  if (!isProcessed_l68) {
    return;
  }
  requestAnimationFrame(updateLockOnTarget);
  if (!window.lockEnabled || !window.lockTargetId) {
    return;
  }
  try {
    const targetEntity = getEntityById(window.lockTargetId);
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
    const canvasElement = getGameCanvas();
    if (!canvasElement) {
      return;
    }
    const canvasRect = canvasElement.getBoundingClientRect();
    const canvasCenterX = canvasRect.left + canvasRect.width / 2;
    const canvasCenterY = canvasRect.top + canvasRect.height / 2;
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
    const relativeX = predictedX - playerPos.x;
    const relativeY = predictedY - playerPos.y;
    const relativeDistance = Math.sqrt(
      relativeX * relativeX + relativeY * relativeY,
    );
    let smoothingFactor = 1.5;
    if (relativeDistance > 2000) {
      smoothingFactor = 3;
    } else if (relativeDistance > 1000) {
      smoothingFactor = 2;
    } else if (relativeDistance < 200) {
      smoothingFactor = 0.8;
    }
    const maxRadius = Math.min(canvasRect.width, canvasRect.height) * 0.85;
    let offsetX = relativeX * smoothingFactor;
    let offsetY = relativeY * smoothingFactor;
    const offsetDistance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    if (offsetDistance > maxRadius) {
      const angle = maxRadius / offsetDistance;
      offsetX *= angle;
      offsetY *= angle;
    }
    canvasElement.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: canvasCenterX + offsetX,
        clientY: canvasCenterY + offsetY,
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
function movePointerToTarget(targetX, targetY, shouldClick) {
  const canvas = getGameCanvas();
  if (!canvas) {
    return;
  }
  const localPlayer = getFirstAnimalPosition();
  if (!localPlayer) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const diffX = targetX - localPlayer.x;
  const diffY = targetY - localPlayer.y;
  const distance = Math.sqrt(diffX * diffX + diffY * diffY);
  let multiplier = 1;
  if (distance > 5000) {
    multiplier = 3;
  } else if (distance > 2000) {
    multiplier = 2;
  } else if (distance > 1000) {
    multiplier = 1.5;
  } else if (distance > 500) {
    multiplier = 1.2;
  } else if (distance < 50) {
    multiplier = 0.5;
  } else if (distance < 150) {
    multiplier = 0.8;
  }
  let adjustedX = diffX * multiplier;
  let adjustedY = diffY * multiplier;
  const maxOffset = Math.min(rect.width, rect.height) * 0.85;
  const currentOffset = Math.sqrt(
    adjustedX * adjustedX + adjustedY * adjustedY,
  );
  if (currentOffset > maxOffset) {
    const scaleFactor = maxOffset / currentOffset;
    adjustedX *= scaleFactor;
    adjustedY *= scaleFactor;
  }
  const finalX = centerX + adjustedX;
  const finalY = centerY + adjustedY;
  canvas.dispatchEvent(
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
let currentTime_iij = 0;
let currentTime_sbn = 0;
function autoDodgeLoop() {
  if (!state.isProcessed_rdv) {
    return;
  }
  setTimeout(autoDodgeLoop, 80);
  if (!window.autoDodgeEnabled) {
    return;
  }
  try {
    const localPlayer = getFirstAnimalPosition();
    if (!localPlayer) {
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
        localPlayer.x,
        localPlayer.y,
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
    if (now - currentTime_sbn > 600) {
      currentTime_sbn = now;
      if (state.position) {
        const distFromLastPos = calculateDistance(
          localPlayer.x,
          localPlayer.y,
          state.position.x,
          state.position.y,
        );
        if (distFromLastPos < 20) {
          state.counter++;
          isDodging = true;
        } else {
          state.counter = 0;
          state.dataList = [];
        }
      }
      state.position = {
        x: localPlayer.x,
        y: localPlayer.y,
      };
    }
    let sumX = 0;
    let sumY = 0;
    nearbyEntities.forEach((point) => {
      const deltaX = localPlayer.x - point.x;
      const deltaY = localPlayer.y - point.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance > 0.01) {
        const distanceRatio = (tickInterval - point.dist) / tickInterval;
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
      let targetAngle = angle;
      let maxProjection = -Infinity;
      for (const angleOffset of anglePresets) {
        const rotatedAngle = angle + angleOffset;
        if (
          state.dataList.some(
            (myY_7x0) => Math.abs(myY_7x0 - rotatedAngle) < 0.3,
          ) &&
          state.counter < 5
        ) {
          continue;
        }
        let projection = 0;
        nearbyEntities.forEach((entity) => {
          projection -=
            Math.cos(rotatedAngle) * (entity.x - localPlayer.x) +
            Math.sin(rotatedAngle) * (entity.y - localPlayer.y);
        });
        if (projection > maxProjection) {
          maxProjection = projection;
          targetAngle = rotatedAngle;
        }
      }
      angle = targetAngle;
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
    const angle_qxb = now - currentTime_iij > deltaThreshold;
    if (angle_qxb) {
      currentTime_iij = now;
    }
    movePointerToTarget(
      localPlayer.x + Math.cos(angle) * 2000,
      localPlayer.y + Math.sin(angle) * 2000,
      angle_qxb,
    );
  } catch (data) {}
}
function enableAutoDodge() {
  window.autoDodgeEnabled = true;
  state.position = null;
  state.counter = 0;
  state.dataList = [];
  if (!state.isProcessed_rdv) {
    state.isProcessed_rdv = true;
    autoDodgeLoop();
  }
  showNotification("Auto dodge enabled");
}

export {
  updateLockOnTarget,
  toggleLock,
  movePointerToTarget,
  autoDodgeLoop,
  enableAutoDodge,
};
