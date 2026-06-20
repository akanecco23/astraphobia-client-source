import { typeChatMessage } from "../ui/interaction.js";
import { state } from "../core.js";

let chatInterval = null;
function startRepeatingTask(taskData, intervalSeconds) {
  if (chatInterval) {
    clearInterval(chatInterval);
  }
  state.isLooping = true;
  chatInterval = setInterval(() => {
    typeChatMessage(taskData);
  }, intervalSeconds * 1000);
}
function stopChatTimer() {
  if (chatInterval) {
    clearInterval(chatInterval);
    chatInterval = null;
  }
  state.isLooping = false;
}

export { startRepeatingTask, stopChatTimer };
