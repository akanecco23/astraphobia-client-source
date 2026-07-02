import {
  stateCache,
  getGameState,
  getEntityManager,
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
const getAllPropertyNames = (v3d43TargetObject) => {
  return [
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(v3d43TargetObject)),
    ...Object.getOwnPropertyNames(v3d43TargetObject),
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
  } catch (v8683Error) {
    return null;
  }
}
function getEntityById(entityId) {
  try {
    const v299bGameState = getGameState();
    if (!v299bGameState) {
      return null;
    }
    const parsedState = getEntityManager(v299bGameState);
    if (!parsedState) {
      return null;
    }
    let v87e7Entity = parsedState.entitiesById
      ? parsedState.entitiesById[entityId]
      : null;
    if (!v87e7Entity && parsedState.entitiesList) {
      v87e7Entity = parsedState.entitiesList.find(
        (currentItem) => currentItem.id === entityId,
      );
    }
    if (!v87e7Entity && parsedState.animalsByPlayerRoomId) {
      for (let roomId of Object.keys(parsedState.animalsByPlayerRoomId)) {
        const roomAnimals = parsedState.animalsByPlayerRoomId[roomId];
        if (Array.isArray(roomAnimals)) {
          v87e7Entity = roomAnimals.find(
            (selectedItem) => selectedItem && selectedItem.id === entityId,
          );
        } else if (roomAnimals && roomAnimals.id === entityId) {
          v87e7Entity = roomAnimals;
        }
        if (v87e7Entity) {
          break;
        }
      }
    }
    return v87e7Entity;
  } catch (v10a0Error) {
    return null;
  }
}
function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}
function getNearbyEntities() {
  try {
    const v45d3GameState = getGameState();
    const v2834ParsedState = getEntityManager(v45d3GameState);
    const myAnimal = v45d3GameState?.myAnimals?.[0];
    if (!v2834ParsedState || !myAnimal) {
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
    const entities = v2834ParsedState.entitiesList || [];
    entities.forEach((v194eEntity) => {
      if (!v194eEntity || v194eEntity.id === myAnimal.id) {
        return;
      }
      const entityX =
        v194eEntity.position?._x !== undefined
          ? v194eEntity.position._x
          : v194eEntity.position?.x;
      const entityY =
        v194eEntity.position?._y !== undefined
          ? v194eEntity.position._y
          : v194eEntity.position?.y;
      if (entityX == null || entityY == null) {
        return;
      }
      const deltaX = entityX - myX;
      const deltaY = entityY - myY;
      const v4ee9Distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const v2999GameData = {
        id: v194eEntity.id,
        x: entityX,
        y: entityY,
        distance: v4ee9Distance,
        angle: Math.atan2(deltaY, deltaX),
        entity: v194eEntity,
      };
      entityData.entities.push(v2999GameData);
      if (isPlayer(v194eEntity)) {
        entityData.players.push(v2999GameData);
      } else {
        entityData.food.push(v2999GameData);
      }
    });
    entityData.entities.sort(
      (entityA, entityB) => entityA.distance - entityB.distance,
    );
    entityData.players.sort(
      (v180eEntityA, v24e9EntityB) =>
        v180eEntityA.distance - v24e9EntityB.distance,
    );
    entityData.food.sort(
      (fba1EntityA, secondItem) => fba1EntityA.distance - secondItem.distance,
    );
    return entityData;
  } catch (v3909Error) {
    return {
      error: v3909Error.message,
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
  } catch (v3422Error) {}
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
