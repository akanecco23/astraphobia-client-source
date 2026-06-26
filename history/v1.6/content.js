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
  isAreaSkipped_2,
  initAutoFarm,
  initializeAntiDetection,
  initializeViewportSettings,
  initializeClient,
  angleSteps,
  radius,
  offsetValue,
  game,
  playerData,
  isActive,
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
  isAreaSkipped,
  handleFarmFailure,
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
  stopAutoFarm,
} from "./src/features/autofarm.js";
import {
  showHalloweenModal,
  makeDraggable,
  createToolsPanel,
  createPlusPanel,
  createSettingsPanel,
  createUpdateHistoryPanel,
  toggleUiVisibility,
} from "./src/ui/panels.js";
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
import {
  startCircularMovement,
  stopMouseSimulation,
  toggleMouseSimulation,
  moveMouseToSide,
  simulateClick,
  simulateMoveAndClick,
} from "./src/features/movement.js";
import {
  createEspOverlay,
  drawEsp,
  drawTrackedEntity,
  renderEspLoop,
  clearTracking,
  trackPlayer,
  toggleMinimapSize,
} from "./src/features/esp.js";
import {
  startScheduledTask,
  stopInterval,
  simulateChatInput,
} from "./src/features/chat.js";
import {
  typeText,
  showToast,
  restoreUIInteractivity,
} from "./src/ui/interaction.js";
import { applyTheme, initBackground, injectStyles } from "./src/ui/theme.js";
import { autoDodgeLoop, enableAutoDodge } from "./src/features/aimbot.js";
import { drawRadar, initRadarDrag } from "./src/ui/radar.js";
import { initAdBlocker } from "./src/features/adblock.js";
