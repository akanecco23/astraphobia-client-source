import {
  typeText,
  showToast,
  restoreUIInteractivity,
} from "./src/ui/interaction.js";
import { applyTheme, initBackground, injectStyles } from "./src/ui/theme.js";
import {
  startScheduledTask,
  stopInterval,
  simulateChatInput,
} from "./src/features/chat.js";
import {
  startCircularMovement,
  stopMouseSimulation,
  toggleMouseSimulation,
  moveMouseToSide,
  simulateClick,
  simulateMoveAndClick,
} from "./src/features/movement.js";
import { initializeAntiDetection } from "./src/features/antidetection.js";
import { drawRadar, initRadarDrag } from "./src/ui/radar.js";
import {
  createEspOverlay,
  drawEsp,
  drawTrackedEntity,
  renderEspLoop,
  clearTracking,
  trackPlayer,
  toggleMinimapSize,
} from "./src/features/esp.js";
import { autoDodgeLoop, enableAutoDodge } from "./src/features/aimbot.js";
import {
  isAreaSkipped,
  handleFarmFailure,
  isAreaSkipped_2,
  findClosestFarmable,
  getFarmableEntities,
  findOptimalFarmPosition,
  getNearbyAvoidEntities,
  calculateAvoidanceVector,
  simulateEvolveKeyPress,
  checkAntiStuck,
  generatePatrolPoints,
  autoFarmUpdate,
  startAutoFarmLoop,
  initAutoFarm,
  stopAutoFarm,
} from "./src/features/autofarm.js";
import {
  showHalloweenModal,
  makeDraggable,
  createToolsPanel,
  createPlusPanel,
  createSettingsPanel,
  createUpdateHistoryPanel,
} from "./src/ui/panels.js";
import { initAdBlocker } from "./src/features/adblock.js";
import {
  wrapWithProxy,
  hookTextEncoder,
  getGameState,
  getEntityManager,
  getFirstAnimalPosition,
  getEntityPosition,
  calculateDirection,
  findEntityById,
  clearTracking_2,
  clearTracking_3,
  initializeViewportSettings,
  initializeClient,
  privateMap,
  angleSteps,
  radius,
  offsetValue,
  isActive,
  state,
  dragState,
  maxDistance,
  distanceThreshold,
  distanceThreshold_2,
  maxFailCount,
  expiryTimeout,
  updateInterval_2,
  angle,
  coreSharedState,
} from "./src/core.js";
import {
  generateRandomString,
  getGameCanvas,
  getAllPropertyNames,
  isPlayer,
  getMyAnimal,
  calculateDistance,
  getNearbyEntities,
  getZoomLevel,
} from "./src/utils.js";
