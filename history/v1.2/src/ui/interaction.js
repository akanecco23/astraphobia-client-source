import { radius, state } from "../core.js";

function simulateTyping(selector, textToType) {
  const inputElement = document.querySelector(selector);
  if (!inputElement) {
    return false;
  }
  inputElement.focus();
  inputElement.value = "";
  let charIndex = 0;
  const typeNextChar = () => {
    if (charIndex >= textToType.length) {
      inputElement.dispatchEvent(
        new Event("change", {
          bubbles: true,
        }),
      );
      inputElement.dispatchEvent(
        new Event("input", {
          bubbles: true,
        }),
      );
      setTimeout(() => {}, 100);
      return;
    }
    inputElement.value += textToType[charIndex];
    inputElement.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
      }),
    );
    charIndex++;
    setTimeout(typeNextChar, 25);
  };
  typeNextChar();
  return true;
}
function autoTypeChat(v2ae1TextToType) {
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
  let v57b6CharIndex = 0;
  const v21fdTypeNextChar = () => {
    if (v57b6CharIndex >= v2ae1TextToType.length) {
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
    chatInput.value += v2ae1TextToType[v57b6CharIndex];
    chatInput.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
      }),
    );
    v57b6CharIndex++;
    setTimeout(v21fdTypeNextChar, 25);
  };
  v21fdTypeNextChar();
}
function showNotification(message) {
  const notificationDiv = document.createElement("div");
  notificationDiv.style.cssText =
    "position: fixed; top: 20px; right: 20px; background: rgba(0, 0, 0, 0.8); color: white; padding: 10px 15px; border-radius: 5px; z-index: 10001; font-size: 14px; opacity: 0; transition: opacity 0.3s; pointer-events: none;";
  notificationDiv.textContent = message;
  document.body.appendChild(notificationDiv);
  setTimeout(() => {
    notificationDiv.style.opacity = "1";
  }, 10);
  setTimeout(() => {
    notificationDiv.style.opacity = "0";
    setTimeout(() => notificationDiv.remove(), 300);
  }, 3000);
}

export { simulateTyping, autoTypeChat, showNotification };
