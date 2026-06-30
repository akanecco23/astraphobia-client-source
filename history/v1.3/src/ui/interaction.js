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
function showNotification(message) {
  const notificationDiv = document.createElement("div");
  notificationDiv.style.cssText =
    "position: fixed; top: 20px; right: 20px; background: rgba(15, 15, 35, 0.95); color: #ffffff; padding: 12px 18px; border-radius: 12px; z-index: 10001; font-size: 14px; opacity: 0; transition: opacity 0.3s ease, transform 0.3s ease; pointer-events: none; backdrop-filter: blur(10px); border: 1px solid rgba(0, 212, 255, 0.2);";
  notificationDiv.textContent = message;
  document.body.appendChild(notificationDiv);
  setTimeout(() => {
    notificationDiv.style.opacity = "1";
    notificationDiv.style.transform = "translateY(0)";
  }, 10);
  setTimeout(() => {
    notificationDiv.style.opacity = "0";
    notificationDiv.style.transform = "translateY(-10px)";
    setTimeout(() => notificationDiv.remove(), 300);
  }, 3000);
}

export { simulateTyping, showNotification };
