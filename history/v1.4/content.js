import {
  generateRandomString,
  getGameCanvas,
  getAllPropertyNames,
} from "./src/utils.js";
import { simulateTyping, showNotification } from "./src/ui/interaction.js";
import { handleAnimalAction } from "./src/features/autofarm.js";
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
import { setupProxyHooks } from "./src/features/antidetection.js";
import { toggleMinimapSize } from "./src/features/esp.js";
import {
  injectPlusPanelStyles,
  initBackgroundImage,
  setTheme,
} from "./src/ui/theme.js";
import { initAdBlocker } from "./src/features/adblock.js";
import {
  initControlOverlay,
  setupUpdateHistory,
  setupToolsPanel,
  injectSettingsStyles,
  initializePanels,
} from "./src/ui/panels.js";
import {
  wrapPropertyWithProxy,
  initPacketInterceptor,
  encryptPacketData,
  sendPacket,
  disableGameRestrictions,
  stateMap,
  rotationAngles,
  orbitRadius,
  isReady,
  securitySettings,
  stateCache,
  state,
} from "./src/core.js";
