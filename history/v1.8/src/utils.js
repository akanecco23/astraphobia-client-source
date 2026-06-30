import {
  getGameState,
  getEntityManager,
  getFirstAnimal,
  getFirstAnimalPosition,
  getEntityPosition,
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
function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}
function getNearbyEntities() {
  try {
    const rawState = getGameState();
    const gameState = getEntityManager(rawState);
    const myPlayer = getFirstAnimal();
    const myPosition = getFirstAnimalPosition();
    if (!gameState || !myPlayer || !myPosition) {
      return null;
    }
    const entityData = {
      myId: myPlayer.id,
      myPos: myPosition,
      entities: [],
      players: [],
      food: [],
    };
    const entitiesList = gameState.entitiesList || [];
    for (let i = 0; i < entitiesList.length; i++) {
      const entity = entitiesList[i];
      if (!entity || entity.id === myPlayer.id) {
        continue;
      }
      if (
        myPlayer.playerRoomId &&
        entity.playerRoomId === myPlayer.playerRoomId
      ) {
        continue;
      }
      const pos = getEntityPosition(entity);
      if (!pos || pos.x == null || pos.y == null) {
        continue;
      }
      const dx = pos.x - myPosition.x;
      const dy = pos.y - myPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const entityInfo = {
        id: entity.id,
        x: pos.x,
        y: pos.y,
        distance: distance,
        angle: Math.atan2(dy, dx),
        entity: entity,
      };
      entityData.entities.push(entityInfo);
      if (isPlayer(entity)) {
        entityData.players.push(entityInfo);
      } else {
        entityData.food.push(entityInfo);
      }
    }
    entityData.players.sort((itemA, itemB) => itemA.distance - itemB.distance);
    entityData.food.sort((itemC, itemD) => itemC.distance - itemD.distance);
    return entityData;
  } catch (error) {
    return {
      error: error.message,
    };
  }
}
function getZoomScale() {
  try {
    if (gameInstance?.viewport?.scale?.x && gameInstance.viewport.scale.x > 0) {
      return gameInstance.viewport.scale.x;
    }
    const camera = getGameState();
    if (camera?.camera?.zoom && camera.camera.zoom > 0) {
      return camera.camera.zoom;
    }
    if (
      camera?.camera?.currentZoomLevel &&
      camera.camera.currentZoomLevel > 0
    ) {
      return camera.camera.currentZoomLevel;
    }
    if (gameInstance?.viewport) {
      const viewport = gameInstance.viewport;
      if (
        viewport.worldWidth &&
        viewport.screenWidth &&
        viewport.worldWidth > 0
      ) {
        return viewport.screenWidth / viewport.worldWidth;
      }
      if (viewport.scaled) {
        return viewport.scaled;
      }
    }
  } catch (error) {}
  return 0.15;
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
  getGameCanvas,
  getAllPropertyNames,
  isPlayer,
  calculateDistance,
  getNearbyEntities,
  getZoomScale,
  getOrCreateOverlayCanvas,
};
