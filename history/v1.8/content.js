import { typeText, showNotification } from "./src/ui/interaction.js";
import {
  updateLockButtonUI,
  drawRadar,
  initRadarDrag,
} from "./src/ui/radar.js";
import {
  startCircularMovement,
  stopMouseSimulation,
  toggleMouseSimulation,
  moveMouseSide,
  simulateClick,
} from "./src/features/movement.js";
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
  stopAutoFarm,
} from "./src/features/autofarm.js";
import { applyTheme, initBackground, injectStyles } from "./src/ui/theme.js";
import {
  startScheduledTask,
  stopInterval,
  typeAndSendMessage,
} from "./src/features/chat.js";
import { initializeAstraVision } from "./src/features/xray.js";
import {
  drawEsp,
  drawTrackedEntity,
  renderEspLoop,
  clearTracking,
  trackPlayer,
  toggleMinimapSize,
} from "./src/features/esp.js";
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
  togglePanelsVisibility,
} from "./src/ui/panels.js";
import { initAdBlocker } from "./src/features/adblock.js";
import {
  stopMouseSimulation_2,
  toggleEntityTrail,
  drawEntityTrail,
  renderOverlay,
} from "./src/features/entitytrail.js";
import {
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
  clearTracking_2,
  clearTracking_3,
  startAutoFarm,
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
