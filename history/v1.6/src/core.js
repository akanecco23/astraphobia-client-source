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
import { renderEspLoop, trackPlayer, globalToggleEsp } from "./features/esp.js";
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
let boolIsProcessed = false;
function hookTextEncoder() {
  if (boolIsProcessed) {
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
  boolIsProcessed = true;
  showToast("Special characters enabled");
}
const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const radius = 300;
const offsetValue = 400;
let gameInstance;
let State;
let PlayerData;
let sysIsProcessed = false;
const Config = {};
function getGameState() {
  try {
    if (PlayerData && PlayerData.myAnimals && PlayerData.myAnimals.length > 0) {
      return PlayerData;
    }
    const states = window.__ss?.states;
    if (!states) {
      return PlayerData || null;
    }
    for (let v415eI = 0; v415eI < states.length; v415eI++) {
      if (states[v415eI]?.gameScene?.myAnimals) {
        return states[v415eI].gameScene;
      }
      if (states[v415eI]?.gameManager) {
        for (const managerKey of Object.keys(states[v415eI].gameManager)) {
          if (states[v415eI].gameManager[managerKey]?.myAnimals) {
            return states[v415eI].gameManager[managerKey];
          }
        }
      }
    }
    return PlayerData || null;
  } catch (error) {
    return PlayerData || null;
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
function getFirstAnimalPosition() {
  try {
    const animal = getGameState();
    const position = animal?.myAnimals?.[0];
    if (!position) {
      return null;
    }
    return {
      x: position.position._x ?? position.position.x,
      y: position.position._y ?? position.position.y,
    };
  } catch (v407fError) {
    return null;
  }
}
function getEntityPosition(b0eeEntity) {
  if (!b0eeEntity || !b0eeEntity.position) {
    return null;
  }
  return {
    x: b0eeEntity.position._x || b0eeEntity.position.x,
    y: b0eeEntity.position._y || b0eeEntity.position.y,
  };
}
function calculateDirection(v56c0Entity) {
  if (!v56c0Entity) {
    return {
      dirX: 1,
      dirY: 0,
    };
  }
  let dirX = 0;
  let dirY = 0;
  if (v56c0Entity.velocity) {
    dirX = v56c0Entity.velocity._x || v56c0Entity.velocity.x || 0;
    dirY = v56c0Entity.velocity._y || v56c0Entity.velocity.y || 0;
  }
  if (Math.abs(dirX) < 0.01 && Math.abs(dirY) < 0.01) {
    const angle =
      v56c0Entity.rotation || v56c0Entity.angle || v56c0Entity._rotation || 0;
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
    let v7565Entity = parsedState.entitiesById
      ? parsedState.entitiesById[entityId]
      : null;
    if (!v7565Entity && parsedState.entitiesList) {
      v7565Entity = parsedState.entitiesList.find(
        (item) => item.id === entityId,
      );
    }
    if (!v7565Entity && parsedState.animalsByPlayerRoomId) {
      for (let roomId of Object.keys(parsedState.animalsByPlayerRoomId)) {
        const animals = parsedState.animalsByPlayerRoomId[roomId];
        if (Array.isArray(animals)) {
          v7565Entity = animals.find(
            (selectedItem) => selectedItem && selectedItem.id === entityId,
          );
        } else if (animals && animals.id === entityId) {
          v7565Entity = animals;
        }
        if (v7565Entity) {
          break;
        }
      }
    }
    return v7565Entity;
  } catch (v7eb9Error) {
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
function modIsAreaSkipped(v13a0X, v599cY) {
  const v5c00CurrentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(
    (timerState) => v5c00CurrentTime - timerState.time < timeoutLimit,
  );
  return window.autoFarmSkipAreas.some(
    (cellData) =>
      cellData.skipped &&
      calculateDistance(v13a0X, v599cY, cellData.x, cellData.y) <
        cellData.radius,
  );
}
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
  state.modPosition = null;
  state.numCounter = 0;
  state.modCounter = 0;
  state.Counter = 0;
  if (farmMode === "patrol") {
    generatePatrolPoints();
  }
  showToast("Auto farm started (" + window.autoFarmMode + ")");
  startAutoFarmLoop();
}
let mainIsProcessed = false;
const initializeAntiDetection = () => {
  if (mainIsProcessed) {
    return;
  }
  mainIsProcessed = true;
  const cache = {};
  for (const v231fPropertyKey of Object.getOwnPropertyNames(Reflect)) {
    cache[v231fPropertyKey] = Reflect[v231fPropertyKey];
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
          PlayerData = extraArgs[0];
          gameInstance = extraArgs[0].game;
          window.__cachedEM = null;
          const allProperties = getAllPropertyNames(PlayerData);
          const obfuscatedProperties = allProperties.filter((varName) =>
            varName.startsWith("_0x"),
          );
          Config.setFlash =
            Object.getOwnPropertyNames(PlayerData.__proto__.__proto__)
              .filter((propName) => propName.startsWith("_0x"))
              .find(
                (functionKey) => PlayerData[functionKey] instanceof Function,
              ) || Config.setFlash;
          Config.terrainManager =
            obfuscatedProperties.find(
              (shadowKey) =>
                typeof PlayerData[shadowKey]?.shadow !== "undefined",
            ) || Config.terrainManager;
          Config.entityManager =
            obfuscatedProperties.find(
              (entitiesKey) =>
                typeof PlayerData[entitiesKey]?.entitiesList !== "undefined",
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
              if (!PlayerData?.myAnimals?.[0]) {
                return;
              }
              const firstAnimal = PlayerData.myAnimals[0];
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
  if (sysIsProcessed) {
    return;
  }
  if (!PlayerData) {
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
    if (Config.setFlash) {
      PlayerData[Config.setFlash] = () => {};
    }
    if (Config.terrainManager) {
      const terrainManager = PlayerData[Config.terrainManager];
      if (terrainManager?.shadow) {
        terrainManager.shadow.setShadowSize(1000000);
        terrainManager.shadow.setShadowSize = () => {};
      }
    }
  } catch (v4f07Url) {
    console.error(v4f07Url);
  }
  sysIsProcessed = true;
};
let v3befIsProcessed = false;
function initializeClient() {
  if (v3befIsProcessed) {
    return;
  }
  v3befIsProcessed = true;
  setTimeout(() => {
    injectStyles();
    const v2898MyY = localStorage.getItem("theme") || "grey";
    applyTheme(v2898MyY);
    createToolsPanel();
    createPlusPanel();
    createSettingsPanel();
    createUpdateHistoryPanel();
    initBackground();
    initAdBlocker();
    restoreUIInteractivity();
    initRadarDrag();
    renderEspLoop();
    state.modIsProcessed = true;
    autoDodgeLoop();
  }, 1000);
}
document.addEventListener(
  "keydown",
  (v369cEvent) => {
    if (v369cEvent.target.matches("input,textarea,select,[contenteditable]")) {
      return;
    }
    if (v369cEvent.repeat) {
      return;
    }
    if (v369cEvent.key.toLowerCase() === state.keyQ.toLowerCase()) {
      v369cEvent.preventDefault();
      v369cEvent.stopPropagation();
      moveMouseToSide("left");
    }
    if (v369cEvent.key.toLowerCase() === state.keyE.toLowerCase()) {
      v369cEvent.preventDefault();
      v369cEvent.stopPropagation();
      moveMouseToSide("right");
    }
  },
  true,
);
document.addEventListener("keydown", (v19b8Event) => {
  if (v19b8Event.target.matches("input,textarea,select")) {
    return;
  }
  if (v19b8Event.key === "F3") {
    v19b8Event.preventDefault();
    trackPlayer();
  }
  if (v19b8Event.key === "F4") {
    v19b8Event.preventDefault();
    globalToggleEsp();
  }
});
document.addEventListener("keydown", (v11deEvent) => {
  if (
    v11deEvent.key === state.activeKey &&
    !v11deEvent.repeat &&
    !v11deEvent.target.matches("input,textarea,button,select")
  ) {
    v11deEvent.preventDefault();
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
  IsToggled: false,
  angleIndex: 0,
  keyQ: "q",
  keyE: "e",
  boolIsToggled: false,
  modIsProcessed: false,
  counter: 0,
  entityTrailInterval: null,
  dataList: [],
  Counter: 0,
  modPosition: null,
  numCounter: 0,
  modCounter: 0,
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
  modIsAreaSkipped,
  initAutoFarm,
  initializeAntiDetection,
  initializeViewportSettings,
  initializeClient,
  angles,
  radius,
  offsetValue,
  gameInstance,
  PlayerData,
  sysIsProcessed,
  dragState,
  tickInterval,
  deltaThreshold,
  maxFailCount,
  timeoutLimit,
};
