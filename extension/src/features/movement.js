import { showNotification, simulateClick } from "../ui/interaction.js";
import { getFirstAnimal, getEntityManager, state } from "../core.js";
import { getGameCanvas } from "../ui/radar.js";
import { getGameState } from "./autofarm.js";
import { isValidEntity } from "../utils.js";

let currentAngleIndex = 0;
const angleSteps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const orbitRadius = 300;
function startAutoPointerMovement() {
  if (state.animationIntervalId) {
    return;
  }
  const canvas = getGameCanvas();
  if (!canvas) {
    showNotification("Canvas not found");
    return;
  }
  state.animationIntervalId = setInterval(() => {
    const radius = angleSteps[currentAngleIndex];
    const angleRadians = (Math.PI * 2 * radius) / 360;
    const offsetX = Math.round(orbitRadius * Math.sin(angleRadians));
    const offsetY = Math.round(orbitRadius * Math.cos(angleRadians));
    canvas.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: window.innerWidth / 2 + offsetX,
        clientY: window.innerHeight / 2 + offsetY,
        bubbles: true,
      }),
    );
    currentAngleIndex = (currentAngleIndex + 1) % angleSteps.length;
  }, 15);
}
function stopAutoPointerMovement() {
  if (state.animationIntervalId) {
    clearInterval(state.animationIntervalId);
    state.animationIntervalId = null;
  }
}
function toggleAutoPointerMovement() {
  if (state.animationIntervalId) {
    stopAutoPointerMovement();
  } else {
    startAutoPointerMovement();
  }
}
const offsetValue = 400;
function simulatePointerMove(direction) {
  const targetElement = getGameCanvas();
  if (!targetElement) {
    return;
  }
  const rect = targetElement.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const targetX =
    direction === "left" ? centerX - offsetValue : centerX + offsetValue;
  targetElement.dispatchEvent(
    new MouseEvent("pointermove", {
      clientX: targetX,
      clientY: centerY,
      bubbles: true,
      view: window,
    }),
  );
}
function getAnimalPosition() {
  try {
    const animal = getFirstAnimal();
    if (!animal) {
      return null;
    }
    const position = animal.position;
    return {
      x: position._x !== undefined ? position._x : position.x,
      y: position._y !== undefined ? position._y : position.y,
    };
  } catch (error) {
    return null;
  }
}
function extractPosition(entity) {
  if (!entity || !entity.position) {
    return null;
  }
  return {
    x:
      entity.position._x !== undefined ? entity.position._x : entity.position.x,
    y:
      entity.position._y !== undefined ? entity.position._y : entity.position.y,
  };
}
function calculateDirection(entity) {
  if (!entity) {
    return {
      dirX: 1,
      dirY: 0,
    };
  }
  let dirX = 0;
  let dirY = 0;
  if (entity.velocity) {
    dirX = entity.velocity._x || entity.velocity.x || 0;
    dirY = entity.velocity._y || entity.velocity.y || 0;
  }
  if (Math.abs(dirX) < 0.01 && Math.abs(dirY) < 0.01) {
    const rotation = entity.rotation || entity.angle || entity._rotation || 0;
    dirX = Math.cos(rotation);
    dirY = Math.sin(rotation);
  }
  const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
  if (magnitude > 0.001) {
    dirX /= magnitude;
    dirY /= magnitude;
  } else {
    dirX = 1;
    dirY = 0;
  }
  return {
    dirX: dirX,
    dirY: dirY,
  };
}
function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}
function buildEntityState() {
  try {
    const rawState = getGameState();
    const parsedState = getEntityManager(rawState);
    const localPlayer = getFirstAnimal();
    const localPos = getAnimalPosition();
    if (!parsedState || !localPlayer || !localPos) {
      return null;
    }
    const gameState = {
      myId: localPlayer.id,
      myPos: localPos,
      entities: [],
      players: [],
      food: [],
    };
    const entitiesList = parsedState.entitiesList || [];
    for (let i = 0; i < entitiesList.length; i++) {
      const entity = entitiesList[i];
      if (!entity || entity.id === localPlayer.id) {
        continue;
      }
      if (
        localPlayer.playerRoomId &&
        entity.playerRoomId === localPlayer.playerRoomId
      ) {
        continue;
      }
      const entityPos = extractPosition(entity);
      if (!entityPos || entityPos.x == null || entityPos.y == null) {
        continue;
      }
      const dx = entityPos.x - localPos.x;
      const dy = entityPos.y - localPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const entityData = {
        id: entity.id,
        x: entityPos.x,
        y: entityPos.y,
        distance: distance,
        angle: Math.atan2(dy, dx),
        entity: {
          ...entity,
          name: entity.entityName || entity.name || null,
        },
      };
      gameState.entities.push(entityData);
      if (entity.type === 1 || isValidEntity(entity)) {
        gameState.players.push(entityData);
      } else if (entity.type === 2 || !isValidEntity(entity)) {
        gameState.food.push(entityData);
      }
    }
    gameState.players.sort(
      (firstItem, secondItem) => firstItem.distance - secondItem.distance,
    );
    gameState.food.sort((itemA, itemB) => itemA.distance - itemB.distance);
    return gameState;
  } catch (error) {
    return {
      error: error.message,
    };
  }
}
function moveAndClickElement(targetX, targetY, shouldClick) {
  const element = getGameCanvas();
  if (!element) {
    return;
  }
  const playerPosition = getAnimalPosition();
  if (!playerPosition) {
    return;
  }
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const diffX = targetX - playerPosition.x;
  const diffY = targetY - playerPosition.y;
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
  let scaledX = diffX * multiplier;
  let scaledY = diffY * multiplier;
  const maxRadius = Math.min(rect.width, rect.height) * 0.85;
  const scaledDistance = Math.sqrt(scaledX * scaledX + scaledY * scaledY);
  if (scaledDistance > maxRadius) {
    const clampRatio = maxRadius / scaledDistance;
    scaledX *= clampRatio;
    scaledY *= clampRatio;
  }
  const finalX = centerX + scaledX;
  const finalY = centerY + scaledY;
  element.dispatchEvent(
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

export {
  startAutoPointerMovement,
  stopAutoPointerMovement,
  toggleAutoPointerMovement,
  simulatePointerMove,
  getAnimalPosition,
  extractPosition,
  calculateDirection,
  calculateDistance,
  buildEntityState,
  moveAndClickElement,
};
