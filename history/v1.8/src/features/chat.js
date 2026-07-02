import { state } from "../core.js";

let EntityTrailInterval = null;
function startScheduledTask(taskData, intervalSeconds) {
  if (EntityTrailInterval) {
    clearInterval(EntityTrailInterval);
  }
  state.IsToggled = true;
  EntityTrailInterval = setInterval(() => {
    typeAndSendMessage(taskData);
  }, intervalSeconds * 1000);
}
function stopInterval() {
  if (EntityTrailInterval) {
    clearInterval(EntityTrailInterval);
    EntityTrailInterval = null;
  }
  state.IsToggled = false;
}
function typeAndSendMessage(textToType) {
  const chatInput =
    document.querySelector(".chat-input input") ||
    document.querySelector('input[placeholder*="chat" i]') ||
    document.querySelector('input[type="text"]');
  if (!chatInput) {
    return;
  }
  chatInput.focus();
  chatInput.value = "";
  let currentIndex = 0;
  const typeTextRecursive = () => {
    if (currentIndex >= textToType.length) {
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
    chatInput.value += textToType[currentIndex];
    chatInput.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
      }),
    );
    currentIndex++;
    setTimeout(typeTextRecursive, 25);
  };
  typeTextRecursive();
}

export { startScheduledTask, stopInterval, typeAndSendMessage };
