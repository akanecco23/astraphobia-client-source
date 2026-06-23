import {
  generateRandomString,
  getGameCanvas,
  getAllPropertyNames,
} from "./src/utils.js";
import { handleAnimalAction } from "./src/features/autofarm.js";
import {
  startScheduledTask,
  stopInterval,
  autoChat,
} from "./src/features/chat.js";
import { startAntiAfk } from "./src/features/antidetection.js";
import {
  stopMouseSimulation,
  toggleMouseSimulation,
} from "./src/features/movement.js";
import { toggleMinimapSize } from "./src/features/esp.js";
import {
  initControlOverlay,
  createUpdateHistoryPanel,
  createDeepToolsPanel,
  injectPlusPanelStyles,
  injectSettingsStyles,
  togglePanels,
} from "./src/ui/panels.js";
import { initBackgroundImage } from "./src/ui/theme.js";
import { initAdBlocker } from "./src/features/adblock.js";
import {
  wrapWithProxy,
  hookTextEncoder,
  encryptPacketData,
  sendPacket,
  initHooks,
  disableGameRestrictions,
  initializePanels,
  angles,
  radius,
  game,
  player,
  isActive,
  securitySettings,
  coreSharedState,
} from "./src/core.js";
import { simulateTyping, showNotification } from "./src/ui/interaction.js";
