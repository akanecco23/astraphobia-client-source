import {
  generateRandomString,
  getGameCanvas,
  getAllPropertyNames,
} from "./src/utils.js";
import { simulateTyping, showNotification } from "./src/ui/interaction.js";
import { handleAnimalAction } from "./src/features/autofarm.js";
import { toggleMinimapSize } from "./src/features/esp.js";
import { initBackgroundImage, setTheme } from "./src/ui/theme.js";
import {
  initControlOverlay,
  setupUpdateHistory,
  injectPlusPanelStyles,
  injectSettingsStyles,
  togglePanels,
} from "./src/ui/panels.js";
import {
  startScheduledTask,
  stopInterval,
  autoChat,
} from "./src/features/chat.js";
import {
  startAntiAfkMouseMovement,
  stopMouseSimulation,
  toggleMouseSimulation,
} from "./src/features/movement.js";
import { initAdBlocker } from "./src/features/adblock.js";
import {
  wrapPropertyWithProxy,
  initPacketInterceptor,
  encryptPacketData,
  sendPacket,
  setupProxyHooks,
  disableGameRestrictions,
  setupToolsPanel,
  initializePanels,
  rotationAngles,
  orbitRadius,
  gameInstance,
  playerData,
  isReady,
  securitySettings,
  state,
} from "./src/core.js";
