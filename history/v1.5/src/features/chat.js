import { state } from "../core.js";

let EntityTrailInterval = null;
function startScheduledTask(taskData, intervalSeconds) {
  if (EntityTrailInterval) {
    clearInterval(EntityTrailInterval);
  }
  state.IsToggled = true;
  EntityTrailInterval = setInterval(() => {
    autoChat(taskData);
  }, intervalSeconds * 1000);
}
function stopInterval() {
  if (EntityTrailInterval) {
    clearInterval(EntityTrailInterval);
    EntityTrailInterval = null;
  }
  state.IsToggled = false;
}
function autoChat(messageText) {
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
  let v291aCharIndex = 0;
  const v147bTypeCharacter = () => {
    if (v291aCharIndex >= messageText.length) {
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
    chatInput.value += messageText[v291aCharIndex];
    chatInput.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
      }),
    );
    v291aCharIndex++;
    setTimeout(v147bTypeCharacter, 25);
  };
  v147bTypeCharacter();
}

export { startScheduledTask, stopInterval, autoChat };
