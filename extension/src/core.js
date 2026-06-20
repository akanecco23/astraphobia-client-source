import {
  createToolsPanel,
  createVisionPanel,
  createCombatPanel,
  createAutomationPanel,
  createSettingsPanel,
  createMusicPanel,
  createUpdateHistoryPanel,
  pressedKey,
  togglePanelsVisibility,
} from "./ui/panels.js";
import {
  updateLockLoop,
  autoDodgeLoop,
  trackNearestPlayer,
  clearTracking,
} from "./features/aimbot.js";
import { applyTheme, initBackgroundImage, injectStyles } from "./ui/theme.js";
import { initAntiDetection } from "./features/antidetection.js";
import { renderLoop, renderEspLoop } from "./features/esp.js";
import { initAutofillName } from "./ui/interaction.js";
import { getGameState } from "./features/autofarm.js";
import { initAdBlocker } from "./features/adblock.js";
import { initRadarDrag } from "./ui/radar.js";

let metadataMap = new WeakMap();
function wrapWithProxy(targetObject, propertyKey, handler) {
  const originalValue = targetObject[propertyKey];
  const proxyValue = new Proxy(originalValue, handler);
  metadataMap.set(proxyValue, originalValue);
  targetObject[propertyKey] = proxyValue;
}

const configStore = {};
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
  if (configStore.entityManager) {
    const entityManager = gameState[configStore.entityManager];
    if (entityManager) {
      window.__cachedEM = entityManager;
      return entityManager;
    }
  }
  for (const propertyKey of Object.keys(gameState)) {
    const propertyValue = gameState[propertyKey];
    if (
      propertyValue &&
      typeof propertyValue === "object" &&
      !Array.isArray(propertyValue) &&
      (propertyValue.entitiesList || propertyValue.entitiesById)
    ) {
      window.__cachedEM = propertyValue;
      return propertyValue;
    }
  }
  return null;
}
function getFirstAnimal() {
  try {
    const gameState = getGameState();
    if (!gameState) {
      return null;
    }
    if (gameState.myAnimals && gameState.myAnimals.length > 0) {
      return gameState.myAnimals[0];
    }
    if (gameState.myPiranhas && gameState.myPiranhas.length > 0) {
      return gameState.myPiranhas[0];
    }
    return null;
  } catch (error) {
    return null;
  }
}
function getViewportScale() {
  try {
    const stateWithViewport = window.__ss?.states?.find(
      (gameContext) => gameContext?.gameScene?.game?.viewport?.scale?.x,
    );
    if (stateWithViewport) {
      return stateWithViewport.gameScene.game.viewport.scale.x;
    }
  } catch (err) {}
  return 0.554;
}
let isProcessed = false;
let dragState = {
  dragging: false,
  offsetX: 0,
  offsetY: 0,
  x: null,
  y: 20,
};

let isToggled = false;
function initializeApplication() {
  if (isToggled) {
    return;
  }
  isToggled = true;
  setTimeout(() => {
    injectStyles();
    applyTheme(localStorage.getItem("theme") || "grey");
    createToolsPanel();
    createVisionPanel();
    createCombatPanel();
    createAutomationPanel();
    createSettingsPanel();
    createUpdateHistoryPanel();
    createMusicPanel();
    initBackgroundImage();
    initAdBlocker();
    initRadarDrag();
    initAutofillName();
    renderEspLoop();
    renderLoop();
    isProcessed = true;
    updateLockLoop();
    state.isTextInterceptorInitialized = true;
    autoDodgeLoop();
  }, 1000);
}
window.lockEnabled = false;
window.lockTargetId = null;
window.lockKey = "t";
window.entityTraceKey = "h";
window.espEnabled = false;
window.espColors = {
  close: "#ff0000",
  medium: "#ffff00",
  far: "#00ffff",
  veryFar: "#00ff00",
  tracked: "#ff00ff",
  foodClose: "#00ff00",
  foodMedium: "#88ff88",
  foodFar: "#44cc44",
};
window.espTrackedEntityId = null;
window.espMode = "players";
document.addEventListener("keydown", (event) => {
  if (event.target.matches("input,textarea,select")) {
    return;
  }
  if (event.key === "F3") {
    event.preventDefault();
    trackNearestPlayer();
  }
  if (event.key === "F4") {
    event.preventDefault();
    clearTracking();
  }
});
window.autoDodgeEnabled = false;
window.autoFarmActive = false;
window.autoFarmMode = "nearest";
window.autoFarmRange = 3000;
window.autoFarmBoost = true;
window.autoFarmEvolve = true;
window.autoFarmAvoidPlayers = true;
window.autoFarmAvoidDistance = 800;
window.autoFarmStats = {
  collected: 0,
  startTime: 0,
};
window.autoFarmPatrolPoints = [];
window.autoFarmPatrolIndex = 0;
window.autoFarmCurrentTarget = null;
window.autoFarmTargetStartTime = 0;
window.autoFarmSkipIds = new Set();
window.autoFarmSkipClearTime = 0;
window.autoFarmSkipAreas = [];
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
    initAntiDetection();
    initBackgroundImage();
  }, 1000);
  setInterval(() => {
    if (window.__ss?.states) {
      for (const gameInstance of window.__ss.states) {
        if (state.gameInstance?.gameScene?.myAnimals?.length > 0) {
          state.animalData = state.gameInstance.gameScene;
          state.gameInstance = state.gameInstance.gameScene.game;
          window.__cachedEM = null;
          break;
        }
      }
    }
  }, 2000);
});

export const state = {
  currentTime: 0,
  isLooping: false,
  currentTrackIndex: 0,
  animationIntervalId: null,
  gameInstance: null,
  animalData: null,
  isActive: false,
  isMinimapSmall: false,
  isTextInterceptorInitialized: false,
};

export {
  wrapWithProxy,
  getEntityManager,
  getFirstAnimal,
  getViewportScale,
  initializeApplication,
  metadataMap,
  configStore,
  isProcessed,
  dragState,
};
