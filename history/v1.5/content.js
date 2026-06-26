import {
  wrapPropertyWithProxy,
  initInterceptor,
  encryptPacketData,
  sendPacket,
  initializeAntiTamper,
  disableGameRestrictions,
  angleSteps,
  radius,
  gameInstance,
  playerData,
  isReady,
  securityConfigs,
  coreSharedState,
} from "./src/core.js";
import {
  createHalloweenModal,
  initControlOverlay,
  createUpdateHistoryStyles,
  injectDeepToolsStyles,
  injectPlusPanelStyles,
  injectSettingsPanelStyles,
  togglePanels,
} from "./src/ui/panels.js";
import {
  generateRandomString,
  getGameCanvas,
  getAllPropertyNames,
} from "./src/utils.js";
import {
  applyHomeBackground,
  applyThemeColors,
  setBlueTheme,
} from "./src/ui/theme.js";
import {
  stopMouseSimulation,
  toggleMouseSimulation,
} from "./src/features/movement.js";
import {
  startScheduledTask,
  stopInterval,
  autoChat,
} from "./src/features/chat.js";
import { simulateTyping, showNotification } from "./src/ui/interaction.js";
import { handleAnimalAction } from "./src/features/autofarm.js";
import { startAntiAfk } from "./src/features/antidetection.js";
import { initAdBlocker } from "./src/features/adblock.js";
import { toggleMinimapScale } from "./src/ui/radar.js";
