import {
  createToolsPanel,
  createVisionPanel,
  createCombatPanel,
  createAutomationPanel,
  createSettingsPanel,
  createUpdatePanel,
  togglePanelsVisibility,
} from "./ui/panels.js";
import {
  getEntityById,
  calculateDistance,
  getNearbyEntities,
  proxyProperty,
  getAllPropertyNames,
} from "./utils.js";
import {
  renderOverlayLoop,
  toggleEntityTrail,
  featuresentitytrailState,
} from "./features/entitytrail.js";
import {
  updateLockOnTarget,
  autoDodgeLoop,
  toggleLock,
} from "./features/aimbot.js";
import {
  renderEspOverlay,
  trackPlayer,
  toggleEsp_tia,
} from "./features/esp.js";
import { setTheme, initHomeBackground, injectStyles } from "./ui/theme.js";
import { setupPatrolPoints, autoFarmLoop } from "./features/autofarm.js";
import { moveMouseToSide } from "./features/movement.js";
import { showNotification } from "./ui/interaction.js";
import { initAdBlocker } from "./features/adblock.js";
import { initRadarDragging } from "./ui/radar.js";
let stateCache = new WeakMap();
let currentTime = 0;
let isProcessed_r5u = false;
function hookTextEncoder() {
  if (isProcessed_r5u) {
    return;
  }
  function unescapeString(inputString) {
    if (typeof inputString !== "string") {
      return inputString;
    }
    return inputString.replace(
      /\\(\\|n|r|t|b|f|v|\d{1,3}|x([\da-fA-F]{2})|u([\da-fA-F]{4})|u\{(0*[\da-fA-F]{1,6})\})/g,
      (match, octalString, hexString1, hexString2, hexString3) => {
        switch (octalString[0]) {
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
            return String.fromCharCode(Number.parseInt(octalString, 8) || 0);
          default:
            if (hexString1 != null) {
              return String.fromCharCode(Number.parseInt(hexString1, 16) || 0);
            }
            if (hexString2 != null) {
              return String.fromCharCode(Number.parseInt(hexString2, 16) || 0);
            }
            if (hexString3 != null) {
              const codePoint = Number.parseInt(hexString3, 16) || 0;
              if (codePoint > 1114111) {
                return match;
              } else {
                return String.fromCodePoint(codePoint);
              }
            }
            return octalString;
        }
      },
    );
  }
  const actionIds = {
    spawn: 22,
    createTribe: 5,
    chat: 100,
  };
  const originalEncode = TextEncoder.prototype.encode;
  TextEncoder.prototype.encode = function (...inputData) {
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
        const matchResult = commandPatterns[patternIndex].exec(inputData[0]);
        if (matchResult && matchResult.length === 3) {
          const commandHandler = [
            actionIds.spawn,
            actionIds.spawn,
            actionIds.createTribe,
            actionIds.chat,
          ][patternIndex];
          inputData[0] =
            matchResult[1] +
            unescapeString(matchResult[2]).substr(0, commandHandler);
          break;
        }
      }
    } catch {}
    return Reflect.apply(originalEncode, this, inputData);
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
  isProcessed_r5u = true;
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
let isProcessed_l68 = false;
function startEntityTrail() {
  if (featuresentitytrailState.entityTrailInterval_skd) {
    clearInterval(featuresentitytrailState.entityTrailInterval_skd);
    featuresentitytrailState.entityTrailInterval_skd = null;
  }
  featuresentitytrailState.entityTrailInterval_skd = setInterval(() => {
    if (!window.entityTrailEnabled || !window.entityTrailTargetId) {
      return;
    }
    const targetEntityId = getEntityById(window.entityTrailTargetId);
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
  state.position_qml = null;
  state.counter_rvr = 0;
  state.counter_r46 = 0;
  state.counter_sce = 0;
  if (farmMode === "patrol") {
    setupPatrolPoints();
  }
  showNotification("Auto farm started (" + window.autoFarmMode + ")");
  if (!state.isToggled_sv3) {
    state.isToggled_sv3 = true;
    autoFarmLoop();
  }
}
let isProcessed_shm = false;
const initAntiTamper = () => {
  if (isProcessed_shm) {
    return;
  }
  isProcessed_shm = true;
  const cache = {};
  for (const reflectMethod of Object.getOwnPropertyNames(Reflect)) {
    cache[reflectMethod] = Reflect[reflectMethod];
  }
  const Proxy = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const wrapProperty = (target, url, value) => {
    const instance = new Proxy(target[url], value);
    stateCache.set(instance, target[url]);
    target[url] = instance;
  };
  wrapProperty(Function.prototype, "toString", {
    apply(thisArg, argsKey, callContext) {
      return cache.apply(
        thisArg,
        stateCache.get(argsKey) || argsKey,
        callContext,
      );
    },
  });
  wrapProperty(window, "Proxy", {
    construct(constructor, constructorArgs) {
      return cache.construct(constructor, constructorArgs);
    },
  });
  wrapProperty(Proxy, "revocable", {
    apply(applyThisArg, applyArgs, applyContext) {
      return cache.apply(applyThisArg, applyArgs, applyContext);
    },
  });
  let lastExecutionTime = 0;
  wrapProperty(Function.prototype, "bind", {
    apply(thisContext, args, extraArgs) {
      try {
        try {
          if (
            lookupGetter.call(extraArgs[0], "aboveBgPlatformsContainer") != null
          ) {
            return cache.apply(thisContext, args, extraArgs);
          }
        } catch {}
        if (extraArgs[0] && extraArgs[0].aboveBgPlatformsContainer != null) {
          playerData = extraArgs[0];
          gameInstance = extraArgs[0].game;
          window.__cachedEM = null;
          const propertyNames = getAllPropertyNames(playerData);
          const obfuscatedPropertyNames = propertyNames.filter((varName) =>
            varName.startsWith("_0x"),
          );
          config.setFlash =
            Object.getOwnPropertyNames(playerData.__proto__.__proto__)
              .filter((propName) => propName.startsWith("_0x"))
              .find(
                (methodName) => playerData[methodName] instanceof Function,
              ) || config.setFlash;
          config.terrainManager =
            obfuscatedPropertyNames.find(
              (shadowEntityKey) =>
                typeof playerData[shadowEntityKey]?.shadow !== "undefined",
            ) || config.terrainManager;
          config.entityManager =
            obfuscatedPropertyNames.find(
              (entitiesListKey) =>
                typeof playerData[entitiesListKey]?.entitiesList !==
                "undefined",
            ) || config.entityManager;
          config.socketManager =
            getAllPropertyNames(gameInstance).find(
              (networkClientKey) =>
                typeof gameInstance[networkClientKey]?.sendBytePacket !==
                "undefined",
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
                proxyProperty(
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
          if (lastExecutionTime < Date.now() - 3000) {
            showNotification("Client loaded");
            lastExecutionTime = Date.now();
          }
        }
      } catch {}
      return cache.apply(thisContext, args, extraArgs);
    },
  });
};
let isProcessed_sse = false;
function initializeApp() {
  if (isProcessed_sse) {
    return;
  }
  isProcessed_sse = true;
  setTimeout(() => {
    injectStyles();
    setTheme(localStorage.getItem("theme") || "grey");
    createToolsPanel();
    createVisionPanel();
    createCombatPanel();
    createAutomationPanel();
    createSettingsPanel();
    createUpdatePanel();
    initHomeBackground();
    initAdBlocker();
    initRadarDragging();
    renderEspOverlay();
    renderOverlayLoop();
    isProcessed_l68 = true;
    updateLockOnTarget();
    state.isProcessed_rdv = true;
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
document.addEventListener(
  "keydown",
  (event_69q) => {
    if (event_69q.target.matches("input,textarea,select,[contenteditable]")) {
      return;
    }
    if (event_69q.repeat) {
      return;
    }
    if (event_69q.key.toLowerCase() === window.lockKey.toLowerCase()) {
      event_69q.preventDefault();
      toggleLock();
    }
  },
  true,
);
document.addEventListener(
  "keydown",
  (event_4og) => {
    if (event_4og.target.matches("input,textarea,select,[contenteditable]")) {
      return;
    }
    if (event_4og.repeat) {
      return;
    }
    const entityTraceKey = window.entityTraceKey.toLowerCase();
    const lowercaseKey = event_4og.key.toLowerCase();
    const lowercaseCode = event_4og.code.toLowerCase();
    if (
      lowercaseKey === entityTraceKey ||
      lowercaseCode === entityTraceKey ||
      lowercaseCode === "key" + entityTraceKey
    ) {
      event_4og.preventDefault();
      toggleEntityTrail();
    }
  },
  true,
);
document.addEventListener("keydown", (event_6k3) => {
  if (event_6k3.target.matches("input,textarea,select")) {
    return;
  }
  if (event_6k3.key === "F3") {
    event_6k3.preventDefault();
    trackPlayer();
  }
  if (event_6k3.key === "F4") {
    event_6k3.preventDefault();
    toggleEsp_tia();
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
    initAntiTamper();
    initHomeBackground();
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
  isProcessed_rnh: false,
  isToggled_r8c: false,
  isProcessed_rdv: false,
  position: null,
  counter: 0,
  dataList: [],
  counter_sce: 0,
  isToggled_sv3: false,
  position_qml: null,
  counter_rvr: 0,
  counter_r46: 0,
  activeKey: "Shift",
};
export {
  hookTextEncoder,
  getGameState,
  getEntityManager,
  getFirstAnimalPosition,
  getEntityPosition,
  calculateDirection,
  startEntityTrail,
  startAutoFarm,
  initAntiTamper,
  initializeApp,
  stateCache,
  currentTime,
  angles,
  radius,
  offsetValue,
  gameInstance,
  playerData,
  config,
  isProcessed_l68,
  dragState,
  tickInterval,
  deltaThreshold,
  maxFailCount,
  timeoutLimit,
  angle,
};
