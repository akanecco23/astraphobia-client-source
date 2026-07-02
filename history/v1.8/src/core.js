import {
  createToolsPanel,
  createVisionPanel,
  createCombatPanel,
  createAutomationPanel,
  createSettingsPanel,
  createUpdateHistoryPanel,
  togglePanelsVisibility,
} from "./ui/panels.js";
import {
  renderOverlay,
  toggleEntityTrail,
  featuresentitytrailState,
} from "./features/entitytrail.js";
import {
  calculateDistance,
  getNearbyEntities,
  getAllPropertyNames,
} from "./utils.js";
import {
  updateLockOnTarget,
  autoDodgeLoop,
  toggleLock,
} from "./features/aimbot.js";
import { renderEspLoop, trackPlayer, modToggleEsp } from "./features/esp.js";
import { setupPatrolPoints, autoFarmLoop } from "./features/autofarm.js";
import { applyTheme, initBackground, injectStyles } from "./ui/theme.js";
import { moveMouseSide } from "./features/movement.js";
import { showNotification } from "./ui/interaction.js";
import { initAdBlocker } from "./features/adblock.js";
import { initRadarDrag } from "./ui/radar.js";
const stateCache = new WeakMap();
function wrapWithProxy(targetObject, propertyKey, proxyHandler) {
  const originalValue = targetObject[propertyKey];
  const proxyValue = new Proxy(originalValue, proxyHandler);
  stateCache.set(proxyValue, originalValue);
  targetObject[propertyKey] = proxyValue;
}
let boolIsProcessed = false;
function interceptTextEncoder() {
  if (boolIsProcessed) {
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
  const observer = new MutationObserver(() => {
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
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  boolIsProcessed = true;
  showNotification("Special characters enabled");
}
const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const radius = 300;
const offsetValue = 400;
let gameInstance;
let State;
let playerData;
const Config = {};
function getGameState() {
  try {
    if (playerData && playerData.myAnimals && playerData.myAnimals.length > 0) {
      return playerData;
    }
    const states = window.__ss?.states;
    if (!states) {
      return playerData || null;
    }
    for (let v3462I = 0; v3462I < states.length; v3462I++) {
      if (states[v3462I]?.gameScene?.myAnimals) {
        return states[v3462I].gameScene;
      }
      if (states[v3462I]?.gameManager) {
        for (const managerKey of Object.keys(states[v3462I].gameManager)) {
          if (states[v3462I].gameManager[managerKey]?.myAnimals) {
            return states[v3462I].gameManager[managerKey];
          }
        }
      }
    }
    return playerData || null;
  } catch (error) {
    return playerData || null;
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
  if (Config.entityManager) {
    const entityManager = gameState[Config.entityManager];
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
  } catch (v3b2aError) {
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
  } catch (v1527Error) {
    return null;
  }
}
function getEntityPosition(v5511Entity) {
  if (!v5511Entity || !v5511Entity.position) {
    return null;
  }
  return {
    x:
      v5511Entity.position._x !== undefined
        ? v5511Entity.position._x
        : v5511Entity.position.x,
    y:
      v5511Entity.position._y !== undefined
        ? v5511Entity.position._y
        : v5511Entity.position.y,
  };
}
function calculateDirection(v2c98Entity) {
  if (!v2c98Entity) {
    return {
      dirX: 1,
      dirY: 0,
    };
  }
  let dirX = 0;
  let dirY = 0;
  if (v2c98Entity.velocity) {
    dirX = v2c98Entity.velocity._x || v2c98Entity.velocity.x || 0;
    dirY = v2c98Entity.velocity._y || v2c98Entity.velocity.y || 0;
  }
  if (Math.abs(dirX) < 0.01 && Math.abs(dirY) < 0.01) {
    const angle =
      v2c98Entity.rotation || v2c98Entity.angle || v2c98Entity._rotation || 0;
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
    const v3e73GameState = getEntityManager(rawState);
    if (!v3e73GameState) {
      return null;
    }
    let foundEntity = v3e73GameState.entitiesById
      ? v3e73GameState.entitiesById[entityId]
      : null;
    if (!foundEntity && v3e73GameState.entitiesList) {
      foundEntity = v3e73GameState.entitiesList.find(
        (item) => item.id === entityId,
      );
    }
    if (!foundEntity && v3e73GameState.animalsByPlayerRoomId) {
      for (let roomId of Object.keys(v3e73GameState.animalsByPlayerRoomId)) {
        const roomEntities = v3e73GameState.animalsByPlayerRoomId[roomId];
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
  } catch (v2eaaError) {
    return null;
  }
}
let v309eIsProcessed = false;
function startEntityTrail() {
  if (featuresentitytrailState.mainEntityTrailInterval) {
    clearInterval(featuresentitytrailState.mainEntityTrailInterval);
    featuresentitytrailState.mainEntityTrailInterval = null;
  }
  featuresentitytrailState.mainEntityTrailInterval = setInterval(() => {
    if (!window.entityTrailEnabled || !window.entityTrailTargetId) {
      return;
    }
    const targetEntityId = findEntityById(window.entityTrailTargetId);
    if (!targetEntityId) {
      const v25a6GameData = getNearbyEntities();
      if (
        v25a6GameData &&
        v25a6GameData.players &&
        v25a6GameData.players.length > 0
      ) {
        window.entityTrailTargetId = v25a6GameData.players[0].id;
      }
      return;
    }
    const v44fcTargetEntity = getEntityPosition(targetEntityId);
    if (!v44fcTargetEntity) {
      return;
    }
    const v3397LastTrailPoint =
      window.entityTrailHistory[window.entityTrailHistory.length - 1];
    if (
      v3397LastTrailPoint &&
      calculateDistance(
        v3397LastTrailPoint.x,
        v3397LastTrailPoint.y,
        v44fcTargetEntity.x,
        v44fcTargetEntity.y,
      ) < 5
    ) {
      return;
    }
    window.entityTrailHistory.push({
      x: v44fcTargetEntity.x,
      y: v44fcTargetEntity.y,
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
const tickInterval = 600;
const deltaThreshold = 800;
const maxFailCount = 2;
const timeoutLimit = 20000;
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
  state.appPosition = null;
  state.numCounter = 0;
  state.modCounter = 0;
  state.Counter = 0;
  if (farmMode === "patrol") {
    setupPatrolPoints();
  }
  showNotification("Auto farm started (" + window.autoFarmMode + ")");
  if (!state.globalIsToggled) {
    state.globalIsToggled = true;
    autoFarmLoop();
  }
}
let e296IsProcessed = false;
const initGameHooks = () => {
  if (e296IsProcessed) {
    return;
  }
  e296IsProcessed = true;
  const cache = {};
  for (const v15b7PropertyKey of Object.getOwnPropertyNames(Reflect)) {
    cache[v15b7PropertyKey] = Reflect[v15b7PropertyKey];
  }
  const ProxyConstructor = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const wrapValue = (v5946Target, url, value) => {
    const wrappedValue = new ProxyConstructor(v5946Target[url], value);
    stateCache.set(wrappedValue, v5946Target[url]);
    v5946Target[url] = wrappedValue;
  };
  wrapValue(Function.prototype, "toString", {
    apply(thisArg, argsKey, context) {
      return cache.apply(thisArg, stateCache.get(argsKey) || argsKey, context);
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
    apply(thisContext, v5ecaArgsArray, extraParam) {
      try {
        try {
          if (
            lookupGetter.call(extraParam[0], "aboveBgPlatformsContainer") !=
            null
          ) {
            return cache.apply(thisContext, v5ecaArgsArray, extraParam);
          }
        } catch {}
        if (extraParam[0] && extraParam[0].aboveBgPlatformsContainer != null) {
          playerData = extraParam[0];
          gameInstance = extraParam[0].game;
          window.__cachedEM = null;
          const allKeys = getAllPropertyNames(playerData);
          const obfuscatedKeys = allKeys.filter((varName) =>
            varName.startsWith("_0x"),
          );
          Config.setFlash =
            Object.getOwnPropertyNames(playerData.__proto__.__proto__)
              .filter((identifier) => identifier.startsWith("_0x"))
              .find(
                (functionKey) => playerData[functionKey] instanceof Function,
              ) || Config.setFlash;
          Config.terrainManager =
            obfuscatedKeys.find(
              (shadowKey) =>
                typeof playerData[shadowKey]?.shadow !== "undefined",
            ) || Config.terrainManager;
          Config.entityManager =
            obfuscatedKeys.find(
              (entitiesKey) =>
                typeof playerData[entitiesKey]?.entitiesList !== "undefined",
            ) || Config.entityManager;
          Config.socketManager =
            getAllPropertyNames(gameInstance).find(
              (networkKey) =>
                typeof gameInstance[networkKey]?.sendBytePacket !== "undefined",
            ) || Config.socketManager;
          try {
            State = document
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
              if (!playerData?.myAnimals?.[0]) {
                return;
              }
              const firstAnimal = playerData.myAnimals[0];
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
          if (lastTimestamp < Date.now() - 3000) {
            showNotification("Client loaded");
            lastTimestamp = Date.now();
          }
        }
      } catch {}
      return cache.apply(thisContext, v5ecaArgsArray, extraParam);
    },
  });
};
let modIsProcessed = false;
function initializeApp() {
  if (modIsProcessed) {
    return;
  }
  modIsProcessed = true;
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
    v309eIsProcessed = true;
    updateLockOnTarget();
    state.mainIsProcessed = true;
    autoDodgeLoop();
  }, 1000);
}
document.addEventListener(
  "keydown",
  (v3706Event) => {
    if (v3706Event.target.matches("input,textarea,select,[contenteditable]")) {
      return;
    }
    if (v3706Event.repeat) {
      return;
    }
    if (v3706Event.key.toLowerCase() === state.keyQ.toLowerCase()) {
      v3706Event.preventDefault();
      v3706Event.stopPropagation();
      moveMouseSide("left");
    }
    if (v3706Event.key.toLowerCase() === state.keyE.toLowerCase()) {
      v3706Event.preventDefault();
      v3706Event.stopPropagation();
      moveMouseSide("right");
    }
  },
  true,
);
document.addEventListener(
  "keydown",
  (v59cfEvent) => {
    if (v59cfEvent.target.matches("input,textarea,select,[contenteditable]")) {
      return;
    }
    if (v59cfEvent.repeat) {
      return;
    }
    if (v59cfEvent.key.toLowerCase() === window.lockKey.toLowerCase()) {
      v59cfEvent.preventDefault();
      toggleLock();
    }
  },
  true,
);
document.addEventListener(
  "keydown",
  (v5472Event) => {
    if (v5472Event.target.matches("input,textarea,select,[contenteditable]")) {
      return;
    }
    if (v5472Event.repeat) {
      return;
    }
    const entityTraceKey = window.entityTraceKey.toLowerCase();
    const entityKey = v5472Event.key.toLowerCase();
    const entityCode = v5472Event.code.toLowerCase();
    if (
      entityKey === entityTraceKey ||
      entityCode === entityTraceKey ||
      entityCode === "key" + entityTraceKey
    ) {
      v5472Event.preventDefault();
      toggleEntityTrail();
    }
  },
  true,
);
document.addEventListener("keydown", (v6037Event) => {
  if (v6037Event.target.matches("input,textarea,select")) {
    return;
  }
  if (v6037Event.key === "F3") {
    v6037Event.preventDefault();
    trackPlayer();
  }
  if (v6037Event.key === "F4") {
    v6037Event.preventDefault();
    modToggleEsp();
  }
});
document.addEventListener("keydown", (v1010KeyboardEvent) => {
  if (
    v1010KeyboardEvent.key === state.activeKey &&
    !v1010KeyboardEvent.repeat &&
    !v1010KeyboardEvent.target.matches("input,textarea,button,select")
  ) {
    v1010KeyboardEvent.preventDefault();
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
  currentTrackId: "",
  IsToggled: false,
  angleIndex: 0,
  keyQ: "q",
  keyE: "e",
  globalIsProcessed: false,
  boolIsToggled: false,
  mainIsProcessed: false,
  counter: 0,
  dataList: [],
  Counter: 0,
  globalIsToggled: false,
  appPosition: null,
  numCounter: 0,
  modCounter: 0,
  activeKey: "Shift",
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
  startAutoFarm,
  initGameHooks,
  initializeApp,
  angles,
  radius,
  offsetValue,
  gameInstance,
  playerData,
  v309eIsProcessed,
  dragState,
  tickInterval,
  deltaThreshold,
  maxFailCount,
  timeoutLimit,
};
