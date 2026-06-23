import {
  generateRandomString,
  getGameCanvas,
  getAllPropertyNames,
} from "./src/utils.js";
import {
  simulateTyping,
  autoTypeChat,
  showToast,
} from "./src/ui/interaction.js";
import { handleAnimalAction } from "./src/features/autofarm.js";
import {
  startCircularMouseMovement,
  stopMouseSimulation,
  toggleMouseSimulation,
} from "./src/features/movement.js";
import { startScheduledTask, stopInterval } from "./src/features/chat.js";
import {
  createUpdateHistoryPanel,
  createToolsPanel,
  initPlusPanel,
  initSettingsPanel,
  togglePanels,
} from "./src/ui/panels.js";
import { initAdBlocker } from "./src/features/adblock.js";
import {
  wrapWithProxy,
  setupTextEncoderHook,
  encryptPacketData,
  sendPacket,
  initHooks,
  disableZoomClamp,
  initGameCheats,
  initAllPanels,
  angleSteps,
  orbitRadius,
  playerData,
  isInitialized_2,
  securityConfig,
  coreSharedState,
} from "./src/core.js";
