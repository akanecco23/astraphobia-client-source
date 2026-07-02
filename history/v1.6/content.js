import {
  wrapWithProxy,
  hookTextEncoder,
  getGameState,
  getEntityManager,
  getFirstAnimalPosition,
  getEntityPosition,
  calculateDirection,
  findEntityById,
  modIsAreaSkipped,
  initAutoFarm,
  initializeAntiDetection,
  initializeViewportSettings,
  initializeClient,
  angles,
  radius,
  offsetValue,
  gameInstance,
  PlayerData,
  sysIsProcessed,
  dragState,
  tickInterval,
  deltaThreshold,
  maxFailCount,
  timeoutLimit,
  state,
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
  createEspOverlay,
  drawEsp,
  drawTrackedEntity,
  renderEspLoop,
  toggleEsp,
  trackPlayer,
  globalToggleEsp,
  v55bbToggleEsp,
  toggleMinimapSize,
} from "./src/features/esp.js";
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
  stopEntityTrail,
  toggleMouseSimulation,
  moveMouseToSide,
  simulateClick,
  simulateMoveAndClick,
} from "./src/features/movement.js";
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
import { featuresentitytrailState } from "./src/features/entitytrail.js";
import { drawRadar, initRadarDrag } from "./src/ui/radar.js";
import { initAdBlocker } from "./src/features/adblock.js";
