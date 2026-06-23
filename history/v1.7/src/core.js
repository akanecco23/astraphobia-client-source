import { showNotification } from "./ui/interaction.js";
import { setTheme, initHomeBackground, injectStyles } from "./ui/theme.js";
import {
  createToolsPanel,
  createVisionPanel,
  createCombatPanel,
  createAutomationPanel,
  createSettingsPanel,
  createUpdatePanel,
  togglePanelsVisibility,
} from "./ui/panels.js";
import { initAdBlocker } from "./features/adblock.js";
import { initRadarDragging } from "./ui/radar.js";
import { renderEspOverlay, trackPlayer } from "./features/esp.js";
import { renderOverlayLoop } from "./features/entitytrail.js";
import {
  updateLockOnTarget,
  autoDodgeLoop,
  toggleLock,
} from "./features/aimbot.js";
import { moveMouseToSide } from "./features/movement.js";
import { initAntiTamper } from "./features/antidetection.js";
let stateMap = new WeakMap();
let isActive = false;
function hookTextEncoder() {
  if (isActive) {
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
  isActive = true;
  showNotification("Special characters enabled");
}
const angleDegrees = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const radius = 300;
const offsetValue = 400;
const settings = {};
function getGameState() {
  try {
    if (
      state.animalData &&
      state.animalData.myAnimals &&
      state.animalData.myAnimals.length > 0
    ) {
      return state.animalData;
    }
    const states = window.__ss?.states;
    if (!states) {
      return state.animalData || null;
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
    return state.animalData || null;
  } catch (error) {
    return state.animalData || null;
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
let isEnabled = false;
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
const proximityThreshold = 400;
const maxFailCount = 2;
const timeoutLimit = 20000;
const timeThreshold = 600;
let randomAngle = 0;
let pressedKey = "Shift";
let isEnabled_2 = false;
function initializeApp() {
  if (isEnabled_2) {
    return;
  }
  isEnabled_2 = true;
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
    isEnabled = true;
    updateLockOnTarget();
    state.isActive_2 = true;
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
      moveMouseToSide("left");
    }
    if (event.key.toLowerCase() === state.activeKey.toLowerCase()) {
      event.preventDefault();
      event.stopPropagation();
      moveMouseToSide("right");
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
    keyboardEvent.key === pressedKey &&
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
  previousString: "",
  previousValue: 0,
  isInitialized: false,
  updateIntervalId: null,
  isProcessing: false,
  animationIntervalId: null,
  angleIndex: 0,
  currentKey: "q",
  activeKey: "e",
  gameInstance: null,
  appState: null,
  animalData: null,
  isProcessed: false,
  isMinimapSmall: false,
  trailInterval: null,
  isActive_2: false,
  previousValue_2: 0,
  lastPosition: null,
  counter: 0,
  lastTimestamp: 0,
  dataBuffer: [],
  previousTimestamp: 0,
  lastValue: 0,
  isActive_3: false,
  currentPosition: null,
  counter_2: 0,
  lastTimestamp_2: 0,
  lastOffset: 0,
  isReady: false,
};
export {
  hookTextEncoder,
  getGameState,
  getEntityManager,
  getFirstAnimalPosition,
  getEntityPosition,
  calculateDirection,
  clearTracking_2,
  clearTracking_3,
  initializeApp,
  stateMap,
  angleDegrees,
  radius,
  offsetValue,
  settings,
  isEnabled,
  dragState,
  maxDistance,
  maxDelta,
  proximityThreshold,
  maxFailCount,
  timeoutLimit,
  timeThreshold,
  randomAngle,
  pressedKey,
};
