import { typeText, showNotification } from "./src/ui/interaction.js";
import { applyTheme, initBackground, injectStyles } from "./src/ui/theme.js";
import {
  startScheduledTask,
  stopInterval,
  typeAndSendMessage,
} from "./src/features/chat.js";
import { interceptTextEncoder } from "./src/features/antidetection.js";
import {
  startCircularMovement,
  stopMouseSimulation,
  toggleMouseSimulation,
  moveMouseSide,
  simulateClick,
} from "./src/features/movement.js";
import { initializeAstraVision } from "./src/features/xray.js";
import {
  updateLockButtonUI,
  drawRadar,
  initRadarDrag,
} from "./src/ui/radar.js";
import {
  drawEsp,
  drawTrackedEntity,
  renderEspLoop,
  clearTracking,
  trackPlayer,
  toggleMinimapSize,
} from "./src/features/esp.js";
import {
  updateLockOnTarget,
  toggleLock,
  aimAtTarget,
  autoDodgeLoop,
  enableAutoDodge,
} from "./src/features/aimbot.js";
import {
  handleFarmFailure,
  isAreaSkipped,
  findClosestFarmableEntity,
  getNearbyFarmTargets,
  findBestFarmSpot,
  calculatePlayerAvoidanceVector,
  simulateEvolveKey,
  detectAndHandleStuck,
  setupPatrolPoints,
  autoFarmLoop,
  startAutoFarm,
  stopAutoFarm,
} from "./src/features/autofarm.js";
import {
  refreshUI,
  showHalloweenModal,
  makeDraggable,
  createToolsPanel,
  createVisionPanel,
  createCombatPanel,
  createAutomationPanel,
  createSettingsPanel,
  createUpdateHistoryPanel,
} from "./src/ui/panels.js";
import { initAdBlocker } from "./src/features/adblock.js";
import {
  startEntityTrail,
  stopMouseSimulation_2,
  toggleEntityTrail,
  drawEntityTrail,
  renderOverlay,
} from "./src/features/entitytrail.js";
import {
  wrapWithProxy,
  getGameState,
  getEntityManager,
  getFirstAnimal,
  getFirstAnimalPosition,
  getEntityPosition,
  calculateDirection,
  findEntityById,
  clearTracking_2,
  clearTracking_3,
  initGameHooks,
  initializeApp,
  angles,
  radius,
  offsetValue,
  gameInstance,
  animalData,
  settings,
  isProcessed,
  dragState,
  maxDistance,
  maxDelta,
  distanceThreshold,
  maxFailCount,
  timeThreshold,
  timeLimit,
  randomAngle,
  state,
} from "./src/core.js";
import {
  generateRandomString,
  getGameCanvas,
  getAllPropertyNames,
  isPlayer,
  calculateDistance,
  getNearbyEntities,
  getZoomScale,
  getOrCreateOverlayCanvas,
} from "./src/utils.js";
