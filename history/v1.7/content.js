import {
  hookTextEncoder,
  getGameState,
  getEntityManager,
  getFirstAnimalPosition,
  getEntityPosition,
  calculateDirection,
  startEntityTrail,
  clearTracking_2,
  clearTracking_3,
  startAutoFarm,
  initAntiTamper,
  initializeApp,
  stateMap,
  angleDegrees,
  radius,
  offsetValue,
  gameInstance,
  animalData,
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
  state,
} from "./src/core.js";
import {
  handleFarmFailure,
  isAreaSkipped,
  findClosestFarmableEntity,
  getNearbyFarmables,
  findBestFoodCluster,
  calculatePlayerAvoidanceVector,
  simulateEvolveKey,
  detectAndHandleStuck,
  setupPatrolPoints,
  autoFarmLoop,
  stopAutoFarm,
} from "./src/features/autofarm.js";
import {
  refreshUI,
  showHalloweenCodeModal,
  makeDraggable,
  createToolsPanel,
  createVisionPanel,
  createCombatPanel,
  createAutomationPanel,
  createSettingsPanel,
  createUpdatePanel,
  togglePanelsVisibility,
} from "./src/ui/panels.js";
import {
  generateRandomString,
  proxyProperty,
  getGameCanvas,
  getAllPropertyNames,
  isPlayer,
  getMyAnimal,
  getEntityById,
  calculateDistance,
  getNearbyEntities,
  getZoomLevel,
  getOrCreateOverlayCanvas,
} from "./src/utils.js";
import {
  drawEspEntities,
  drawTrackedEntityIndicator,
  renderEspOverlay,
  clearTracking,
  trackPlayer,
  toggleMinimapSize,
} from "./src/features/esp.js";
import {
  startCircularMovement,
  stopMouseSimulation,
  toggleMouseSimulation,
  moveMouseToSide,
  simulateClick,
} from "./src/features/movement.js";
import {
  updateLockOnTarget,
  toggleLock,
  movePointerToTarget,
  autoDodgeLoop,
  enableAutoDodge,
} from "./src/features/aimbot.js";
import {
  stopMouseSimulation_2,
  toggleEntityTrail,
  drawEntityTrail,
  renderOverlayLoop,
} from "./src/features/entitytrail.js";
import {
  startScheduledTask,
  stopInterval,
  simulateChatInput,
} from "./src/features/chat.js";
import {
  updateLockButtonUI,
  drawRadar,
  initRadarDragging,
} from "./src/ui/radar.js";
import { setTheme, initHomeBackground, injectStyles } from "./src/ui/theme.js";
import { typeText, showNotification } from "./src/ui/interaction.js";
import { initializeViewportHacks } from "./src/features/xray.js";
import { initAdBlocker } from "./src/features/adblock.js";
