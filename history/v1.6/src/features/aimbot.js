import {
  getGameState,
  getEntityManager,
  getFirstAnimalPosition,
  tickInterval,
  deltaThreshold,
  state,
} from "../core.js";
import { isPlayer, calculateDistance } from "../utils.js";
import { simulateMoveAndClick } from "./movement.js";
import { showToast } from "../ui/interaction.js";

let numCurrentTime = 0;
let Position = null;
let globalCurrentTime = 0;
function autoDodgeLoop() {
  if (!state.modIsProcessed) {
    return;
  }
  setTimeout(autoDodgeLoop, 80);
  if (!window.autoDodgeEnabled) {
    return;
  }
  try {
    const v1057PlayerPosition = getFirstAnimalPosition();
    if (!v1057PlayerPosition) {
      return;
    }
    const v3223GameState = getGameState();
    const v2901EntityManager = getEntityManager(v3223GameState);
    const v1f29MyAnimal = v3223GameState?.myAnimals?.[0];
    if (!v2901EntityManager || !v1f29MyAnimal) {
      return;
    }
    const c71aEntitiesList = v2901EntityManager.entitiesList || [];
    let nearbyEntities = [];
    c71aEntitiesList.forEach((v2c47TargetEntity) => {
      if (!v2c47TargetEntity || v2c47TargetEntity.id === v1f29MyAnimal.id) {
        return;
      }
      if (!isPlayer(v2c47TargetEntity)) {
        return;
      }
      const v38c0MyY =
        v2c47TargetEntity.position?._x || v2c47TargetEntity.position?.x;
      const v461aPosY =
        v2c47TargetEntity.position?._y || v2c47TargetEntity.position?.y;
      if (v38c0MyY == null || v461aPosY == null) {
        return;
      }
      const distanceToTarget = calculateDistance(
        v1057PlayerPosition.x,
        v1057PlayerPosition.y,
        v38c0MyY,
        v461aPosY,
      );
      if (distanceToTarget < tickInterval) {
        nearbyEntities.push({
          x: v38c0MyY,
          y: v461aPosY,
          dist: distanceToTarget,
        });
      }
    });
    if (nearbyEntities.length === 0) {
      Position = null;
      state.counter = 0;
      state.dataList = [];
      state.entityTrailInterval = null;
      return;
    }
    const v2bc0CurrentTime = Date.now();
    let hasMoved = false;
    if (v2bc0CurrentTime - globalCurrentTime > 600) {
      globalCurrentTime = v2bc0CurrentTime;
      if (Position) {
        const distFromLastPos = calculateDistance(
          v1057PlayerPosition.x,
          v1057PlayerPosition.y,
          Position.x,
          Position.y,
        );
        if (distFromLastPos < 20) {
          state.counter++;
          hasMoved = true;
        } else {
          state.counter = 0;
          state.dataList = [];
        }
      }
      Position = {
        x: v1057PlayerPosition.x,
        y: v1057PlayerPosition.y,
      };
    }
    let sumX = 0;
    let sumY = 0;
    nearbyEntities.forEach((sourceEntity) => {
      const v52fcDeltaX = v1057PlayerPosition.x - sourceEntity.x;
      const v231bDeltaY = v1057PlayerPosition.y - sourceEntity.y;
      const v2110Distance = Math.sqrt(
        v52fcDeltaX * v52fcDeltaX + v231bDeltaY * v231bDeltaY,
      );
      if (v2110Distance > 0.01) {
        const distanceRatio = (tickInterval - sourceEntity.dist) / tickInterval;
        sumX += (v52fcDeltaX / v2110Distance) * distanceRatio;
        sumY += (v231bDeltaY / v2110Distance) * distanceRatio;
      }
    });
    let v4fc5Magnitude = Math.sqrt(sumX * sumX + sumY * sumY);
    if (v4fc5Magnitude < 0.01) {
      sumX = 1;
      sumY = 0;
      v4fc5Magnitude = 1;
    }
    sumX /= v4fc5Magnitude;
    sumY /= v4fc5Magnitude;
    let v6818Angle = Math.atan2(sumY, sumX);
    if (hasMoved && state.counter >= 1) {
      const anglePresets = [
        Math.PI / 4,
        -Math.PI / 4,
        Math.PI / 2,
        -Math.PI / 2,
        (Math.PI * 3) / 4,
        (-Math.PI * 3) / 4,
      ];
      let tempAngle = v6818Angle;
      let maxValue = -Infinity;
      for (const angleOffset of anglePresets) {
        const adjustedAngle = v6818Angle + angleOffset;
        const isAngleSimilar = state.dataList.some(
          (v3574CurrentValue) =>
            Math.abs(v3574CurrentValue - adjustedAngle) < 0.3,
        );
        if (isAngleSimilar && state.counter < 5) {
          continue;
        }
        let currentValue = 0;
        const cosAdjustedAngle = Math.cos(adjustedAngle);
        const sinAdjustedAngle = Math.sin(adjustedAngle);
        nearbyEntities.forEach((otherEntity) => {
          const v58e5DiffX = otherEntity.x - v1057PlayerPosition.x;
          const v3beaDeltaY = otherEntity.y - v1057PlayerPosition.y;
          const totalOffset =
            cosAdjustedAngle * v58e5DiffX + sinAdjustedAngle * v3beaDeltaY;
          currentValue -= totalOffset;
        });
        if (currentValue > maxValue) {
          maxValue = currentValue;
          tempAngle = adjustedAngle;
        }
      }
      v6818Angle = tempAngle;
      state.dataList.push(v6818Angle);
      if (state.dataList.length > 8) {
        state.dataList.shift();
      }
      if (state.counter >= 5) {
        v6818Angle =
          v6818Angle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
        state.counter = 0;
        state.dataList = [];
      }
    }
    state.entityTrailInterval = v6818Angle;
    const v3f83Angle = v1057PlayerPosition.x + Math.cos(v6818Angle) * 2000;
    const v5224V3f83Angle = v1057PlayerPosition.y + Math.sin(v6818Angle) * 2000;
    const v3f83V3f83Angle = v2bc0CurrentTime - numCurrentTime > deltaThreshold;
    if (v3f83V3f83Angle) {
      numCurrentTime = v2bc0CurrentTime;
    }
    simulateMoveAndClick(v3f83Angle, v5224V3f83Angle, v3f83V3f83Angle);
  } catch (data) {}
}
function enableAutoDodge() {
  window.autoDodgeEnabled = true;
  Position = null;
  state.counter = 0;
  state.dataList = [];
  state.entityTrailInterval = null;
  if (!state.modIsProcessed) {
    state.modIsProcessed = true;
    autoDodgeLoop();
  }
  showToast("Auto dodge enabled");
}

export { autoDodgeLoop, enableAutoDodge };
