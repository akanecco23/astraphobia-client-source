import { currentTime, radius, state } from "../core.js";

function simulateTyping(selector, textToType) {
  const inputElement = document.querySelector(selector);
  if (!inputElement) {
    return false;
  }
  inputElement.focus();
  inputElement.value = "";
  let currentIndex = 0;
  const typeNextChar = () => {
    if (currentIndex >= textToType.length) {
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
    inputElement.value += textToType[currentIndex];
    inputElement.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
      }),
    );
    currentIndex++;
    setTimeout(typeNextChar, 25);
  };
  typeNextChar();
  return true;
}
function showNotification(message) {
  const currentTime = Date.now();
  if (message === state.currentTrackId && currentTime - currentTime < 3000) {
    return;
  }
  state.currentTrackId = message;
  currentTime = currentTime;
  const notificationElement = document.createElement("div");
  notificationElement.style.cssText =
    "\n      position: fixed; top: 16px; right: 16px;\n      background: var(--notif-bg, #282828); color: var(--notif-text, #e0e0e0);\n      padding: 10px 16px; border-radius: 4px;\n      z-index: 10000000; font-size: 13px;\n      opacity: 0; transition: opacity 0.2s ease, transform 0.2s ease;\n      pointer-events: none; font-family: 'Segoe UI', system-ui, sans-serif;\n      border-left: 3px solid var(--notif-border, var(--acc, #888));\n      transform: translateX(20px);\n    ";
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
function initNameAutofill() {
  if (state.isMuted) {
    return;
  }
  let storedName = localStorage.getItem("autofill_name") || "";
  let nameInput =
    document.querySelector(".name-input input") ||
    document.querySelector(".play-game .el-input__inner");
  function applyAutofill() {
    if (state.isMuted) {
      return;
    }
    state.isMuted = true;
    nameInput.value = storedName;
    nameInput.dispatchEvent(
      new Event("input", {
        bubbles: true,
      }),
    );
    nameInput.addEventListener("input", () => {
      if (storedName !== nameInput.value) {
        storedName = nameInput.value;
        localStorage.setItem("autofill_name", storedName);
      }
    });
  }
  if (nameInput == null) {
    const pollInterval = setInterval(() => {
      nameInput =
        document.querySelector(".name-input input") ||
        document.querySelector(".play-game .el-input__inner");
      if (nameInput != null) {
        clearInterval(pollInterval);
        applyAutofill();
      }
    }, 200);
  } else {
    applyAutofill();
  }
}

export { simulateTyping, showNotification, initNameAutofill };
