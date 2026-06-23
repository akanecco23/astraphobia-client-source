import { autoTypeChat } from "../ui/interaction.js";
import { coreSharedState } from "../core.js";

function startScheduledTask(taskData, intervalSeconds) {
  if (coreSharedState.mainInterval) {
    clearInterval(coreSharedState.mainInterval);
  }
  coreSharedState.isActive = true;
  coreSharedState.mainInterval = setInterval(() => {
    autoTypeChat(taskData);
  }, intervalSeconds * 1000);
}
function stopInterval() {
  if (coreSharedState.mainInterval) {
    clearInterval(coreSharedState.mainInterval);
    coreSharedState.mainInterval = null;
  }
  coreSharedState.isActive = false;
}

export { startScheduledTask, stopInterval };
