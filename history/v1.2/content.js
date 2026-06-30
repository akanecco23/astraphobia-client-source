import {
  wrapWithProxy,
  initNetworkHook,
  encryptPacketData,
  sendPacket,
  setupAntiDetection,
  applyGameHacks,
  initMod,
  initializePanels,
  angles,
  radius,
  playerData,
  isProcessed_2,
  isProcessed_3,
  config,
  state,
} from "./src/core.js";
import {
  createUpdateHistoryPanel,
  createDeepToolsPanel,
  createPlusPanel,
  togglePanels,
} from "./src/ui/panels.js";
import {
  generateRandomString,
  getGameCanvas,
  getAllPropertyNames,
} from "./src/utils.js";
import {
  simulateTyping,
  autoTypeChat,
  showNotification,
} from "./src/ui/interaction.js";
import {
  stopEntityTrail,
  toggleMouseSimulation,
} from "./src/features/movement.js";
import { applyCustomBackground, createSettingsStyles } from "./src/ui/theme.js";
import { startScheduledTask, stopInterval } from "./src/features/chat.js";
import { featuresentitytrailState } from "./src/features/entitytrail.js";
import { handleAnimalAction } from "./src/features/autofarm.js";
import { startAntiAfk } from "./src/features/antidetection.js";
import { initAdBlocker } from "./src/features/adblock.js";
