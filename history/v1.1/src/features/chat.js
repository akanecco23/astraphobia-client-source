import { autoTypeChat } from "../ui/interaction.js";
import { state } from "../core.js";

let EntityTrailInterval = null;
function startScheduledTask(taskData, intervalSeconds) {
  if (EntityTrailInterval) {
    clearInterval(EntityTrailInterval);
  }
  state.IsToggled = true;
  EntityTrailInterval = setInterval(() => {
    autoTypeChat(taskData);
  }, intervalSeconds * 1000);
}
function stopInterval() {
  if (EntityTrailInterval) {
    clearInterval(EntityTrailInterval);
    EntityTrailInterval = null;
  }
  state.IsToggled = false;
}

export { startScheduledTask, stopInterval };
