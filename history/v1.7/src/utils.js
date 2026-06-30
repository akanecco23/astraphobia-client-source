import {
  stateCache,
  getGameState,
  getEntityManager,
  angle,
  gameInstance,
  state,
} from "./core.js";

function generateRandomString(length) {
  let resultString = "";
  for (let i = 0; i < length; i++) {
    const randomCodePoint = Math.floor(Math.random() * 1048575 + 65536);
    resultString += String.fromCodePoint(randomCodePoint);
  }
  return resultString;
}
function proxyProperty(targetObject, propertyKey, handler) {
  const originalValue = targetObject[propertyKey];
  const proxyValue = new Proxy(originalValue, handler);
  stateCache.set(proxyValue, originalValue);
  targetObject[propertyKey] = proxyValue;
}
function getGameCanvas() {
  return (
    document.querySelector("#gameCanvas") ||
    document.querySelector("canvas") ||
    document.querySelector("#canvas-container canvas")
  );
}
const getAllPropertyNames = (targetObject) => {
  return [
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(targetObject)),
    ...Object.getOwnPropertyNames(targetObject),
  ];
};
function isPlayer(entity) {
  if (!entity) {
    return false;
  }
  if (entity.visibleFishLevel != null && entity.visibleFishLevel > 0) {
    return true;
  }
  if (entity.fishLevel != null && entity.fishLevel > 0) {
    return true;
  }
  if (entity.level != null && entity.level > 0) {
    return true;
  }
  if (entity.score != null && entity.score > 0) {
    return true;
  }
  if (entity.xp != null && entity.xp > 0) {
    return true;
  }
  if (entity.playerRoomId != null) {
    return true;
  }
  if (entity.name != null && entity.name.length > 0) {
    return true;
  }
  if (entity.boosts != null || entity.boostCount != null) {
    return true;
  }
  if (entity.health != null && entity.health > 0) {
    return true;
  }
  if (entity.maxHealth != null && entity.maxHealth > 0) {
    return true;
  }
  return false;
}
function getMyAnimal() {
  try {
    return getGameState()?.myAnimals?.[0] || null;
  } catch (error) {
    return null;
  }
}
function getEntityById(entityId) {
  try {
    const gameState = getGameState();
    if (!gameState) {
      return null;
    }
    const parsedState = getEntityManager(gameState);
    if (!parsedState) {
      return null;
    }
    let entity = parsedState.entitiesById
      ? parsedState.entitiesById[entityId]
      : null;
    if (!entity && parsedState.entitiesList) {
      entity = parsedState.entitiesList.find(
        (currentItem) => currentItem.id === entityId,
      );
    }
    if (!entity && parsedState.animalsByPlayerRoomId) {
      for (let roomId of Object.keys(parsedState.animalsByPlayerRoomId)) {
        const roomAnimals = parsedState.animalsByPlayerRoomId[roomId];
        if (Array.isArray(roomAnimals)) {
          entity = roomAnimals.find(
            (selectedItem) => selectedItem && selectedItem.id === entityId,
          );
        } else if (roomAnimals && roomAnimals.id === entityId) {
          entity = roomAnimals;
        }
        if (entity) {
          break;
        }
      }
    }
    return entity;
  } catch (error) {
    return null;
  }
}
function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}
function getNearbyEntities() {
  try {
    const gameState = getGameState();
    const parsedState = getEntityManager(gameState);
    const myAnimal = gameState?.myAnimals?.[0];
    if (!parsedState || !myAnimal) {
      return null;
    }
    const myX =
      myAnimal.position._x !== undefined
        ? myAnimal.position._x
        : myAnimal.position.x;
    const myY =
      myAnimal.position._y !== undefined
        ? myAnimal.position._y
        : myAnimal.position.y;
    const entityData = {
      myId: myAnimal.id,
      myPos: {
        x: myX,
        y: myY,
      },
      entities: [],
      players: [],
      food: [],
    };
    const entities = parsedState.entitiesList || [];
    entities.forEach((entity) => {
      if (!entity || entity.id === myAnimal.id) {
        return;
      }
      const entityX =
        entity.position?._x !== undefined
          ? entity.position._x
          : entity.position?.x;
      const entityY =
        entity.position?._y !== undefined
          ? entity.position._y
          : entity.position?.y;
      if (entityX == null || entityY == null) {
        return;
      }
      const deltaX = entityX - myX;
      const deltaY = entityY - myY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const gameData = {
        id: entity.id,
        x: entityX,
        y: entityY,
        distance: distance,
        angle: Math.atan2(deltaY, deltaX),
        entity: entity,
      };
      entityData.entities.push(gameData);
      if (isPlayer(entity)) {
        entityData.players.push(gameData);
      } else {
        entityData.food.push(gameData);
      }
    });
    entityData.entities.sort(
      (entityA, entityB) => entityA.distance - entityB.distance,
    );
    entityData.players.sort(
      (entityA_2, entityB_2) => entityA_2.distance - entityB_2.distance,
    );
    entityData.food.sort(
      (entityA_3, secondItem) => entityA_3.distance - secondItem.distance,
    );
    return entityData;
  } catch (error) {
    return {
      error: error.message,
    };
  }
}
function getZoomLevel() {
  let zoomLevel = 0.15;
  try {
    const cameraState = getGameState();
    if (
      cameraState?.camera?.currentZoomLevel &&
      cameraState.camera.currentZoomLevel !== 0
    ) {
      zoomLevel = cameraState.camera.currentZoomLevel;
    }
    if (gameInstance?.viewport?.scale?.x) {
      zoomLevel = gameInstance.viewport.scale.x;
    }
  } catch (error) {}
  return zoomLevel;
}
function getOrCreateOverlayCanvas(canvasId, zIndex) {
  let overlayCanvas = document.getElementById(canvasId);
  if (!overlayCanvas) {
    overlayCanvas = document.createElement("canvas");
    overlayCanvas.id = canvasId;
    overlayCanvas.style.cssText =
      "position:fixed;top:0;left:0;pointer-events:none;z-index:" + zIndex + ";";
    document.body.appendChild(overlayCanvas);
  }
  const gameCanvas = getGameCanvas();
  if (gameCanvas) {
    const gameCanvasRect = gameCanvas.getBoundingClientRect();
    if (
      overlayCanvas.width !== gameCanvasRect.width ||
      overlayCanvas.height !== gameCanvasRect.height
    ) {
      overlayCanvas.width = gameCanvasRect.width;
      overlayCanvas.height = gameCanvasRect.height;
    }
    overlayCanvas.style.left = gameCanvasRect.left + "px";
    overlayCanvas.style.top = gameCanvasRect.top + "px";
    overlayCanvas.style.width = gameCanvasRect.width + "px";
    overlayCanvas.style.height = gameCanvasRect.height + "px";
  } else if (
    overlayCanvas.width !== window.innerWidth ||
    overlayCanvas.height !== window.innerHeight
  ) {
    overlayCanvas.width = window.innerWidth;
    overlayCanvas.height = window.innerHeight;
  }
  return overlayCanvas;
}

export {
  generateRandomString,
  proxyProperty,
  getGameCanvas,
  getAllPropertyNames,
  isPlayer,
  getMyAnimal,
  getEntityById,
  calculateDistance,
  getNearbyEntities,
  getZoomLevel,
  getOrCreateOverlayCanvas,
};
