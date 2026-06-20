import {
  isYoutubeUrl,
  getYoutubeVideoId,
  ensureYoutubeApiReady,
  getYoutubeHostElement,
  playYoutubeVideo,
  stopAllPlayback,
  playTrack,
  pausePlayback,
  resumePlayback,
  resetPlayback,
  isPlaying,
  playNextOrRandom,
  playPrevious,
  updateMusicPanel,
  audioPlayer,
  musicPlaylist,
  youtubePlayer,
  uiaudioState,
} from "./src/ui/audio.js";
import {
  startAutoPointerMovement,
  stopAutoPointerMovement,
  toggleAutoPointerMovement,
  simulatePointerMove,
  getAnimalPosition,
  extractPosition,
  calculateDirection,
  calculateDistance,
  buildEntityState,
  moveAndClickElement,
} from "./src/features/movement.js";
import {
  getGameState,
  findEntityById,
  markAreaAsFailed,
  isAreaSkipped,
  findBestFoodCluster,
  triggerRandomEvolve,
  checkStuckCondition,
  setupPatrolRoute,
  autoFarmLoop,
  startAutoFarm,
  stopAutoFarm,
  toggleMinimapSize,
} from "./src/features/autofarm.js";
import {
  updateLockLoop,
  toggleLock,
  trackNearestPlayer,
  clearTracking,
  autoDodgeLoop,
  enableAutoDodge,
  disableAutoDodge,
  findNearestEntity,
  findEntitiesInRange,
  calculateAvoidanceVector,
} from "./src/features/aimbot.js";
import {
  simulateTextInput,
  showNotification,
  initAutofillName,
  typeChatMessage,
  initializeTextInterceptor,
  simulateClick,
  showHalloweenCodeModal,
  makeElementDraggable,
} from "./src/ui/interaction.js";
import {
  createToolsPanel,
  createVisionPanel,
  createCombatPanel,
  createAutomationPanel,
  createSettingsPanel,
  createMusicPanel,
  createUpdateHistoryPanel,
} from "./src/ui/panels.js";
import {
  wrapWithProxy,
  getEntityManager,
  getFirstAnimal,
  getViewportScale,
  initializeApplication,
  metadataMap,
  configStore,
  isProcessed,
  dragState,
  state,
} from "./src/core.js";
import {
  startEntityTrailTracking,
  stopEntityTrailTracking,
  toggleEntityTrail,
  drawEntityTrail,
} from "./src/features/entitytrail.js";
import {
  refreshUI,
  renderLoop,
  drawESP,
  drawTrackerLine,
  drawRadar,
  renderEspLoop,
  toggleEsp,
} from "./src/features/esp.js";
import {
  getGameCanvas,
  updateLockButtonUI,
  getOrCreateCanvas,
  initRadarDrag,
} from "./src/ui/radar.js";
import {
  generateRandomString,
  getAllPropertyNames,
  isValidEntity,
} from "./src/utils.js";
import {
  applyTheme,
  initBackgroundImage,
  injectStyles,
} from "./src/ui/theme.js";
import { addTrackToPlaylist, removeTrackFromPlaylist } from "./src/storage.js";
import { startRepeatingTask, stopChatTimer } from "./src/features/chat.js";
import { initAntiDetection } from "./src/features/antidetection.js";
import { initializeAstraVision } from "./src/features/xray.js";
import { initAdBlocker } from "./src/features/adblock.js";

initializeApplication();
