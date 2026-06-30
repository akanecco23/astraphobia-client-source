import {
  wrapWithProxy,
  setupTextEncoderHook,
  encryptPacketData,
  sendPacket,
  initHooks,
  disableZoomClamp,
  initGameCheats,
  initAllPanels,
  angles,
  radius,
  playerData,
  isProcessed_t1s,
  config,
  state,
} from "./src/core.js";
import {
  createUpdateHistoryPanel,
  createToolsPanel,
  initPlusPanel,
  initSettingsPanel,
  togglePanels,
} from "./src/ui/panels.js";
import {
  startCircularMouseMovement,
  stopEntityTrail,
  toggleMouseSimulation,
} from "./src/features/movement.js";
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
import { startScheduledTask, stopInterval } from "./src/features/chat.js";
import { featuresentitytrailState } from "./src/features/entitytrail.js";
import { handleAnimalAction } from "./src/features/autofarm.js";
import { initAdBlocker } from "./src/features/adblock.js";
