import { getGameState } from './features/autofarm.js';
import { applyTheme, initBackgroundImage, injectStyles } from './ui/theme.js';
import { createToolsPanel, createVisionPanel, createCombatPanel, createAutomationPanel, createSettingsPanel, createMusicPanel, createUpdateHistoryPanel } from './ui/panels.js';
import { initAdBlocker } from './features/adblock.js';
import { initRadarDrag } from './ui/radar.js';
import { initAutofillName } from './ui/interaction.js';
import { renderLoop, renderEspLoop } from './features/esp.js';
import { updateLockLoop, autoDodgeLoop } from './features/aimbot.js';

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
    if (propertyValue && typeof propertyValue === "object" && !Array.isArray(propertyValue) && (propertyValue.entitiesList || propertyValue.entitiesById)) {
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
    const stateWithViewport = window.__ss?.states?.find(gameContext => gameContext?.gameScene?.game?.viewport?.scale?.x);
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
  y: 20
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
window.entityTrailColor = {
  r: 255,
  g: 150,
  b: 0
};
window.entityTrailEnabled = false;
window.entityTrailTargetId = null;
window.entityTrailHistory = [];
window.entityTrailMaxLength = 200;
window.entityTrailRecordInterval = 100;
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
  foodFar: "#44cc44"
};
window.espTrackedEntityId = null;
window.espMode = "players";
window.autoDodgeEnabled = false;

export const state = {
  currentTime: 0,
  isLooping: false,
  currentTrackIndex: 0,
  animationIntervalId: null,
  gameInstance: null,
  animalData: null,
  isActive: false,
  isMinimapSmall: false,
  isTextInterceptorInitialized: false
};

export { wrapWithProxy, getEntityManager, getFirstAnimal, getViewportScale, initializeApplication, metadataMap, configStore, isProcessed, dragState };
