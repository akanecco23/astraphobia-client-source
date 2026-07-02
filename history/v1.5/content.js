import {
  wrapPropertyWithProxy,
  initInterceptor,
  encryptPacketData,
  sendPacket,
  initializeAntiTamper,
  disableGameRestrictions,
  angles,
  radius,
  gameInstance,
  playerData,
  boolIsProcessed,
  objConfig,
  state,
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
  stopEntityTrail,
  toggleMouseSimulation,
} from "./src/features/movement.js";
import {
  startScheduledTask,
  stopInterval,
  autoChat,
} from "./src/features/chat.js";
import { simulateTyping, showNotification } from "./src/ui/interaction.js";
import { featuresentitytrailState } from "./src/features/entitytrail.js";
import { handleAnimalAction } from "./src/features/autofarm.js";
import { startAntiAfk } from "./src/features/antidetection.js";
import { initAdBlocker } from "./src/features/adblock.js";
import { toggleMinimapScale } from "./src/ui/radar.js";
