import {
  getGameState,
  getEntityManager,
  getFirstAnimalPosition,
  maxDistance,
  distanceThreshold,
  angle,
  coreSharedState,
} from "../core.js";
import { isPlayer, calculateDistance } from "../utils.js";
import { simulateMoveAndClick } from "./movement.js";
import { showToast } from "../ui/interaction.js";

window.autoDodgeEnabled = false;

function autoDodgeLoop() {
  if (!coreSharedState.isInitialized_2) {
    return;
  }
  setTimeout(autoDodgeLoop, 80);
  if (!window.autoDodgeEnabled) {
    return;
  }
  try {
    const playerPosition = getFirstAnimalPosition();
    if (!playerPosition) {
      return;
    }
    const gameState = getGameState();
    const entityManager = getEntityManager(gameState);
    const myAnimal = gameState?.myAnimals?.[0];
    if (!entityManager || !myAnimal) {
      return;
    }
    const entitiesList = entityManager.entitiesList || [];
    let nearbyEntities = [];
    entitiesList.forEach((targetEntity) => {
      if (!targetEntity || targetEntity.id === myAnimal.id) {
        return;
      }
      if (!isPlayer(targetEntity)) {
        return;
      }
      const targetX = targetEntity.position?._x || targetEntity.position?.x;
      const targetY = targetEntity.position?._y || targetEntity.position?.y;
      if (targetX == null || targetY == null) {
        return;
      }
      const distanceToTarget = calculateDistance(
        playerPosition.x,
        playerPosition.y,
        targetX,
        targetY,
      );
      if (distanceToTarget < maxDistance) {
        nearbyEntities.push({
          x: targetX,
          y: targetY,
          dist: distanceToTarget,
        });
      }
    });
    if (nearbyEntities.length === 0) {
      coreSharedState.currentPosition = null;
      coreSharedState.counter = 0;
      coreSharedState.dataList = [];
      coreSharedState.targetReference = null;
      return;
    }
    const currentTime = Date.now();
    let hasMoved = false;
    if (currentTime - coreSharedState.lastTimeB > 600) {
      coreSharedState.lastTimeB = currentTime;
      if (coreSharedState.currentPosition) {
        const distFromLastPos = calculateDistance(
          playerPosition.x,
          playerPosition.y,
          coreSharedState.currentPosition.x,
          coreSharedState.currentPosition.y,
        );
        if (distFromLastPos < 20) {
          coreSharedState.counter++;
          hasMoved = true;
        } else {
          coreSharedState.counter = 0;
          coreSharedState.dataList = [];
        }
      }
      coreSharedState.currentPosition = {
        x: playerPosition.x,
        y: playerPosition.y,
      };
    }
    let sumX = 0;
    let sumY = 0;
    nearbyEntities.forEach((sourceEntity) => {
      const deltaX = playerPosition.x - sourceEntity.x;
      const deltaY = playerPosition.y - sourceEntity.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance > 0.01) {
        const distanceRatio = (maxDistance - sourceEntity.dist) / maxDistance;
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
    if (hasMoved && coreSharedState.counter >= 1) {
      const presetAngles = [
        Math.PI / 4,
        -Math.PI / 4,
        Math.PI / 2,
        -Math.PI / 2,
        (Math.PI * 3) / 4,
        (-Math.PI * 3) / 4,
      ];
      let tempAngle = angle;
      let maxValue = -Infinity;
      for (const angleOffset of presetAngles) {
        const adjustedAngle = angle + angleOffset;
        const isAngleSimilar = coreSharedState.dataList.some(
          (currentValue) => Math.abs(currentValue - adjustedAngle) < 0.3,
        );
        if (isAngleSimilar && coreSharedState.counter < 5) {
          continue;
        }
        let currentValue = 0;
        const cosAdjustedAngle = Math.cos(adjustedAngle);
        const sinAdjustedAngle = Math.sin(adjustedAngle);
        nearbyEntities.forEach((otherEntity) => {
          const diffX = otherEntity.x - playerPosition.x;
          const deltaY_2 = otherEntity.y - playerPosition.y;
          const totalOffset =
            cosAdjustedAngle * diffX + sinAdjustedAngle * deltaY_2;
          currentValue -= totalOffset;
        });
        if (currentValue > maxValue) {
          maxValue = currentValue;
          tempAngle = adjustedAngle;
        }
      }
      angle = tempAngle;
      coreSharedState.dataList.push(angle);
      if (coreSharedState.dataList.length > 8) {
        coreSharedState.dataList.shift();
      }
      if (coreSharedState.counter >= 5) {
        angle = angle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
        coreSharedState.counter = 0;
        coreSharedState.dataList = [];
      }
    }
    coreSharedState.targetReference = angle;
    const targetX = playerPosition.x + Math.cos(angle) * 2000;
    const targetY = playerPosition.y + Math.sin(angle) * 2000;
    const isAboveThreshold =
      currentTime - coreSharedState.lastTimeA > distanceThreshold;
    if (isAboveThreshold) {
      coreSharedState.lastTimeA = currentTime;
    }
    simulateMoveAndClick(targetX, targetY, isAboveThreshold);
  } catch (tempValue) {}
}
function enableAutoDodge() {
  window.autoDodgeEnabled = true;
  coreSharedState.currentPosition = null;
  coreSharedState.counter = 0;
  coreSharedState.dataList = [];
  coreSharedState.targetReference = null;
  if (!coreSharedState.isInitialized_2) {
    coreSharedState.isInitialized_2 = true;
    autoDodgeLoop();
  }
  showToast("Auto dodge enabled");
}

export { autoDodgeLoop, enableAutoDodge };
