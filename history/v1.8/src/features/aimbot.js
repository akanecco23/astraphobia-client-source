import {
  getFirstAnimalPosition,
  getEntityPosition,
  findEntityById,
  v309eIsProcessed,
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
  if (!v309eIsProcessed) {
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
    const v802cCanvas = getGameCanvas();
    if (!v802cCanvas) {
      return;
    }
    const canvasRect = v802cCanvas.getBoundingClientRect();
    const v4f33CenterX = canvasRect.left + canvasRect.width / 2;
    const v55cbCenterY = canvasRect.top + canvasRect.height / 2;
    const diffX = targetPos.x - playerPos.x;
    const diffY = targetPos.y - playerPos.y;
    const f99aDistance = Math.sqrt(diffX * diffX + diffY * diffY);
    let predictedX = targetPos.x;
    let predictedY = targetPos.y;
    if (targetEntity.velocity) {
      const velX = targetEntity.velocity._x || targetEntity.velocity.x || 0;
      const velY = targetEntity.velocity._y || targetEntity.velocity.y || 0;
      const predictionFactor = Math.min(f99aDistance / 800, 0.5);
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
      const v45b8Angle = maxOffset / offsetMagnitude;
      offsetX *= v45b8Angle;
      offsetY *= v45b8Angle;
    }
    v802cCanvas.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: v4f33CenterX + offsetX,
        clientY: v55cbCenterY + offsetY,
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
    const v57e6GameState = getNearbyEntities();
    if (
      v57e6GameState &&
      v57e6GameState.players &&
      v57e6GameState.players.length > 0
    ) {
      window.lockEnabled = true;
      window.lockTargetId = v57e6GameState.players[0].id;
      const targetName =
        v57e6GameState.players[0].entity?.name || "ID:" + window.lockTargetId;
      showNotification("Locked: " + targetName);
    } else {
      showNotification("No players to lock on");
    }
  }
  updateLockButtonUI();
}
function aimAtTarget(v6c26TargetX, targetY, shouldClick) {
  const v5a94GameCanvas = getGameCanvas();
  if (!v5a94GameCanvas) {
    return;
  }
  const v1c56PlayerPos = getFirstAnimalPosition();
  if (!v1c56PlayerPos) {
    return;
  }
  const v329fCanvasRect = v5a94GameCanvas.getBoundingClientRect();
  const canvasCenterX = v329fCanvasRect.left + v329fCanvasRect.width / 2;
  const canvasCenterY = v329fCanvasRect.top + v329fCanvasRect.height / 2;
  const v4905DiffX = v6c26TargetX - v1c56PlayerPos.x;
  const e404DiffY = targetY - v1c56PlayerPos.y;
  const v776eDistance = Math.sqrt(
    v4905DiffX * v4905DiffX + e404DiffY * e404DiffY,
  );
  let smoothingScale = 1;
  if (v776eDistance > 5000) {
    smoothingScale = 3;
  } else if (v776eDistance > 2000) {
    smoothingScale = 2;
  } else if (v776eDistance > 1000) {
    smoothingScale = 1.5;
  } else if (v776eDistance > 500) {
    smoothingScale = 1.2;
  } else if (v776eDistance < 50) {
    smoothingScale = 0.5;
  } else if (v776eDistance < 150) {
    smoothingScale = 0.8;
  }
  let scaledX = v4905DiffX * smoothingScale;
  let scaledY = e404DiffY * smoothingScale;
  const v17f5MaxOffset =
    Math.min(v329fCanvasRect.width, v329fCanvasRect.height) * 0.85;
  const currentOffset = Math.sqrt(scaledX * scaledX + scaledY * scaledY);
  if (currentOffset > v17f5MaxOffset) {
    const clampFactor = v17f5MaxOffset / currentOffset;
    scaledX *= clampFactor;
    scaledY *= clampFactor;
  }
  const finalX = canvasCenterX + scaledX;
  const finalY = canvasCenterY + scaledY;
  v5a94GameCanvas.dispatchEvent(
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
let modCurrentTime = 0;
function autoDodgeLoop() {
  if (!state.mainIsProcessed) {
    return;
  }
  setTimeout(autoDodgeLoop, 80);
  if (!window.autoDodgeEnabled) {
    return;
  }
  try {
    const caeaPlayerPos = getFirstAnimalPosition();
    if (!caeaPlayerPos) {
      return;
    }
    const b8e9GameState = getGameState();
    const ef01Entities = getEntityManager(b8e9GameState);
    const myAnimal = b8e9GameState?.myAnimals?.[0];
    if (!ef01Entities || !myAnimal) {
      return;
    }
    let nearbyEntities = [];
    (ef01Entities.entitiesList || []).forEach((v2b24TargetEntity) => {
      if (
        !v2b24TargetEntity ||
        v2b24TargetEntity.id === myAnimal.id ||
        !isPlayer(v2b24TargetEntity)
      ) {
        return;
      }
      const v5a7bMyY =
        v2b24TargetEntity.position?._x !== undefined
          ? v2b24TargetEntity.position._x
          : v2b24TargetEntity.position?.x;
      const v1bdaPosY =
        v2b24TargetEntity.position?._y !== undefined
          ? v2b24TargetEntity.position._y
          : v2b24TargetEntity.position?.y;
      if (v5a7bMyY == null || v1bdaPosY == null) {
        return;
      }
      const distanceToTarget = calculateDistance(
        caeaPlayerPos.x,
        caeaPlayerPos.y,
        v5a7bMyY,
        v1bdaPosY,
      );
      if (distanceToTarget < tickInterval) {
        nearbyEntities.push({
          x: v5a7bMyY,
          y: v1bdaPosY,
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
    if (now - modCurrentTime > 600) {
      modCurrentTime = now;
      if (Position) {
        const moveDist = calculateDistance(
          caeaPlayerPos.x,
          caeaPlayerPos.y,
          Position.x,
          Position.y,
        );
        if (moveDist < 20) {
          state.counter++;
          isDodging = true;
        } else {
          state.counter = 0;
          state.dataList = [];
        }
      }
      Position = {
        x: caeaPlayerPos.x,
        y: caeaPlayerPos.y,
      };
    }
    let sumX = 0;
    let sumY = 0;
    nearbyEntities.forEach((sourceEntity) => {
      const v26b1DeltaX = caeaPlayerPos.x - sourceEntity.x;
      const v2233DeltaY = caeaPlayerPos.y - sourceEntity.y;
      const v49f9Distance = Math.sqrt(
        v26b1DeltaX * v26b1DeltaX + v2233DeltaY * v2233DeltaY,
      );
      if (v49f9Distance > 0.01) {
        const distanceRatio = (tickInterval - sourceEntity.dist) / tickInterval;
        sumX += (v26b1DeltaX / v49f9Distance) * distanceRatio;
        sumY += (v2233DeltaY / v49f9Distance) * distanceRatio;
      }
    });
    let v1ac5Magnitude = Math.sqrt(sumX * sumX + sumY * sumY);
    if (v1ac5Magnitude < 0.01) {
      sumX = 1;
      sumY = 0;
      v1ac5Magnitude = 1;
    }
    sumX /= v1ac5Magnitude;
    sumY /= v1ac5Magnitude;
    let v3e0bAngle = Math.atan2(sumY, sumX);
    if (isDodging && state.counter >= 1) {
      const anglePresets = [
        Math.PI / 4,
        -Math.PI / 4,
        Math.PI / 2,
        -Math.PI / 2,
        (Math.PI * 3) / 4,
        (-Math.PI * 3) / 4,
      ];
      let currentAngle = v3e0bAngle;
      let maxProjection = -Infinity;
      for (const angleOffset of anglePresets) {
        const rotatedAngle = v3e0bAngle + angleOffset;
        if (
          state.dataList.some(
            (c08aMyY) => Math.abs(c08aMyY - rotatedAngle) < 0.3,
          ) &&
          state.counter < 5
        ) {
          continue;
        }
        let projection = 0;
        nearbyEntities.forEach((v5a3bEntity) => {
          projection -=
            Math.cos(rotatedAngle) * (v5a3bEntity.x - caeaPlayerPos.x) +
            Math.sin(rotatedAngle) * (v5a3bEntity.y - caeaPlayerPos.y);
        });
        if (projection > maxProjection) {
          maxProjection = projection;
          currentAngle = rotatedAngle;
        }
      }
      v3e0bAngle = currentAngle;
      state.dataList.push(v3e0bAngle);
      if (state.dataList.length > 8) {
        state.dataList.shift();
      }
      if (state.counter >= 5) {
        v3e0bAngle += Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
        state.counter = 0;
        state.dataList = [];
      }
    }
    const v5c2fAngle = now - numCurrentTime > deltaThreshold;
    if (v5c2fAngle) {
      numCurrentTime = now;
    }
    aimAtTarget(
      caeaPlayerPos.x + Math.cos(v3e0bAngle) * 2000,
      caeaPlayerPos.y + Math.sin(v3e0bAngle) * 2000,
      v5c2fAngle,
    );
  } catch (v5c4fData) {}
}
function enableAutoDodge() {
  window.autoDodgeEnabled = true;
  Position = null;
  state.counter = 0;
  state.dataList = [];
  if (!state.mainIsProcessed) {
    state.mainIsProcessed = true;
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
