import { showNotification } from "./ui/interaction.js";
import {
  calculateDistance,
  getNearbyEntities,
  getAllPropertyNames,
} from "./utils.js";
import { setupPatrolPoints, autoFarmLoop } from "./features/autofarm.js";
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
import { renderOverlay, toggleEntityTrail } from "./features/entitytrail.js";
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
let isFinished = false;
function interceptTextEncoder() {
  if (isFinished) {
    return;
  }
  function unescapeString(inputString) {
    if (typeof inputString !== "string") {
      return inputString;
    }
    return inputString.replace(
      /\\(\\|n|r|t|b|f|v|\d{1,3}|x([\da-fA-F]{2})|u([\da-fA-F]{4})|u\{(0*[\da-fA-F]{1,6})\})/g,
      (match, octalStr, hexStr1, hexStr2, hexStr3) => {
        switch (octalStr[0]) {
          case "\\":
            return "\\";
          case "n":
            return "\n";
          case "r":
            return "\r";
          case "t":
            return "\t";
          case "b":
            return "\b";
          case "f":
            return "\f";
          case "v":
            return "";
          case "0":
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
            return String.fromCharCode(Number.parseInt(octalStr, 8) || 0);
          default:
            if (hexStr1 != null) {
              return String.fromCharCode(Number.parseInt(hexStr1, 16) || 0);
            }
            if (hexStr2 != null) {
              return String.fromCharCode(Number.parseInt(hexStr2, 16) || 0);
            }
            if (hexStr3 != null) {
              const codePoint = Number.parseInt(hexStr3, 16) || 0;
              if (codePoint > 1114111) {
                return match;
              } else {
                return String.fromCodePoint(codePoint);
              }
            }
            return octalStr;
        }
      },
    );
  }
  const actionCodes = {
    spawn: 22,
    createTribe: 5,
    chat: 100,
  };
  const originalEncode = TextEncoder.prototype.encode;
  TextEncoder.prototype.encode = function (...inputArgs) {
    try {
      const commandPatterns = [
        /^(\x14{3}\d+\|6\|)(.+)$/gm,
        /^(\x14{3}\d+\|8\|)(.+)$/gm,
        /^(\x14{3}\d+\|14\|)(.+)$/gm,
        /^(\x13{3}[01])(.+)$/gm,
      ];
      for (
        let patternIndex = 0;
        patternIndex < commandPatterns.length;
        patternIndex++
      ) {
        const matchResult = commandPatterns[patternIndex].exec(inputArgs[0]);
        if (matchResult && matchResult.length === 3) {
          const actionHandler = [
            actionCodes.spawn,
            actionCodes.spawn,
            actionCodes.createTribe,
            actionCodes.chat,
          ][patternIndex];
          inputArgs[0] =
            matchResult[1] +
            unescapeString(matchResult[2]).substr(0, actionHandler);
          break;
        }
      }
    } catch {}
    return Reflect.apply(originalEncode, this, inputArgs);
  };
  const inputMaxLengthObserver = new MutationObserver(() => {
    document
      .querySelector(".play-game .el-input__inner")
      ?.setAttribute("maxlength", "80");
    document
      .querySelector(".new-tribe .el-input__inner")
      ?.setAttribute("maxlength", "20");
    document
      .querySelector(".chat-input input")
      ?.setAttribute("maxLength", "1000");
  });
  inputMaxLengthObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
  isFinished = true;
  showNotification("Special characters enabled");
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
function startEntityTrail() {
  if (state.trailInterval) {
    clearInterval(state.trailInterval);
    state.trailInterval = null;
  }
  state.trailInterval = setInterval(() => {
    if (!window.entityTrailEnabled || !window.entityTrailTargetId) {
      return;
    }
    const targetEntityId = findEntityById(window.entityTrailTargetId);
    if (!targetEntityId) {
      const gameState = getNearbyEntities();
      if (gameState && gameState.players && gameState.players.length > 0) {
        window.entityTrailTargetId = gameState.players[0].id;
      }
      return;
    }
    const targetEntity = getEntityPosition(targetEntityId);
    if (!targetEntity) {
      return;
    }
    const lastTrailPoint =
      window.entityTrailHistory[window.entityTrailHistory.length - 1];
    if (
      lastTrailPoint &&
      calculateDistance(
        lastTrailPoint.x,
        lastTrailPoint.y,
        targetEntity.x,
        targetEntity.y,
      ) < 5
    ) {
      return;
    }
    window.entityTrailHistory.push({
      x: targetEntity.x,
      y: targetEntity.y,
      time: Date.now(),
    });
    if (window.entityTrailHistory.length > window.entityTrailMaxLength) {
      window.entityTrailHistory.shift();
    }
  }, window.entityTrailRecordInterval);
}
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
function startAutoFarm(farmMode) {
  window.autoFarmMode = farmMode || "nearest";
  window.autoFarmActive = true;
  window.autoFarmStats.startTime = Date.now();
  window.autoFarmStats.collected = 0;
  window.autoFarmCurrentTarget = null;
  window.autoFarmTargetStartTime = 0;
  window.autoFarmSkipIds.clear();
  window.autoFarmSkipAreas = [];
  window.autoFarmSkipClearTime = Date.now();
  state.currentPosition_2 = null;
  state.counter_2 = 0;
  state.lastValue2 = 0;
  state.lastTimestamp_2 = 0;
  if (farmMode === "patrol") {
    setupPatrolPoints();
  }
  showNotification("Auto farm started (" + window.autoFarmMode + ")");
  if (!state.isActive_2) {
    state.isActive_2 = true;
    autoFarmLoop();
  }
}
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
document.addEventListener(
  "keydown",
  (event_3) => {
    if (event_3.target.matches("input,textarea,select,[contenteditable]")) {
      return;
    }
    if (event_3.repeat) {
      return;
    }
    const entityTraceKey = window.entityTraceKey.toLowerCase();
    const entityKey = event_3.key.toLowerCase();
    const entityCode = event_3.code.toLowerCase();
    if (
      entityKey === entityTraceKey ||
      entityCode === entityTraceKey ||
      entityCode === "key" + entityTraceKey
    ) {
      event_3.preventDefault();
      toggleEntityTrail();
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
  interceptTextEncoder,
  getGameState,
  getEntityManager,
  getFirstAnimal,
  getFirstAnimalPosition,
  getEntityPosition,
  calculateDirection,
  findEntityById,
  startEntityTrail,
  clearTracking_2,
  clearTracking_3,
  startAutoFarm,
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
