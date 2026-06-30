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
import { renderEspLoop, trackPlayer, toggleEsp_qot } from "./features/esp.js";
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
let currentTime = 0;
let isProcessed_tbm = false;
function interceptTextEncoder() {
  if (isProcessed_tbm) {
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
  isProcessed_tbm = true;
  showNotification("Special characters enabled");
}
const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const radius = 300;
const offsetValue = 400;
let gameInstance;
let appState;
let playerData;
const config = {};
function getGameState() {
  try {
    if (playerData && playerData.myAnimals && playerData.myAnimals.length > 0) {
      return playerData;
    }
    const states = window.__ss?.states;
    if (!states) {
      return playerData || null;
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
  if (config.entityManager) {
    const entityManager = gameState[config.entityManager];
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
      x: state.position._x !== undefined ? state.position._x : state.position.x,
      y: state.position._y !== undefined ? state.position._y : state.position.y,
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
let isProcessed_rjo = false;
function startEntityTrail() {
  if (featuresentitytrailState.entityTrailInterval_rf6) {
    clearInterval(featuresentitytrailState.entityTrailInterval_rf6);
    featuresentitytrailState.entityTrailInterval_rf6 = null;
  }
  featuresentitytrailState.entityTrailInterval_rf6 = setInterval(() => {
    if (!window.entityTrailEnabled || !window.entityTrailTargetId) {
      return;
    }
    const targetEntityId = findEntityById(window.entityTrailTargetId);
    if (!targetEntityId) {
      const gameData = getNearbyEntities();
      if (gameData && gameData.players && gameData.players.length > 0) {
        window.entityTrailTargetId = gameData.players[0].id;
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
const tickInterval = 600;
const deltaThreshold = 800;
const maxFailCount = 2;
const timeoutLimit = 20000;
let angle = 0;
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
  state.position_r79 = null;
  state.counter_ss2 = 0;
  state.counter_rlc = 0;
  state.counter_ta8 = 0;
  if (farmMode === "patrol") {
    setupPatrolPoints();
  }
  showNotification("Auto farm started (" + window.autoFarmMode + ")");
  if (!state.isToggled_suc) {
    state.isToggled_suc = true;
    autoFarmLoop();
  }
}
let isProcessed_js3 = false;
const initGameHooks = () => {
  if (isProcessed_js3) {
    return;
  }
  isProcessed_js3 = true;
  const cache = {};
  for (const propertyKey of Object.getOwnPropertyNames(Reflect)) {
    cache[propertyKey] = Reflect[propertyKey];
  }
  const ProxyConstructor = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const wrapValue = (target, url, value) => {
    const wrappedValue = new ProxyConstructor(target[url], value);
    stateCache.set(wrappedValue, target[url]);
    target[url] = wrappedValue;
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
    apply(thisContext, argsArray_cn2, extraParam) {
      try {
        try {
          if (
            lookupGetter.call(extraParam[0], "aboveBgPlatformsContainer") !=
            null
          ) {
            return cache.apply(thisContext, argsArray_cn2, extraParam);
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
          config.setFlash =
            Object.getOwnPropertyNames(playerData.__proto__.__proto__)
              .filter((identifier) => identifier.startsWith("_0x"))
              .find(
                (functionKey) => playerData[functionKey] instanceof Function,
              ) || config.setFlash;
          config.terrainManager =
            obfuscatedKeys.find(
              (shadowKey) =>
                typeof playerData[shadowKey]?.shadow !== "undefined",
            ) || config.terrainManager;
          config.entityManager =
            obfuscatedKeys.find(
              (entitiesKey) =>
                typeof playerData[entitiesKey]?.entitiesList !== "undefined",
            ) || config.entityManager;
          config.socketManager =
            getAllPropertyNames(gameInstance).find(
              (networkKey) =>
                typeof gameInstance[networkKey]?.sendBytePacket !== "undefined",
            ) || config.socketManager;
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
      return cache.apply(thisContext, argsArray_cn2, extraParam);
    },
  });
};
let isProcessed_qmj = false;
function initializeApp() {
  if (isProcessed_qmj) {
    return;
  }
  isProcessed_qmj = true;
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
    isProcessed_rjo = true;
    updateLockOnTarget();
    state.isProcessed_r5v = true;
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
    if (event.key.toLowerCase() === state.keyQ.toLowerCase()) {
      event.preventDefault();
      event.stopPropagation();
      moveMouseSide("left");
    }
    if (event.key.toLowerCase() === state.keyE.toLowerCase()) {
      event.preventDefault();
      event.stopPropagation();
      moveMouseSide("right");
    }
  },
  true,
);
document.addEventListener(
  "keydown",
  (event_6lj) => {
    if (event_6lj.target.matches("input,textarea,select,[contenteditable]")) {
      return;
    }
    if (event_6lj.repeat) {
      return;
    }
    if (event_6lj.key.toLowerCase() === window.lockKey.toLowerCase()) {
      event_6lj.preventDefault();
      toggleLock();
    }
  },
  true,
);
document.addEventListener(
  "keydown",
  (event_6hz) => {
    if (event_6hz.target.matches("input,textarea,select,[contenteditable]")) {
      return;
    }
    if (event_6hz.repeat) {
      return;
    }
    const entityTraceKey = window.entityTraceKey.toLowerCase();
    const entityKey = event_6hz.key.toLowerCase();
    const entityCode = event_6hz.code.toLowerCase();
    if (
      entityKey === entityTraceKey ||
      entityCode === entityTraceKey ||
      entityCode === "key" + entityTraceKey
    ) {
      event_6hz.preventDefault();
      toggleEntityTrail();
    }
  },
  true,
);
document.addEventListener("keydown", (event_6wr) => {
  if (event_6wr.target.matches("input,textarea,select")) {
    return;
  }
  if (event_6wr.key === "F3") {
    event_6wr.preventDefault();
    trackPlayer();
  }
  if (event_6wr.key === "F4") {
    event_6wr.preventDefault();
    toggleEsp_qot();
  }
});
document.addEventListener("keydown", (keyboardEvent) => {
  if (
    keyboardEvent.key === state.activeKey &&
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
  currentTrackId: "",
  isProcessed: false,
  entityTrailInterval: null,
  isToggled: false,
  angleIndex: 0,
  keyQ: "q",
  keyE: "e",
  isProcessed_rjn: false,
  isToggled_sl0: false,
  isProcessed_r5v: false,
  position: null,
  counter: 0,
  dataList: [],
  counter_ta8: 0,
  isToggled_suc: false,
  position_r79: null,
  counter_ss2: 0,
  counter_rlc: 0,
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
  currentTime,
  angles,
  radius,
  offsetValue,
  gameInstance,
  playerData,
  isProcessed_rjo,
  dragState,
  tickInterval,
  deltaThreshold,
  maxFailCount,
  timeoutLimit,
  angle,
};
