import { radius, state } from "../core.js";

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
  if (
    message === state.previousString &&
    currentTime - state.previousValue < 3000
  ) {
    return;
  }
  state.previousString = message;
  state.previousValue = currentTime;
  const notificationElement = document.createElement("div");
  notificationElement.style.cssText =
    "\n      position: fixed; top: 16px; right: 16px;\n      background: #282828; color: #e0e0e0;\n      padding: 10px 16px; border-radius: 4px;\n      z-index: 10000000; font-size: 13px;\n      opacity: 0; transition: opacity 0.2s ease, transform 0.2s ease;\n      pointer-events: none; font-family: 'Segoe UI', system-ui, sans-serif;\n      border-left: 3px solid var(--acc, #888);\n      transform: translateX(20px);\n    ";
  notificationElement.textContent = message;
  document.body.appendChild(notificationElement);
  requestAnimationFrame(() => {
    notificationElement.style.opacity = "1";
    notificationElement.style.transform = "translateX(0)";
  });
  setTimeout(() => {
    notificationElement.style.opacity = "0";
    notificationElement.style.transform = "translateX(20px)";
    setTimeout(() => notificationElement.remove(), 200);
  }, 2500);
}

export { typeText, showNotification };
