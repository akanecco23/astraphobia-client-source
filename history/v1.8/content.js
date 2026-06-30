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
  startAutoFarm,
  initGameHooks,
  initializeApp,
  currentTime,
  angles,
  radius,
  offsetValue,
  gameInstance,
  playerData,
  isProcessed_4,
  dragState,
  tickInterval,
  deltaThreshold,
  maxFailCount,
  timeoutLimit,
  angle,
  state,
} from "./src/core.js";
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
import {
  drawEsp,
  drawTrackedEntity,
  renderEspLoop,
  toggleEsp,
  trackPlayer,
  toggleEsp_2,
  toggleEsp_3,
  toggleMinimapSize,
} from "./src/features/esp.js";
import {
  stopEntityTrail_2,
  toggleEntityTrail,
  drawEntityTrail,
  renderOverlay,
  featuresentitytrailState,
} from "./src/features/entitytrail.js";
import {
  startCircularMovement,
  stopEntityTrail,
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
  startScheduledTask,
  stopInterval,
  typeAndSendMessage,
} from "./src/features/chat.js";
import {
  updateLockButtonUI,
  drawRadar,
  initRadarDrag,
} from "./src/ui/radar.js";
import { applyTheme, initBackground, injectStyles } from "./src/ui/theme.js";
import { typeText, showNotification } from "./src/ui/interaction.js";
import { initializeAstraVision } from "./src/features/xray.js";
import { initAdBlocker } from "./src/features/adblock.js";
