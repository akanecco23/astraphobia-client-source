import { radius, coreSharedState } from "../core.js";

function simulateTyping(inputSelector, textToType) {
  const inputElement = document.querySelector(inputSelector);
  if (!inputElement) {
    return false;
  }
  inputElement.focus();
  inputElement.value = "";
  let charIndex = 0;
  const typeCharacter = () => {
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
    setTimeout(typeCharacter, 25);
  };
  typeCharacter();
  return true;
}
function showNotification(message) {
  const notificationElement = document.createElement("div");
  notificationElement.style.cssText =
    "position: fixed; top: 20px; right: 20px; background: var(--bg-primary); color: var(--text-primary); padding: 12px 18px; border-radius: 12px; z-index: 10001; font-size: 14px; opacity: 0; transition: opacity 0.3s ease, transform 0.3s ease; pointer-events: none; backdrop-filter: blur(10px); border: 1px solid var(--border);";
  notificationElement.textContent = message;
  document.body.appendChild(notificationElement);
  setTimeout(() => {
    notificationElement.style.opacity = "1";
    notificationElement.style.transform = "translateY(0)";
  }, 10);
  setTimeout(() => {
    notificationElement.style.opacity = "0";
    notificationElement.style.transform = "translateY(-10px)";
    setTimeout(() => notificationElement.remove(), 300);
  }, 3000);
}

export { simulateTyping, showNotification };
