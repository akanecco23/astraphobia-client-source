import { autoTypeChat } from "../ui/interaction.js";
import { coreSharedState } from "../core.js";

function startScheduledTask(taskData, intervalSeconds) {
  if (coreSharedState.updateInterval) {
    clearInterval(coreSharedState.updateInterval);
  }
  coreSharedState.isProcessing = true;
  coreSharedState.updateInterval = setInterval(() => {
    autoTypeChat(taskData);
  }, intervalSeconds * 1000);
}
function stopInterval() {
  if (coreSharedState.updateInterval) {
    clearInterval(coreSharedState.updateInterval);
    coreSharedState.updateInterval = null;
  }
  coreSharedState.isProcessing = false;
}

export { startScheduledTask, stopInterval };
