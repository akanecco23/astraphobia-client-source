import {
  generateRandomString,
  getGameCanvas,
  getAllPropertyNames,
} from "./src/utils.js";
import { handleAnimalAction } from "./src/features/autofarm.js";
import {
  startAntiAfk,
  setupAntiDetection,
} from "./src/features/antidetection.js";
import {
  stopMouseSimulation,
  toggleMouseSimulation,
} from "./src/features/movement.js";
import {
  startScheduledTask,
  stopInterval,
  createDeepToolsPanel,
} from "./src/features/chat.js";
import { applyCustomBackground, createSettingsStyles } from "./src/ui/theme.js";
import { initAdBlocker } from "./src/features/adblock.js";
import {
  createUpdateHistoryPanel,
  createPlusPanel,
  initializePanels,
} from "./src/ui/panels.js";
import {
  wrapWithProxy,
  initNetworkHook,
  encryptPacketData,
  sendPacket,
  applyGameHacks,
  initMod,
  stateMap,
  angles,
  radius,
  isInitialized,
  isInitialized_2,
  securityConfigs,
  state,
  coreSharedState,
} from "./src/core.js";
import {
  simulateTyping,
  autoTypeChat,
  showNotification,
} from "./src/ui/interaction.js";
