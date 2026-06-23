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
import { initHooks } from "./src/features/entitytrail.js";
import { initAdBlocker } from "./src/features/adblock.js";
import {
  createUpdateHistoryPanel,
  createToolsPanel,
  initPlusPanel,
  initSettingsPanel,
} from "./src/ui/panels.js";
import {
  wrapWithProxy,
  setupTextEncoderHook,
  encryptPacketData,
  sendPacket,
  disableZoomClamp,
  initGameCheats,
  privateStateMap,
  angleSteps,
  orbitRadius,
  isInitialized_2,
  securityConfig,
  state,
  coreSharedState,
} from "./src/core.js";
