import { showNotification, initNameAutofill } from "./ui/interaction.js";
import { getOrCreateCanvas } from "./utils.js";
import { drawEntityTrail } from "./features/entitytrail.js";
import { applyTheme, initBackgroundImage, injectStyles } from "./ui/theme.js";
import {
  createToolsPanel,
  createVisionPanel,
  createCombatPanel,
  createAutomationPanel,
  createSettingsPanel,
  createMusicPanel,
  createUpdatePanel,
  togglePanelsVisibility,
} from "./ui/panels.js";
import { initAdBlocker } from "./features/adblock.js";
import { initRadarDrag } from "./ui/radar.js";
import { renderEspLoop, trackPlayer, clearTracking } from "./features/esp.js";
import {
  updateLockTarget,
  autoDodgeLoop,
  toggleLock,
} from "./features/aimbot.js";
import { simulatePointerMove } from "./features/movement.js";
import { initAntiDetection } from "./features/antidetection.js";
let stateCache = new WeakMap();
function wrapPropertyWithProxy(targetObject, propertyName, proxyHandler) {
  const originalValue = targetObject[propertyName];
  const proxyValue = new Proxy(originalValue, proxyHandler);
  stateCache.set(proxyValue, originalValue);
  targetObject[propertyName] = proxyValue;
}
let currentTime = 0;
let isInitialized = false;
function initNetworkInterceptor() {
  if (isInitialized) {
    return;
  }
  function unescapeString(inputString) {
    if (typeof inputString !== "string") {
      return inputString;
    }
    return inputString.replace(
      /\\(\\|n|r|t|b|f|v|\d{1,3}|x([\da-fA-F]{2})|u([\da-fA-F]{4})|u\{(0*[\da-fA-F]{1,6})\})/g,
      (match, p1, p2, p3, p4) => {
        switch (p1[0]) {
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
            return String.fromCharCode(Number.parseInt(p1, 8) || 0);
          default:
            if (p2 != null) {
              return String.fromCharCode(Number.parseInt(p2, 16) || 0);
            }
            if (p3 != null) {
              return String.fromCharCode(Number.parseInt(p3, 16) || 0);
            }
            if (p4 != null) {
              const codePoint = Number.parseInt(p4, 16) || 0;
              if (codePoint > 1114111) {
                return match;
              } else {
                return String.fromCodePoint(codePoint);
              }
            }
            return p1;
        }
      },
    );
  }
  const actionIdMap = {
    spawn: 22,
    createTribe: 5,
    chat: 100,
  };
  const originalEncode = TextEncoder.prototype.encode;
  TextEncoder.prototype.encode = function (...args) {
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
        const matchResult = commandPatterns[patternIndex].exec(args[0]);
        if (matchResult && matchResult.length === 3) {
          const commandHandler = [
            actionIdMap.spawn,
            actionIdMap.spawn,
            actionIdMap.createTribe,
            actionIdMap.chat,
          ][patternIndex];
          args[0] =
            matchResult[1] +
            unescapeString(matchResult[2]).substr(0, commandHandler);
          break;
        }
      }
    } catch {}
    return Reflect.apply(originalEncode, this, args);
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
  isInitialized = true;
  showNotification("Special characters enabled");
}
let musicPlaylist = JSON.parse(localStorage.getItem("musicPlaylist") || "[]");
const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const radius = 300;
const offsetValue = 400;
const config = {};
function isValidEntity(entity) {
  if (!entity) {
    return false;
  }
  if (entity.type === 1) {
    return true;
  }
  if (entity.playerRoomId != null) {
    return true;
  }
  if (entity.entityName != null && entity.entityName.length > 0) {
    return true;
  }
  if (entity.visibleFishLevel != null && entity.visibleFishLevel > 0) {
    return true;
  }
  return false;
}
function getGameState() {
  try {
    if (
      state.playerData &&
      state.playerData.myAnimals &&
      state.playerData.myAnimals.length > 0
    ) {
      return state.playerData;
    }
    const states = window.__ss?.states;
    if (!states) {
      return state.playerData || null;
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
    return state.playerData || null;
  } catch (error) {
    return state.playerData || null;
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
    const userData = getGameState();
    if (!userData) {
      return null;
    }
    const gameState = getEntityManager(userData);
    if (!gameState) {
      return null;
    }
    let entity = gameState.entitiesById
      ? gameState.entitiesById[entityId]
      : null;
    if (!entity && gameState.entitiesList) {
      entity = gameState.entitiesList.find(
        (currentItem) => currentItem.id === entityId,
      );
    }
    if (!entity && gameState.animalsByPlayerRoomId) {
      for (let roomId of Object.keys(gameState.animalsByPlayerRoomId)) {
        const animals = gameState.animalsByPlayerRoomId[roomId];
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
function getGameState_2() {
  try {
    const stateData = getGameState();
    const parsedState = getEntityManager(stateData);
    const myPlayerData = getFirstAnimal();
    const myPosition = getFirstAnimalPosition();
    if (!parsedState || !myPlayerData || !myPosition) {
      return null;
    }
    const gameState = {
      myId: myPlayerData.id,
      myPos: myPosition,
      entities: [],
      players: [],
      food: [],
    };
    const entitiesList = parsedState.entitiesList || [];
    for (let i = 0; i < entitiesList.length; i++) {
      const entity = entitiesList[i];
      if (!entity || entity.id === myPlayerData.id) {
        continue;
      }
      if (
        myPlayerData.playerRoomId &&
        entity.playerRoomId === myPlayerData.playerRoomId
      ) {
        continue;
      }
      const entityPos = getEntityPosition(entity);
      if (!entityPos || entityPos.x == null || entityPos.y == null) {
        continue;
      }
      const dx = entityPos.x - myPosition.x;
      const dy = entityPos.y - myPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const entityData = {
        id: entity.id,
        x: entityPos.x,
        y: entityPos.y,
        distance: distance,
        angle: Math.atan2(dy, dx),
        entity: {
          ...entity,
          name: entity.entityName || entity.name || null,
        },
      };
      gameState.entities.push(entityData);
      if (entity.type === 1 || isValidEntity(entity)) {
        gameState.players.push(entityData);
      } else if (entity.type === 2 || !isValidEntity(entity)) {
        gameState.food.push(entityData);
      }
    }
    gameState.players.sort((itemA, itemB) => itemA.distance - itemB.distance);
    gameState.food.sort(
      (itemA_2, itemB_2) => itemA_2.distance - itemB_2.distance,
    );
    return gameState;
  } catch (error) {
    return {
      error: error.message,
    };
  }
}
function getViewportScale() {
  try {
    const foundState = window.__ss?.states?.find(
      (gameInstance) => state.gameInstance?.gameScene?.game?.viewport?.scale?.x,
    );
    if (foundState) {
      return foundState.gameScene.game.viewport.scale.x;
    }
  } catch (error) {}
  return 0.554;
}
let isLoaded = false;
function renderLoop() {
  const canvas = getOrCreateCanvas("ast-overlay", 999997);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const playerPos = getFirstAnimalPosition();
  if (playerPos && window.entityTrailEnabled) {
    drawEntityTrail(ctx, canvas, playerPos, getViewportScale());
  }
  requestAnimationFrame(renderLoop);
}
let dragState = {
  dragging: false,
  offsetX: 0,
  offsetY: 0,
  x: null,
  y: 20,
};
const maxDistance = 600;
const deltaThreshold = 800;
const maxDistance_2 = 400;
const maxFailCount = 2;
const timeoutLimit = 20000;
const tickInterval = 600;
let angle = 0;
let isProcessed = false;
function initializeApplication() {
  if (isProcessed) {
    return;
  }
  isProcessed = true;
  setTimeout(() => {
    injectStyles();
    applyTheme(localStorage.getItem("theme") || "grey");
    createToolsPanel();
    createVisionPanel();
    createCombatPanel();
    createAutomationPanel();
    createSettingsPanel();
    createUpdatePanel();
    createMusicPanel();
    initBackgroundImage();
    initAdBlocker();
    initRadarDrag();
    initNameAutofill();
    renderEspLoop();
    renderLoop();
    isLoaded = true;
    updateLockTarget();
    state.isActive = true;
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
      simulatePointerMove("left");
    }
    if (event.key.toLowerCase() === state.keyE.toLowerCase()) {
      event.preventDefault();
      event.stopPropagation();
      simulatePointerMove("right");
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
    clearTracking();
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
    initAntiDetection();
    initBackgroundImage();
  }, 1000);
  setInterval(() => {
    if (window.__ss?.states) {
      for (const gameInstance of window.__ss.states) {
        if (state.gameInstance?.gameScene?.myAnimals?.length > 0) {
          state.playerData = state.gameInstance.gameScene;
          state.gameInstance = state.gameInstance.gameScene.game;
          window.__cachedEM = null;
          break;
        }
      }
    }
  }, 2000);
});
export const state = {
  currentTrackId: "",
  isPlaying_2: false,
  isMuted: false,
  updateIntervalId: null,
  isLooping: false,
  audioPlayer: null,
  currentTrackIndex: 0,
  musicVolume: parseFloat(localStorage.getItem("musicVolume") || "0.5"),
  isMusicLoopEnabled: localStorage.getItem("musicLoop") !== "false",
  isMusicShuffleEnabled: localStorage.getItem("musicShuffle") === "true",
  youtubePlayer: null,
  isYtApiLoaded: false,
  isReady: false,
  audioSourceType: null,
  animationInterval: null,
  angleIndex: 0,
  keyQ: "q",
  keyE: "e",
  gameInstance: null,
  appState: null,
  playerData: null,
  isEnabled: false,
  isMinimapSmall: false,
  entityTrailInterval: null,
  isActive: false,
  lastTimestamp: 0,
  currentPosition: null,
  counter: 0,
  previousTimestamp: 0,
  dataList: [],
  lastTickTime: 0,
  lastEventTime: 0,
  isToggled: false,
  position: null,
  counter_2: 0,
  lastValue: 0,
  previousValue: 0,
  isReady_2: false,
  activeKey: "Shift",
};
export {
  wrapPropertyWithProxy,
  initNetworkInterceptor,
  isValidEntity,
  getGameState,
  getEntityManager,
  getFirstAnimal,
  getFirstAnimalPosition,
  getEntityPosition,
  calculateDirection,
  findEntityById,
  getGameState_2,
  getViewportScale,
  renderLoop,
  initializeApplication,
  stateCache,
  currentTime,
  musicPlaylist,
  angles,
  radius,
  offsetValue,
  config,
  isLoaded,
  dragState,
  maxDistance,
  deltaThreshold,
  maxDistance_2,
  maxFailCount,
  timeoutLimit,
  tickInterval,
  angle,
};
