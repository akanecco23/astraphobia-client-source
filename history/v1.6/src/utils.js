import { getGameState, getEntityManager, gameInstance, state } from "./core.js";

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
const getAllPropertyNames = (v1423TargetObject) => {
  return [
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(v1423TargetObject)),
    ...Object.getOwnPropertyNames(v1423TargetObject),
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
  } catch (v422fError) {
    return null;
  }
}
function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}
function getNearbyEntities() {
  try {
    const v22a7RawState = getGameState();
    const be85ParsedState = getEntityManager(v22a7RawState);
    const myAnimal = v22a7RawState?.myAnimals?.[0];
    if (!be85ParsedState || !myAnimal) {
      return null;
    }
    const myX = myAnimal.position._x || myAnimal.position.x;
    const myY = myAnimal.position._y || myAnimal.position.y;
    const gameData = {
      myId: myAnimal.id,
      myPos: {
        x: myX,
        y: myY,
      },
      entities: [],
      players: [],
      food: [],
    };
    const entitiesList = be85ParsedState.entitiesList || [];
    entitiesList.forEach((v5680Entity) => {
      if (!v5680Entity || v5680Entity.id === myAnimal.id) {
        return;
      }
      const entityX = v5680Entity.position?._x || v5680Entity.position?.x;
      const entityY = v5680Entity.position?._y || v5680Entity.position?.y;
      if (entityX == null || entityY == null) {
        return;
      }
      const v10f2DeltaX = entityX - myX;
      const v44cdDeltaY = entityY - myY;
      const v128aDistance = Math.sqrt(
        v10f2DeltaX * v10f2DeltaX + v44cdDeltaY * v44cdDeltaY,
      );
      const v238aGameData = {
        id: v5680Entity.id,
        x: entityX,
        y: entityY,
        distance: v128aDistance,
        angle: Math.atan2(v44cdDeltaY, v10f2DeltaX),
        entity: v5680Entity,
      };
      gameData.entities.push(v238aGameData);
      if (isPlayer(v5680Entity)) {
        gameData.players.push(v238aGameData);
      } else {
        gameData.food.push(v238aGameData);
      }
    });
    gameData.entities.sort(
      (entityA, entityB) => entityA.distance - entityB.distance,
    );
    gameData.players.sort(
      (v2e08EntityA, v210eEntityB) =>
        v2e08EntityA.distance - v210eEntityB.distance,
    );
    gameData.food.sort(
      (v4159EntityA, otherItem) => v4159EntityA.distance - otherItem.distance,
    );
    return gameData;
  } catch (v4137Error) {
    return {
      error: v4137Error.message,
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
  } catch (v53aeError) {}
  return zoomLevel;
}

export {
  generateRandomString,
  getGameCanvas,
  getAllPropertyNames,
  isPlayer,
  getMyAnimal,
  calculateDistance,
  getNearbyEntities,
  getZoomLevel,
};
