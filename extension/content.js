import { generateRandomString, getAllPropertyNames, isValidEntity } from './src/utils.js';
import { startAutoPointerMovement, stopAutoPointerMovement, toggleAutoPointerMovement, simulatePointerMove, getAnimalPosition, extractPosition, calculateDirection, calculateDistance, buildEntityState, startEntityTrailTracking, stopEntityTrailTracking, moveAndClickElement } from './src/features/movement.js';
import { updateLockLoop, toggleLock, trackNearestPlayer, clearTracking, autoDodgeLoop, enableAutoDodge, disableAutoDodge, findNearestEntity, findEntitiesInRange, calculateAvoidanceVector } from './src/features/aimbot.js';
import { getGameState, findEntityById, markAreaAsFailed, isAreaSkipped, findBestFoodCluster, triggerRandomEvolve, checkStuckCondition, setupPatrolRoute, autoFarmLoop, startAutoFarm, stopAutoFarm, toggleMinimapSize } from './src/features/autofarm.js';
import { applyTheme, initBackgroundImage, injectStyles } from './src/ui/theme.js';
import { startRepeatingTask, stopChatTimer } from './src/features/chat.js';
import { initAntiDetection } from './src/features/antidetection.js';
import { initializeAstraVision } from './src/features/xray.js';
import { toggleEntityTrail, refreshUI, drawEntityTrail, renderLoop, drawESP, drawTrackerLine, drawRadar, renderEspLoop, toggleEsp } from './src/features/esp.js';
import { addTrackToPlaylist, removeTrackFromPlaylist } from './src/storage.js';
import { isYoutubeUrl, getYoutubeVideoId, ensureYoutubeApiReady, getYoutubeHostElement, playYoutubeVideo, stopAllPlayback, playTrack, pausePlayback, resumePlayback, resetPlayback, isPlaying, playNextOrRandom, playPrevious, updateMusicPanel, audioPlayer, musicPlaylist, youtubePlayer, uiaudioState } from './src/ui/audio.js';
import { createToolsPanel, createVisionPanel, createCombatPanel, createAutomationPanel, createSettingsPanel, createMusicPanel, createUpdateHistoryPanel } from './src/ui/panels.js';
import { initAdBlocker } from './src/features/adblock.js';
import { wrapWithProxy, getEntityManager, getFirstAnimal, getViewportScale, initializeApplication, metadataMap, configStore, isProcessed, dragState, state } from './src/core.js';
import { getGameCanvas, updateLockButtonUI, getOrCreateCanvas, initRadarDrag } from './src/ui/radar.js';
import { simulateTextInput, showNotification, initAutofillName, typeChatMessage, initializeTextInterceptor, simulateClick, showHalloweenCodeModal, makeElementDraggable } from './src/ui/interaction.js';

initializeApplication();
