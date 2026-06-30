import {
  wrapPropertyWithProxy,
  initPacketInterceptor,
  encryptPacketData,
  sendPacket,
  setupProxyHooks,
  disableGameRestrictions,
  setupToolsPanel,
  initializePanels,
  angles,
  radius,
  gameInstance,
  playerData,
  isProcessed_2,
  config,
  state,
} from "./src/core.js";
import {
  initControlOverlay,
  setupUpdateHistory,
  injectPlusPanelStyles,
  injectSettingsStyles,
  togglePanels,
} from "./src/ui/panels.js";
import {
  startAntiAfkMouseMovement,
  stopEntityTrail,
  toggleMouseSimulation,
} from "./src/features/movement.js";
import {
  generateRandomString,
  getGameCanvas,
  getAllPropertyNames,
} from "./src/utils.js";
import {
  startScheduledTask,
  stopInterval,
  autoChat,
} from "./src/features/chat.js";
import { simulateTyping, showNotification } from "./src/ui/interaction.js";
import { featuresentitytrailState } from "./src/features/entitytrail.js";
import { initBackgroundImage, setTheme } from "./src/ui/theme.js";
import { handleAnimalAction } from "./src/features/autofarm.js";
import { initAdBlocker } from "./src/features/adblock.js";
import { toggleMinimapSize } from "./src/features/esp.js";
