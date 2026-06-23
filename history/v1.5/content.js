import {
  generateRandomString,
  getGameCanvas,
  getAllPropertyNames,
} from "./src/utils.js";
import { handleAnimalAction } from "./src/features/autofarm.js";
import { createHalloweenModal, initControlOverlay } from "./src/ui/panels.js";
import {
  startAntiAfk,
  initializeAntiTamper,
} from "./src/features/antidetection.js";
import { initAdBlocker } from "./src/features/adblock.js";
import {
  startScheduledTask,
  stopInterval,
  autoChat,
} from "./src/features/chat.js";
import {
  stopMouseSimulation,
  toggleMouseSimulation,
} from "./src/features/movement.js";
import { toggleMinimapScale } from "./src/ui/radar.js";
import {
  createUpdateHistoryStyles,
  injectDeepToolsStyles,
  injectPlusPanelStyles,
  applyHomeBackground,
  applyThemeColors,
  injectSettingsPanelStyles,
  setBlueTheme,
} from "./src/ui/theme.js";
import {
  wrapPropertyWithProxy,
  initInterceptor,
  encryptPacketData,
  sendPacket,
  disableGameRestrictions,
  stateMap,
  angleSteps,
  radius,
  isReady,
  securityConfigs,
  state,
  coreSharedState,
} from "./src/core.js";
import { simulateTyping, showNotification } from "./src/ui/interaction.js";
