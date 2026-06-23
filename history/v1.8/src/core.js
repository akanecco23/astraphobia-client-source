import { showNotification } from "./ui/interaction.js";
import { getAllPropertyNames } from "./utils.js";
import { applyTheme, initBackground, injectStyles } from "./ui/theme.js";
import {
  createToolsPanel,
  createVisionPanel,
  createCombatPanel,
  createAutomationPanel,
  createSettingsPanel,
  createUpdateHistoryPanel,
  togglePanelsVisibility,
} from "./ui/panels.js";
import { initAdBlocker } from "./features/adblock.js";
import { initRadarDrag } from "./ui/radar.js";
import { renderEspLoop, trackPlayer } from "./features/esp.js";
import { renderOverlay } from "./features/entitytrail.js";
import {
  updateLockOnTarget,
  autoDodgeLoop,
  toggleLock,
} from "./features/aimbot.js";
import { moveMouseSide } from "./features/movement.js";
const stateMap = new WeakMap();
function wrapWithProxy(targetObject, propertyKey, proxyHandler) {
  const originalValue = targetObject[propertyKey];
  const proxyValue = new Proxy(originalValue, proxyHandler);
  stateMap.set(proxyValue, originalValue);
  targetObject[propertyKey] = proxyValue;
}
const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const radius = 300;
const offsetValue = 400;
let gameInstance;
let appState;
let animalData;
const settings = {};
function getGameState() {
  try {
    if (animalData && animalData.myAnimals && animalData.myAnimals.length > 0) {
      return animalData;
    }
    const states = window.__ss?.states;
    if (!states) {
      return animalData || null;
    }
    for (let i = 0; i < states.length; i++) {
      if (states[i]?.gameScene?.myAnimals) {
        return states[i].gameScene;
      }
      if (states[i]?.gameManager) {
        for (const managerKey of Object.keys(states[i].gameManager)) {
          if (states[i].gameManager[managerKey]?.myAnimals) {
            return states[i].gameManager[managerKey];
          }
        }
      }
    }
    return animalData || null;
  } catch (error) {
    return animalData || null;
  }
}
function getEntityManager(gameState) {
  if (!gameState) {
    gameState = getGameState();
  }
  if (!gameState) {
    return null;
  }
  if (window.__cachedEM) {
    return window.__cachedEM;
  }
  if (settings.entityManager) {
    const entityManager = gameState[settings.entityManager];
    if (entityManager) {
      window.__cachedEM = entityManager;
      return entityManager;
    }
  }
  for (const key of Object.keys(gameState)) {
    const potentialManager = gameState[key];
    if (
      potentialManager &&
      typeof potentialManager === "object" &&
      !Array.isArray(potentialManager) &&
      (potentialManager.entitiesList || potentialManager.entitiesById)
    ) {
      window.__cachedEM = potentialManager;
      return potentialManager;
    }
  }
  return null;
}
function getFirstAnimal() {
  try {
    const userData = getGameState();
    if (!userData) {
      return null;
    }
    if (userData.myAnimals && userData.myAnimals.length > 0) {
      return userData.myAnimals[0];
    }
    if (userData.myPiranhas && userData.myPiranhas.length > 0) {
      return userData.myPiranhas[0];
    }
    return null;
  } catch (error) {
    return null;
  }
}
function getFirstAnimalPosition() {
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
function getEntityPosition(entity) {
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
    const angle = entity.rotation || entity.angle || entity._rotation || 0;
    dirX = Math.cos(angle);
    dirY = Math.sin(angle);
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
function findEntityById(entityId) {
  try {
    const rawState = getGameState();
    if (!rawState) {
      return null;
    }
    const gameState = getEntityManager(rawState);
    if (!gameState) {
      return null;
    }
    let foundEntity = gameState.entitiesById
      ? gameState.entitiesById[entityId]
      : null;
    if (!foundEntity && gameState.entitiesList) {
      foundEntity = gameState.entitiesList.find((item) => item.id === entityId);
    }
    if (!foundEntity && gameState.animalsByPlayerRoomId) {
      for (let roomId of Object.keys(gameState.animalsByPlayerRoomId)) {
        const roomEntities = gameState.animalsByPlayerRoomId[roomId];
        if (Array.isArray(roomEntities)) {
          foundEntity = roomEntities.find(
            (selectedItem) => selectedItem && selectedItem.id === entityId,
          );
        } else if (roomEntities && roomEntities.id === entityId) {
          foundEntity = roomEntities;
        }
        if (foundEntity) {
          break;
        }
      }
    }
    return foundEntity;
  } catch (error) {
    return null;
  }
}
let isProcessed = false;
let dragState = {
  dragging: false,
  offsetX: 0,
  offsetY: 0,
  x: null,
  y: 20,
};
function clearTracking_2() {
  window.espTrackedEntityId = null;
  showNotification("Tracking cleared");
}
const maxDistance = 600;
const maxDelta = 800;
function clearTracking_3() {
  window.autoDodgeEnabled = false;
  showNotification("Auto dodge disabled");
}
const distanceThreshold = 400;
const maxFailCount = 2;
const timeThreshold = 20000;
const timeLimit = 600;
let randomAngle = 0;
let isReady_2 = false;
const initGameHooks = () => {
  if (isReady_2) {
    return;
  }
  isReady_2 = true;
  const cache = {};
  for (const propertyKey of Object.getOwnPropertyNames(Reflect)) {
    cache[propertyKey] = Reflect[propertyKey];
  }
  const ProxyConstructor = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const wrapValue = (target, key, value) => {
    const wrappedValue = new ProxyConstructor(target[key], value);
    stateMap.set(wrappedValue, target[key]);
    target[key] = wrappedValue;
  };
  wrapValue(Function.prototype, "toString", {
    apply(thisArg, argsKey, context) {
      return cache.apply(thisArg, stateMap.get(argsKey) || argsKey, context);
    },
  });
  wrapValue(window, "Proxy", {
    construct(constructor, constructorArgs) {
      return cache.construct(constructor, constructorArgs);
    },
  });
  wrapValue(ProxyConstructor, "revocable", {
    apply(targetContext, argsArray, extraArgs) {
      return cache.apply(targetContext, argsArray, extraArgs);
    },
  });
  let lastTimestamp = 0;
  wrapValue(Function.prototype, "bind", {
    apply(thisContext, argsArray_2, extraParam) {
      try {
        try {
          if (
            lookupGetter.call(extraParam[0], "aboveBgPlatformsContainer") !=
            null
          ) {
            return cache.apply(thisContext, argsArray_2, extraParam);
          }
        } catch {}
        if (extraParam[0] && extraParam[0].aboveBgPlatformsContainer != null) {
          animalData = extraParam[0];
          gameInstance = extraParam[0].game;
          window.__cachedEM = null;
          const allKeys = getAllPropertyNames(animalData);
          const obfuscatedKeys = allKeys.filter((varName) =>
            varName.startsWith("_0x"),
          );
          settings.setFlash =
            Object.getOwnPropertyNames(animalData.__proto__.__proto__)
              .filter((identifier) => identifier.startsWith("_0x"))
              .find(
                (functionKey) => animalData[functionKey] instanceof Function,
              ) || settings.setFlash;
          settings.terrainManager =
            obfuscatedKeys.find(
              (shadowKey) =>
                typeof animalData[shadowKey]?.shadow !== "undefined",
            ) || settings.terrainManager;
          settings.entityManager =
            obfuscatedKeys.find(
              (entitiesKey) =>
                typeof animalData[entitiesKey]?.entitiesList !== "undefined",
            ) || settings.entityManager;
          settings.socketManager =
            getAllPropertyNames(gameInstance).find(
              (networkKey) =>
                typeof gameInstance[networkKey]?.sendBytePacket !== "undefined",
            ) || settings.socketManager;
          try {
            appState = document
              .getElementById("app")
              ._vnode.appContext.config.globalProperties.$simpleState.states.find(
                (gameStore) => gameStore._storeMeta.id === "game",
              );
          } catch {}
          let intervalId;
          try {
            clearInterval(intervalId);
          } catch {}
          intervalId = setInterval(() => {
            try {
              if (!animalData?.myAnimals?.[0]) {
                return;
              }
              const firstAnimal = animalData.myAnimals[0];
              if (firstAnimal.fadingTrail) {
                wrapWithProxy(
                  Object.getPrototypeOf(firstAnimal.fadingTrail),
                  "enable",
                  {
                    apply() {},
                  },
                );
              }
              if (firstAnimal.bubblesEmitter) {
                Object.defineProperty(
                  Object.getPrototypeOf(firstAnimal.bubblesEmitter),
                  "emit",
                  {
                    set: () => {},
                  },
                );
              }
              clearInterval(intervalId);
            } catch {}
          }, 200);
          if (state.lastTimestamp < Date.now() - 3000) {
            showNotification("Client loaded");
            state.lastTimestamp = Date.now();
          }
        }
      } catch {}
      return cache.apply(thisContext, argsArray_2, extraParam);
    },
  });
};
let isEnabled_2 = false;
function initializeApp() {
  if (isEnabled_2) {
    return;
  }
  isEnabled_2 = true;
  setTimeout(() => {
    injectStyles();
    applyTheme(localStorage.getItem("theme") || "grey");
    createToolsPanel();
    createVisionPanel();
    createCombatPanel();
    createAutomationPanel();
    createSettingsPanel();
    createUpdateHistoryPanel();
    initBackground();
    initAdBlocker();
    initRadarDrag();
    renderEspLoop();
    renderOverlay();
    isProcessed = true;
    updateLockOnTarget();
    state.isReady = true;
    autoDodgeLoop();
  }, 1000);
}
document.addEventListener(
  "keydown",
  (event) => {
    if (event.target.matches("input,textarea,select,[contenteditable]")) {
      return;
    }
    if (event.repeat) {
      return;
    }
    if (event.key.toLowerCase() === state.currentKey.toLowerCase()) {
      event.preventDefault();
      event.stopPropagation();
      moveMouseSide("left");
    }
    if (event.key.toLowerCase() === state.currentKey_2.toLowerCase()) {
      event.preventDefault();
      event.stopPropagation();
      moveMouseSide("right");
    }
  },
  true,
);
document.addEventListener(
  "keydown",
  (event_2) => {
    if (event_2.target.matches("input,textarea,select,[contenteditable]")) {
      return;
    }
    if (event_2.repeat) {
      return;
    }
    if (event_2.key.toLowerCase() === window.lockKey.toLowerCase()) {
      event_2.preventDefault();
      toggleLock();
    }
  },
  true,
);
document.addEventListener("keydown", (event_4) => {
  if (event_4.target.matches("input,textarea,select")) {
    return;
  }
  if (event_4.key === "F3") {
    event_4.preventDefault();
    trackPlayer();
  }
  if (event_4.key === "F4") {
    event_4.preventDefault();
    clearTracking_2();
  }
});
document.addEventListener("keydown", (keyboardEvent) => {
  if (
    keyboardEvent.key === state.pressedKey &&
    !keyboardEvent.repeat &&
    !keyboardEvent.target.matches("input,textarea,button,select")
  ) {
    keyboardEvent.preventDefault();
    togglePanelsVisibility();
  }
});
window.addEventListener("load", () => {
  setTimeout(() => {
    initGameHooks();
    initBackground();
  }, 1000);
});
export const state = {
  previousValue: "",
  lastTimestamp: 0,
  isActive: false,
  mainIntervalId: null,
  isProcessing: false,
  isFinished: false,
  secondaryIntervalId: null,
  currentIndex: 0,
  currentKey: "q",
  currentKey_2: "e",
  isEnabled: false,
  isMinimapSmall: false,
  trailInterval: null,
  isReady: false,
  previousValue_2: 0,
  currentPosition: null,
  counter: 0,
  lastValue: 0,
  dataList: [],
  lastTimestamp_2: 0,
  lastValue_2: 0,
  isActive_2: false,
  currentPosition_2: null,
  counter_2: 0,
  lastValue2: 0,
  lastValue3: 0,
  pressedKey: "Shift",
};
export {
  wrapWithProxy,
  getGameState,
  getEntityManager,
  getFirstAnimal,
  getFirstAnimalPosition,
  getEntityPosition,
  calculateDirection,
  findEntityById,
  clearTracking_2,
  clearTracking_3,
  initGameHooks,
  initializeApp,
  angles,
  radius,
  offsetValue,
  gameInstance,
  animalData,
  settings,
  isProcessed,
  dragState,
  maxDistance,
  maxDelta,
  distanceThreshold,
  maxFailCount,
  timeThreshold,
  timeLimit,
  randomAngle,
};
