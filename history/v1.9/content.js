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
  getGameState_sso,
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
  isProcessed_s0n,
  dragState,
  maxDistance,
  deltaThreshold,
  maxFailCount,
  timeoutLimit,
  tickInterval,
  angle,
  state,
} from "./src/core.js";
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
  startMouseSimulation,
  stopEntityTrail,
  toggleMouseSimulation,
  simulatePointerMove,
  simulateClick,
  moveAndClickTarget,
} from "./src/features/movement.js";
import {
  drawEsp,
  drawTrackedEntity,
  renderEspLoop,
  toggleEsp,
  trackPlayer,
  toggleEsp_s2u,
  toggleEsp_qmn,
  toggleMinimapSize,
} from "./src/features/esp.js";
import {
  stopEntityTrail_iz9,
  toggleEntityTrail,
  drawEntityTrail,
  featuresentitytrailState,
} from "./src/features/entitytrail.js";
import {
  generateRandomString,
  getGameCanvas,
  getAllPropertyNames,
  calculateDistance,
  getOrCreateCanvas,
} from "./src/utils.js";
import {
  updateLockTarget,
  toggleLock,
  autoDodgeLoop,
  enableAutoDodge,
} from "./src/features/aimbot.js";
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
  applyTheme,
  initBackgroundImage,
  injectStyles,
} from "./src/ui/theme.js";
import { updateLockButton, drawRadar, initRadarDrag } from "./src/ui/radar.js";
import { activateAstraVision } from "./src/features/xray.js";
import { initAdBlocker } from "./src/features/adblock.js";

initializeApplication();
