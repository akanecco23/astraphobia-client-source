import { currentTime, radius, state } from "../core.js";

function typeText(selector, text) {
  const inputElement = document.querySelector(selector);
  if (!inputElement) {
    return false;
  }
  inputElement.focus();
  inputElement.value = "";
  let charIndex = 0;
  const typeChar = () => {
    if (charIndex >= text.length) {
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
      return;
    }
    inputElement.value += text[charIndex];
    inputElement.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
      }),
    );
    charIndex++;
    setTimeout(typeChar, 25);
  };
  typeChar();
  return true;
}
function showNotification(message) {
  const currentTime = Date.now();
  if (message === state.currentTrackId && currentTime - currentTime < 3000) {
    return;
  }
  state.currentTrackId = message;
  currentTime = currentTime;
  const notificationDiv = document.createElement("div");
  notificationDiv.style.cssText =
    "\n      position: fixed; top: 16px; right: 16px;\n      background: var(--notif-bg, #282828); color: var(--notif-text, #e0e0e0);\n      padding: 10px 16px; border-radius: 4px;\n      z-index: 10000000; font-size: 13px;\n      opacity: 0; transition: opacity 0.2s ease, transform 0.2s ease;\n      pointer-events: none; font-family: 'Segoe UI', system-ui, sans-serif;\n      border-left: 3px solid var(--notif-border, var(--acc, #888));\n      transform: translateX(20px);\n    ";
  notificationDiv.textContent = message;
  document.body.appendChild(notificationDiv);
  requestAnimationFrame(() => {
    notificationDiv.style.opacity = "1";
    notificationDiv.style.transform = "translateX(0)";
  });
  setTimeout(() => {
    notificationDiv.style.opacity = "0";
    notificationDiv.style.transform = "translateX(20px)";
    setTimeout(() => notificationDiv.remove(), 200);
  }, 2500);
}

export { typeText, showNotification };
