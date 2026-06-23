import {
  simulateTyping,
  showNotification,
  initNameAutofill,
} from "./src/ui/interaction.js";
import {
  startScheduledTask,
  stopInterval,
  simulateChatInput,
} from "./src/features/chat.js";
import {
  startMouseSimulation,
  stopMouseSimulation,
  toggleMouseSimulation,
  simulatePointerMove,
  simulateClick,
  moveAndClickTarget,
} from "./src/features/movement.js";
import { activateAstraVision } from "./src/features/xray.js";
import { updateLockButton, drawRadar, initRadarDrag } from "./src/ui/radar.js";
import {
  drawEsp,
  drawTrackedEntity,
  renderEspLoop,
  toggleEsp,
  trackPlayer,
  clearTracking,
  toggleMinimapSize,
} from "./src/features/esp.js";
import {
  updateLockTarget,
  toggleLock,
  autoDodgeLoop,
  enableAutoDodge,
  disableAutoDodge,
} from "./src/features/aimbot.js";
import {
  handleFarmFailure,
  isAreaSkipped,
  findClosestFarmableEntity,
  findNearbyFarmableEntities,
  findDensestFoodCluster,
  calculatePlayerAvoidanceVector,
  triggerRandomEvolution,
  detectAndHandleStuck,
  setupPatrolPoints,
  autoFarmLoop,
  stopAutoFarm,
} from "./src/features/autofarm.js";
import {
  applyTheme,
  initBackgroundImage,
  injectStyles,
} from "./src/ui/theme.js";
import {
  isYouTubeUrl,
  extractYouTubeId,
  ensureYouTubeApiReady,
  getYoutubeHostElement,
  playYouTubeVideo,
  stopAndCleanupPlayer,
  playTrack,
  pausePlayback,
  resumePlayback,
  stopPlayback,
  isPlaying,
  playNextOrRandom,
  playPrevious,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  updateMusicPanel,
} from "./src/ui/audio.js";
import {
  refreshUI,
  showHalloweenCodeModal,
  makeDraggable,
  createToolsPanel,
  createVisionPanel,
  createCombatPanel,
  createAutomationPanel,
  createSettingsPanel,
  createMusicPanel,
  createUpdatePanel,
  togglePanelsVisibility,
} from "./src/ui/panels.js";
import {
  stopEntityTrail,
  toggleEntityTrail,
  drawEntityTrail,
} from "./src/features/entitytrail.js";
import { initAdBlocker } from "./src/features/adblock.js";
import {
  wrapPropertyWithProxy,
  initNetworkInterceptor,
  isValidEntity,
  getGameState,
  getEntityManager,
  getFirstAnimal,
  getFirstAnimalPosition,
  getEntityPosition,
  calculateDirection,
  findEntityById,
  getGameState_2,
  getViewportScale,
  startEntityTrail,
  renderLoop,
  startAutoFarm,
  initAntiDetection,
  initializeApplication,
  currentTime,
  musicPlaylist,
  angles,
  radius,
  offsetValue,
  gameInstance,
  playerData,
  isLoaded,
  dragState,
  maxDistance,
  deltaThreshold,
  maxDistance_2,
  maxFailCount,
  timeoutLimit,
  tickInterval,
  angle,
  state,
} from "./src/core.js";
import {
  generateRandomString,
  getGameCanvas,
  getAllPropertyNames,
  calculateDistance,
  getOrCreateCanvas,
} from "./src/utils.js";

initializeApplication();
