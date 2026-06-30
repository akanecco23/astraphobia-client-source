import {
  createToolsPanel,
  createPlusPanel,
  createSettingsPanel,
  createUpdateHistoryPanel,
  toggleUiVisibility,
} from "./ui/panels.js";
import {
  generatePatrolPoints,
  startAutoFarmLoop,
} from "./features/autofarm.js";
import { renderEspLoop, trackPlayer, toggleEsp_2 } from "./features/esp.js";
import { applyTheme, initBackground, injectStyles } from "./ui/theme.js";
import { showToast, restoreUIInteractivity } from "./ui/interaction.js";
import { calculateDistance, getAllPropertyNames } from "./utils.js";
import { moveMouseToSide } from "./features/movement.js";
import { initAdBlocker } from "./features/adblock.js";
import { autoDodgeLoop } from "./features/aimbot.js";
import { initRadarDrag } from "./ui/radar.js";
const stateCache = new WeakMap();
function wrapWithProxy(targetObject, propertyKey, handler) {
  const originalValue = targetObject[propertyKey];
  const proxyValue = new Proxy(originalValue, handler);
  stateCache.set(proxyValue, originalValue);
  targetObject[propertyKey] = proxyValue;
}
let currentTime = 0;
let isProcessed_2 = false;
function hookTextEncoder() {
  if (isProcessed_2) {
    return;
  }
  function unescapeString(inputString) {
    if (typeof inputString !== "string") {
      return inputString;
    }
    return inputString.replace(
      /\\(\\|n|r|t|b|f|v|\d{1,3}|x([\da-fA-F]{2})|u([\da-fA-F]{4})|u\{(0*[\da-fA-F]{1,6})\})/g,
      (match, octalValue, hexValue, unicodeValue, extendedUnicodeValue) => {
        switch (octalValue[0]) {
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
            return String.fromCharCode(Number.parseInt(octalValue, 8) || 0);
          default:
            if (hexValue != null) {
              return String.fromCharCode(Number.parseInt(hexValue, 16) || 0);
            }
            if (unicodeValue != null) {
              return String.fromCharCode(
                Number.parseInt(unicodeValue, 16) || 0,
              );
            }
            if (extendedUnicodeValue != null) {
              const codePoint = Number.parseInt(extendedUnicodeValue, 16) || 0;
              if (codePoint > 1114111) {
                return match;
              } else {
                return String.fromCodePoint(codePoint);
              }
            }
            return octalValue;
        }
      },
    );
  }
  const actionMap = {
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
          const handlerMethod = [
            actionMap.spawn,
            actionMap.spawn,
            actionMap.createTribe,
            actionMap.chat,
          ][patternIndex];
          inputArgs[0] =
            matchResult[1] +
            unescapeString(matchResult[2]).substr(0, handlerMethod);
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
  isProcessed_2 = true;
  showToast("Special characters enabled");
}
const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const radius = 300;
const offsetValue = 400;
let gameInstance;
let appState;
let playerData;
let isProcessed_3 = false;
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
function getFirstAnimalPosition() {
  try {
    const animal = getGameState();
    const position = animal?.myAnimals?.[0];
    if (!state.position) {
      return null;
    }
    return {
      x: state.position.position._x ?? state.position.position.x,
      y: state.position.position._y ?? state.position.position.y,
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
    x: entity.position._x || entity.position.x,
    y: entity.position._y || entity.position.y,
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
    const parsedState = getEntityManager(rawState);
    if (!parsedState) {
      return null;
    }
    let entity = parsedState.entitiesById
      ? parsedState.entitiesById[entityId]
      : null;
    if (!entity && parsedState.entitiesList) {
      entity = parsedState.entitiesList.find((item) => item.id === entityId);
    }
    if (!entity && parsedState.animalsByPlayerRoomId) {
      for (let roomId of Object.keys(parsedState.animalsByPlayerRoomId)) {
        const animals = parsedState.animalsByPlayerRoomId[roomId];
        if (Array.isArray(animals)) {
          entity = animals.find(
            (selectedItem) => selectedItem && selectedItem.id === entityId,
          );
        } else if (animals && animals.id === entityId) {
          entity = animals;
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
function isAreaSkipped_2(x, y) {
  const currentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(
    (timerState) => currentTime - timerState.time < timeoutLimit,
  );
  return window.autoFarmSkipAreas.some(
    (cellData) =>
      cellData.skipped &&
      calculateDistance(x, y, cellData.x, cellData.y) < cellData.radius,
  );
}
let angle = 0;
function initAutoFarm(farmMode) {
  window.autoFarmMode = farmMode || "nearest";
  window.autoFarmActive = true;
  window.autoFarmStats.startTime = Date.now();
  window.autoFarmStats.collected = 0;
  window.autoFarmCurrentTarget = null;
  window.autoFarmTargetStartTime = 0;
  window.autoFarmSkipIds.clear();
  window.autoFarmSkipAreas = [];
  window.autoFarmSkipClearTime = Date.now();
  state.position_2 = null;
  state.counter_3 = 0;
  state.counter_4 = 0;
  state.counter_2 = 0;
  if (farmMode === "patrol") {
    generatePatrolPoints();
  }
  showToast("Auto farm started (" + window.autoFarmMode + ")");
  startAutoFarmLoop();
}
let isProcessed_5 = false;
const initializeAntiDetection = () => {
  if (isProcessed_5) {
    return;
  }
  isProcessed_5 = true;
  const cache = {};
  for (const propertyKey of Object.getOwnPropertyNames(Reflect)) {
    cache[propertyKey] = Reflect[propertyKey];
  }
  const Proxy = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const wrapValue = (registry, url, options) => {
    const instance = new Proxy(registry[url], options);
    stateCache.set(instance, registry[url]);
    registry[url] = instance;
  };
  wrapValue(Function.prototype, "toString", {
    apply(thisContext, paramKey, args) {
      return cache.apply(
        thisContext,
        stateCache.get(paramKey) || paramKey,
        args,
      );
    },
  });
  wrapValue(window, "Proxy", {
    construct(constructor, constructorArgs) {
      return cache.construct(constructor, constructorArgs);
    },
  });
  wrapValue(Proxy, "revocable", {
    apply(targetContext, params, extraParams) {
      return cache.apply(targetContext, params, extraParams);
    },
  });
  let lastTimestamp = 0;
  wrapValue(Function.prototype, "bind", {
    apply(thisArg, argsArray, extraArgs) {
      try {
        try {
          if (
            lookupGetter.call(extraArgs[0], "aboveBgPlatformsContainer") != null
          ) {
            return cache.apply(thisArg, argsArray, extraArgs);
          }
        } catch {}
        if (extraArgs[0] && extraArgs[0].aboveBgPlatformsContainer != null) {
          playerData = extraArgs[0];
          gameInstance = extraArgs[0].game;
          window.__cachedEM = null;
          const allProperties = getAllPropertyNames(playerData);
          const obfuscatedProperties = allProperties.filter((varName) =>
            varName.startsWith("_0x"),
          );
          config.setFlash =
            Object.getOwnPropertyNames(playerData.__proto__.__proto__)
              .filter((propName) => propName.startsWith("_0x"))
              .find(
                (functionKey) => playerData[functionKey] instanceof Function,
              ) || config.setFlash;
          config.terrainManager =
            obfuscatedProperties.find(
              (shadowKey) =>
                typeof playerData[shadowKey]?.shadow !== "undefined",
            ) || config.terrainManager;
          config.entityManager =
            obfuscatedProperties.find(
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
            showToast("Client loaded");
            lastTimestamp = Date.now();
          }
        }
      } catch {}
      return cache.apply(thisArg, argsArray, extraArgs);
    },
  });
};
const initializeViewportSettings = () => {
  if (isProcessed_3) {
    return;
  }
  if (!playerData) {
    setTimeout(initializeViewportSettings, 500);
    return;
  }
  setInterval(() => {
    try {
      gameInstance.viewport.clampZoom({
        minWidth: 0,
        maxWidth: 10000000,
      });
      gameInstance.viewport.plugins.plugins.clamp = null;
      gameInstance.viewport.plugins.plugins["clamp-zoom"] = null;
    } catch {}
  }, 300);
  try {
    if (config.setFlash) {
      playerData[config.setFlash] = () => {};
    }
    if (config.terrainManager) {
      const terrainManager = playerData[config.terrainManager];
      if (terrainManager?.shadow) {
        terrainManager.shadow.setShadowSize(1000000);
        terrainManager.shadow.setShadowSize = () => {};
      }
    }
  } catch (url) {
    console.error(url);
  }
  isProcessed_3 = true;
};
let isProcessed_6 = false;
function initializeClient() {
  if (isProcessed_6) {
    return;
  }
  isProcessed_6 = true;
  setTimeout(() => {
    injectStyles();
    const myY = localStorage.getItem("theme") || "grey";
    applyTheme(myY);
    createToolsPanel();
    createPlusPanel();
    createSettingsPanel();
    createUpdateHistoryPanel();
    initBackground();
    initAdBlocker();
    restoreUIInteractivity();
    initRadarDrag();
    renderEspLoop();
    state.isProcessed_4 = true;
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
      moveMouseToSide("left");
    }
    if (event.key.toLowerCase() === state.keyE.toLowerCase()) {
      event.preventDefault();
      event.stopPropagation();
      moveMouseToSide("right");
    }
  },
  true,
);
document.addEventListener("keydown", (event_2) => {
  if (event_2.target.matches("input,textarea,select")) {
    return;
  }
  if (event_2.key === "F3") {
    event_2.preventDefault();
    trackPlayer();
  }
  if (event_2.key === "F4") {
    event_2.preventDefault();
    toggleEsp_2();
  }
});
document.addEventListener("keydown", (event_4) => {
  if (
    event_4.key === state.activeKey &&
    !event_4.repeat &&
    !event_4.target.matches("input,textarea,button,select")
  ) {
    event_4.preventDefault();
    toggleUiVisibility();
  }
});
window.addEventListener("load", () => {
  setTimeout(() => {
    initializeAntiDetection();
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
  isToggled_2: false,
  isProcessed_4: false,
  position: null,
  counter: 0,
  dataList: [],
  counter_2: 0,
  position_2: null,
  counter_3: 0,
  counter_4: 0,
  activeKey: "Shift",
};
export {
  wrapWithProxy,
  hookTextEncoder,
  getGameState,
  getEntityManager,
  getFirstAnimalPosition,
  getEntityPosition,
  calculateDirection,
  findEntityById,
  isAreaSkipped_2,
  initAutoFarm,
  initializeAntiDetection,
  initializeViewportSettings,
  initializeClient,
  currentTime,
  angles,
  radius,
  offsetValue,
  gameInstance,
  playerData,
  isProcessed_3,
  config,
  dragState,
  tickInterval,
  deltaThreshold,
  maxFailCount,
  timeoutLimit,
  angle,
};
