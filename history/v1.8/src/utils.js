import {
  getGameState,
  getEntityManager,
  getFirstAnimal,
  getFirstAnimalPosition,
  getEntityPosition,
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
const getAllPropertyNames = (v1353TargetObject) => {
  return [
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(v1353TargetObject)),
    ...Object.getOwnPropertyNames(v1353TargetObject),
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
    const v169cRawState = getGameState();
    const v56d6GameState = getEntityManager(v169cRawState);
    const myPlayer = getFirstAnimal();
    const myPosition = getFirstAnimalPosition();
    if (!v56d6GameState || !myPlayer || !myPosition) {
      return null;
    }
    const entityData = {
      myId: myPlayer.id,
      myPos: myPosition,
      entities: [],
      players: [],
      food: [],
    };
    const entitiesList = v56d6GameState.entitiesList || [];
    for (let v11d5I = 0; v11d5I < entitiesList.length; v11d5I++) {
      const v2414Entity = entitiesList[v11d5I];
      if (!v2414Entity || v2414Entity.id === myPlayer.id) {
        continue;
      }
      if (
        myPlayer.playerRoomId &&
        v2414Entity.playerRoomId === myPlayer.playerRoomId
      ) {
        continue;
      }
      const pos = getEntityPosition(v2414Entity);
      if (!pos || pos.x == null || pos.y == null) {
        continue;
      }
      const dx = pos.x - myPosition.x;
      const dy = pos.y - myPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const entityInfo = {
        id: v2414Entity.id,
        x: pos.x,
        y: pos.y,
        distance: distance,
        angle: Math.atan2(dy, dx),
        entity: v2414Entity,
      };
      entityData.entities.push(entityInfo);
      if (isPlayer(v2414Entity)) {
        entityData.players.push(entityInfo);
      } else {
        entityData.food.push(entityInfo);
      }
    }
    entityData.players.sort((itemA, itemB) => itemA.distance - itemB.distance);
    entityData.food.sort((itemC, itemD) => itemC.distance - itemD.distance);
    return entityData;
  } catch (v2f85Error) {
    return {
      error: v2f85Error.message,
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
  } catch (v1daeError) {}
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
