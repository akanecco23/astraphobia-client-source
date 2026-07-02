import {
  getFirstAnimalPosition,
  getEntityPosition,
  sysIsProcessed,
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
  if (!sysIsProcessed) {
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
      const v2fcbAngle = maxRadius / offsetDistance;
      offsetX *= v2fcbAngle;
      offsetY *= v2fcbAngle;
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
    const v237bGameState = getNearbyEntities();
    if (
      v237bGameState &&
      v237bGameState.players &&
      v237bGameState.players.length > 0
    ) {
      window.lockEnabled = true;
      window.lockTargetId = v237bGameState.players[0].id;
      const targetName =
        v237bGameState.players[0].entity?.name || "ID:" + window.lockTargetId;
      showNotification("Locked: " + targetName);
    } else {
      showNotification("No players to lock on");
    }
  }
  updateLockButtonUI();
}
function movePointerToTarget(v4b7bTargetX, targetY, shouldClick) {
  const v6517Canvas = getGameCanvas();
  if (!v6517Canvas) {
    return;
  }
  const v5850LocalPlayer = getFirstAnimalPosition();
  if (!v5850LocalPlayer) {
    return;
  }
  const v2501Rect = v6517Canvas.getBoundingClientRect();
  const v2193CenterX = v2501Rect.left + v2501Rect.width / 2;
  const v4698CenterY = v2501Rect.top + v2501Rect.height / 2;
  const v93dcDiffX = v4b7bTargetX - v5850LocalPlayer.x;
  const v5ce3DiffY = targetY - v5850LocalPlayer.y;
  const v1162Distance = Math.sqrt(
    v93dcDiffX * v93dcDiffX + v5ce3DiffY * v5ce3DiffY,
  );
  let multiplier = 1;
  if (v1162Distance > 5000) {
    multiplier = 3;
  } else if (v1162Distance > 2000) {
    multiplier = 2;
  } else if (v1162Distance > 1000) {
    multiplier = 1.5;
  } else if (v1162Distance > 500) {
    multiplier = 1.2;
  } else if (v1162Distance < 50) {
    multiplier = 0.5;
  } else if (v1162Distance < 150) {
    multiplier = 0.8;
  }
  let adjustedX = v93dcDiffX * multiplier;
  let adjustedY = v5ce3DiffY * multiplier;
  const maxOffset = Math.min(v2501Rect.width, v2501Rect.height) * 0.85;
  const currentOffset = Math.sqrt(
    adjustedX * adjustedX + adjustedY * adjustedY,
  );
  if (currentOffset > maxOffset) {
    const scaleFactor = maxOffset / currentOffset;
    adjustedX *= scaleFactor;
    adjustedY *= scaleFactor;
  }
  const finalX = v2193CenterX + adjustedX;
  const finalY = v4698CenterY + adjustedY;
  v6517Canvas.dispatchEvent(
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
let numCurrentTime = 0;
let Position = null;
let sysCurrentTime = 0;
function autoDodgeLoop() {
  if (!state.v1becIsProcessed) {
    return;
  }
  setTimeout(autoDodgeLoop, 80);
  if (!window.autoDodgeEnabled) {
    return;
  }
  try {
    const v542aLocalPlayer = getFirstAnimalPosition();
    if (!v542aLocalPlayer) {
      return;
    }
    const v5914GameState = getGameState();
    const worldData = getEntityManager(v5914GameState);
    const v4838MyAnimal = v5914GameState?.myAnimals?.[0];
    if (!worldData || !v4838MyAnimal) {
      return;
    }
    let nearbyEntities = [];
    (worldData.entitiesList || []).forEach((v2d5fTargetEntity) => {
      if (
        !v2d5fTargetEntity ||
        v2d5fTargetEntity.id === v4838MyAnimal.id ||
        !isPlayer(v2d5fTargetEntity)
      ) {
        return;
      }
      const v3422MyY =
        v2d5fTargetEntity.position?._x !== undefined
          ? v2d5fTargetEntity.position._x
          : v2d5fTargetEntity.position?.x;
      const v5edePosY =
        v2d5fTargetEntity.position?._y !== undefined
          ? v2d5fTargetEntity.position._y
          : v2d5fTargetEntity.position?.y;
      if (v3422MyY == null || v5edePosY == null) {
        return;
      }
      const distanceToTarget = calculateDistance(
        v542aLocalPlayer.x,
        v542aLocalPlayer.y,
        v3422MyY,
        v5edePosY,
      );
      if (distanceToTarget < tickInterval) {
        nearbyEntities.push({
          x: v3422MyY,
          y: v5edePosY,
          dist: distanceToTarget,
        });
      }
    });
    if (nearbyEntities.length === 0) {
      Position = null;
      state.counter = 0;
      state.dataList = [];
      return;
    }
    const now = Date.now();
    let isDodging = false;
    if (now - sysCurrentTime > 600) {
      sysCurrentTime = now;
      if (Position) {
        const distFromLastPos = calculateDistance(
          v542aLocalPlayer.x,
          v542aLocalPlayer.y,
          Position.x,
          Position.y,
        );
        if (distFromLastPos < 20) {
          state.counter++;
          isDodging = true;
        } else {
          state.counter = 0;
          state.dataList = [];
        }
      }
      Position = {
        x: v542aLocalPlayer.x,
        y: v542aLocalPlayer.y,
      };
    }
    let sumX = 0;
    let sumY = 0;
    nearbyEntities.forEach((v25f7Point) => {
      const v5738DeltaX = v542aLocalPlayer.x - v25f7Point.x;
      const v5e53DeltaY = v542aLocalPlayer.y - v25f7Point.y;
      const v1134Distance = Math.sqrt(
        v5738DeltaX * v5738DeltaX + v5e53DeltaY * v5e53DeltaY,
      );
      if (v1134Distance > 0.01) {
        const distanceRatio = (tickInterval - v25f7Point.dist) / tickInterval;
        sumX += (v5738DeltaX / v1134Distance) * distanceRatio;
        sumY += (v5e53DeltaY / v1134Distance) * distanceRatio;
      }
    });
    let v2ea9Magnitude = Math.sqrt(sumX * sumX + sumY * sumY);
    if (v2ea9Magnitude < 0.01) {
      sumX = 1;
      sumY = 0;
      v2ea9Magnitude = 1;
    }
    sumX /= v2ea9Magnitude;
    sumY /= v2ea9Magnitude;
    let v112dAngle = Math.atan2(sumY, sumX);
    if (isDodging && state.counter >= 1) {
      const anglePresets = [
        Math.PI / 4,
        -Math.PI / 4,
        Math.PI / 2,
        -Math.PI / 2,
        (Math.PI * 3) / 4,
        (-Math.PI * 3) / 4,
      ];
      let v2a4dTargetAngle = v112dAngle;
      let maxProjection = -Infinity;
      for (const angleOffset of anglePresets) {
        const rotatedAngle = v112dAngle + angleOffset;
        if (
          state.dataList.some(
            (v2f0fMyY) => Math.abs(v2f0fMyY - rotatedAngle) < 0.3,
          ) &&
          state.counter < 5
        ) {
          continue;
        }
        let projection = 0;
        nearbyEntities.forEach((v5a2eEntity) => {
          projection -=
            Math.cos(rotatedAngle) * (v5a2eEntity.x - v542aLocalPlayer.x) +
            Math.sin(rotatedAngle) * (v5a2eEntity.y - v542aLocalPlayer.y);
        });
        if (projection > maxProjection) {
          maxProjection = projection;
          v2a4dTargetAngle = rotatedAngle;
        }
      }
      v112dAngle = v2a4dTargetAngle;
      state.dataList.push(v112dAngle);
      if (state.dataList.length > 8) {
        state.dataList.shift();
      }
      if (state.counter >= 5) {
        v112dAngle += Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
        state.counter = 0;
        state.dataList = [];
      }
    }
    const v10f3Angle = now - numCurrentTime > deltaThreshold;
    if (v10f3Angle) {
      numCurrentTime = now;
    }
    movePointerToTarget(
      v542aLocalPlayer.x + Math.cos(v112dAngle) * 2000,
      v542aLocalPlayer.y + Math.sin(v112dAngle) * 2000,
      v10f3Angle,
    );
  } catch (v43cbData) {}
}
function enableAutoDodge() {
  window.autoDodgeEnabled = true;
  Position = null;
  state.counter = 0;
  state.dataList = [];
  if (!state.v1becIsProcessed) {
    state.v1becIsProcessed = true;
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
