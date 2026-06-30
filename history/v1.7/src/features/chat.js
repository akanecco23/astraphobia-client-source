import { typeText } from "../ui/interaction.js";
import { state } from "../core.js";

function startScheduledTask(taskData, intervalSeconds) {
  if (state.entityTrailInterval) {
    clearInterval(state.entityTrailInterval);
  }
  state.isToggled = true;
  state.entityTrailInterval = setInterval(() => {
    simulateChatInput(taskData);
  }, intervalSeconds * 1000);
}
function stopInterval() {
  if (state.entityTrailInterval) {
    clearInterval(state.entityTrailInterval);
    state.entityTrailInterval = null;
  }
  state.isToggled = false;
}
function simulateChatInput(textToType) {
  const chatInput =
    document.querySelector(".chat-input input") ||
    document.querySelector('input[placeholder*="chat" i]') ||
    document.querySelector('input[type="text"]');
  if (!chatInput) {
    return;
  }
  chatInput.focus();
  chatInput.value = "";
  let charIndex = 0;
  const typeText = () => {
    if (charIndex >= textToType.length) {
      const sendButton =
        document.querySelector(".chat-input button") ||
        document.querySelector('button[aria-label*="send" i]');
      if (sendButton) {
        sendButton.click();
      } else {
        chatInput.dispatchEvent(
          new Event("change", {
            bubbles: true,
          }),
        );
        chatInput.dispatchEvent(
          new Event("input", {
            bubbles: true,
          }),
        );
        setTimeout(() => {
          chatInput.value = "";
          chatInput.blur();
        }, 100);
      }
      return;
    }
    chatInput.value += textToType[charIndex];
    chatInput.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
      }),
    );
    charIndex++;
    setTimeout(typeText, 25);
  };
  typeText();
}

export { startScheduledTask, stopInterval, simulateChatInput };
