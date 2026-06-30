import { autoTypeChat } from "../ui/interaction.js";
import { state } from "../core.js";

function startScheduledTask(taskData, intervalSeconds) {
  if (state.entityTrailInterval) {
    clearInterval(state.entityTrailInterval);
  }
  state.isToggled = true;
  state.entityTrailInterval = setInterval(() => {
    autoTypeChat(taskData);
  }, intervalSeconds * 1000);
}
function stopInterval() {
  if (state.entityTrailInterval) {
    clearInterval(state.entityTrailInterval);
    state.entityTrailInterval = null;
  }
  state.isToggled = false;
}

export { startScheduledTask, stopInterval };
