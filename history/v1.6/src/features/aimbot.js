import {
  currentTime,
  getGameState,
  getEntityManager,
  getFirstAnimalPosition,
  tickInterval,
  deltaThreshold,
  angle,
  state,
} from "../core.js";
import { isPlayer, calculateDistance } from "../utils.js";
import { simulateMoveAndClick } from "./movement.js";
import { showToast } from "../ui/interaction.js";

let currentTime_2 = 0;
let currentTime_3 = 0;
let entityTrailInterval_3 = null;
function autoDodgeLoop() {
  if (!state.isProcessed_4) {
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
      const myY = targetEntity.position?._x || targetEntity.position?.x;
      const posY = targetEntity.position?._y || targetEntity.position?.y;
      if (myY == null || posY == null) {
        return;
      }
      const distanceToTarget = calculateDistance(
        playerPosition.x,
        playerPosition.y,
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
      entityTrailInterval_3 = null;
      return;
    }
    const currentTime = Date.now();
    let hasMoved = false;
    if (currentTime - currentTime_3 > 600) {
      currentTime_3 = currentTime;
      if (state.position) {
        const distFromLastPos = calculateDistance(
          playerPosition.x,
          playerPosition.y,
          state.position.x,
          state.position.y,
        );
        if (distFromLastPos < 20) {
          state.counter++;
          hasMoved = true;
        } else {
          state.counter = 0;
          state.dataList = [];
        }
      }
      state.position = {
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
    if (hasMoved && state.counter >= 1) {
      const anglePresets = [
        Math.PI / 4,
        -Math.PI / 4,
        Math.PI / 2,
        -Math.PI / 2,
        (Math.PI * 3) / 4,
        (-Math.PI * 3) / 4,
      ];
      let tempAngle = angle;
      let maxValue = -Infinity;
      for (const angleOffset of anglePresets) {
        const adjustedAngle = angle + angleOffset;
        const isAngleSimilar = state.dataList.some(
          (currentValue) => Math.abs(currentValue - adjustedAngle) < 0.3,
        );
        if (isAngleSimilar && state.counter < 5) {
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
      state.dataList.push(angle);
      if (state.dataList.length > 8) {
        state.dataList.shift();
      }
      if (state.counter >= 5) {
        angle = angle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
        state.counter = 0;
        state.dataList = [];
      }
    }
    entityTrailInterval_3 = angle;
    const angle_2 = playerPosition.x + Math.cos(angle) * 2000;
    const angle_3 = playerPosition.y + Math.sin(angle) * 2000;
    const angle_4 = currentTime - currentTime_2 > deltaThreshold;
    if (angle_4) {
      currentTime_2 = currentTime;
    }
    simulateMoveAndClick(angle_2, angle_3, angle_4);
  } catch (data) {}
}
function enableAutoDodge() {
  window.autoDodgeEnabled = true;
  state.position = null;
  state.counter = 0;
  state.dataList = [];
  entityTrailInterval_3 = null;
  if (!state.isProcessed_4) {
    state.isProcessed_4 = true;
    autoDodgeLoop();
  }
  showToast("Auto dodge enabled");
}

export { autoDodgeLoop, enableAutoDodge };
