import { coreSharedState } from "../core.js";

function startScheduledTask(taskData, intervalSeconds) {
  if (coreSharedState.updateInterval) {
    clearInterval(coreSharedState.updateInterval);
  }
  coreSharedState.isProcessing = true;
  coreSharedState.updateInterval = setInterval(() => {
    autoChat(taskData);
  }, intervalSeconds * 1000);
}
function stopInterval() {
  if (coreSharedState.updateInterval) {
    clearInterval(coreSharedState.updateInterval);
    coreSharedState.updateInterval = null;
  }
  coreSharedState.isProcessing = false;
}
function autoChat(textToType) {
  const chatInput =
    document.querySelector(".chat-input input") ||
    document.querySelector('input[placeholder*="chat" i]') ||
    document.querySelector('input[type="text"]');
  if (!chatInput) {
    console.warn("Chat input not found - skipping auto chat");
    return;
  }
  chatInput.focus();
  chatInput.value = "";
  let charIndex = 0;
  const typeCharacter = () => {
    if (charIndex >= textToType.length) {
      const sendButton =
        document.querySelector(".chat-input button") ||
        document.querySelector('button[aria-label*="send" i]') ||
        document.querySelector("button");
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
    setTimeout(typeCharacter, 25);
  };
  typeCharacter();
}

export { startScheduledTask, stopInterval, autoChat };
