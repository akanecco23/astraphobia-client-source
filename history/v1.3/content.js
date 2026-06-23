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
import {
  startScheduledTask,
  stopInterval,
  autoChat,
  createDeepToolsPanel,
} from "./src/features/chat.js";
import { initHooks } from "./src/features/entitytrail.js";
import { toggleMinimapSize } from "./src/features/esp.js";
import { injectPlusPanelStyles, initBackgroundImage } from "./src/ui/theme.js";
import { initAdBlocker } from "./src/features/adblock.js";
import {
  initControlOverlay,
  createUpdateHistoryPanel,
  injectSettingsStyles,
  initializePanels,
} from "./src/ui/panels.js";
import {
  wrapWithProxy,
  hookTextEncoder,
  encryptPacketData,
  sendPacket,
  disableGameRestrictions,
  stateMap,
  angles,
  radius,
  isActive,
  securitySettings,
  state,
  coreSharedState,
} from "./src/core.js";
import { simulateTyping, showNotification } from "./src/ui/interaction.js";
