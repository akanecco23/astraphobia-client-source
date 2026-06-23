import {
  getGameState,
  getEntityManager,
  angle,
  coreSharedState,
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
function getMyAnimal() {
  try {
    return getGameState()?.myAnimals?.[0] || null;
  } catch (error) {
    return null;
  }
}
function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}
function getNearbyEntities() {
  try {
    const rawState = getGameState();
    const parsedState = getEntityManager(rawState);
    const myAnimal = rawState?.myAnimals?.[0];
    if (!parsedState || !myAnimal) {
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
    const entitiesList = parsedState.entitiesList || [];
    entitiesList.forEach((entity) => {
      if (!entity || entity.id === myAnimal.id) {
        return;
      }
      const entityX = entity.position?._x || entity.position?.x;
      const entityY = entity.position?._y || entity.position?.y;
      if (entityX == null || entityY == null) {
        return;
      }
      const deltaX = entityX - myX;
      const deltaY = entityY - myY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const entityData = {
        id: entity.id,
        x: entityX,
        y: entityY,
        distance: distance,
        angle: Math.atan2(deltaY, deltaX),
        entity: entity,
      };
      gameData.entities.push(entityData);
      if (isPlayer(entity)) {
        gameData.players.push(entityData);
      } else {
        gameData.food.push(entityData);
      }
    });
    gameData.entities.sort(
      (entityA, entityB) => entityA.distance - entityB.distance,
    );
    gameData.players.sort(
      (entityA_2, entityB_2) => entityA_2.distance - entityB_2.distance,
    );
    gameData.food.sort(
      (entityA_3, otherItem) => entityA_3.distance - otherItem.distance,
    );
    return gameData;
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
    if (coreSharedState.game?.viewport?.scale?.x) {
      zoomLevel = coreSharedState.game.viewport.scale.x;
    }
  } catch (error) {}
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
