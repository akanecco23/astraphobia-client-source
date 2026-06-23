import {
  generateRandomString,
  getGameCanvas,
  getAllPropertyNames,
} from "./src/utils.js";
import { handleAnimalAction } from "./src/features/autofarm.js";
import { startAntiAfk } from "./src/features/antidetection.js";
import {
  stopMouseSimulation,
  toggleMouseSimulation,
} from "./src/features/movement.js";
import { startScheduledTask, stopInterval } from "./src/features/chat.js";
import {
  createUpdateHistoryPanel,
  createDeepToolsPanel,
  createPlusPanel,
  togglePanels,
} from "./src/ui/panels.js";
import { applyCustomBackground, createSettingsStyles } from "./src/ui/theme.js";
import { initAdBlocker } from "./src/features/adblock.js";
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
  userData,
  isInitialized,
  isInitialized_2,
  securityConfigs,
  coreSharedState,
} from "./src/core.js";
import {
  simulateTyping,
  autoTypeChat,
  showNotification,
} from "./src/ui/interaction.js";
