import { getMyAnimal } from "../utils.js";
import { radius, coreSharedState } from "../core.js";

function typeText(selector, text) {
  const inputElement = document.querySelector(selector);
  if (!inputElement) {
    return false;
  }
  inputElement.focus();
  inputElement.value = "";
  let currentIndex = 0;
  const typeChar = () => {
    if (coreSharedState.currentIndex >= text.length) {
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
    inputElement.value += text[coreSharedState.currentIndex];
    inputElement.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
      }),
    );
    coreSharedState.currentIndex++;
    setTimeout(typeChar, 25);
  };
  typeChar();
  return true;
}
function showToast(message) {
  const currentTime = Date.now();
  if (
    message === coreSharedState.previousValue &&
    currentTime - coreSharedState.lastTimestamp < 3000
  ) {
    return;
  }
  coreSharedState.previousValue = message;
  coreSharedState.lastTimestamp = currentTime;
  const toastElement = document.createElement("div");
  toastElement.style.cssText =
    "\n      position: fixed; top: 16px; right: 16px;\n      background: #282828; color: #e0e0e0;\n      padding: 10px 16px; border-radius: 4px;\n      z-index: 10000000; font-size: 13px;\n      opacity: 0; transition: opacity 0.2s ease, transform 0.2s ease;\n      pointer-events: none; font-family: 'Segoe UI', system-ui, sans-serif;\n      border-left: 3px solid var(--acc, #888);\n      transform: translateX(20px);\n    ";
  toastElement.textContent = message;
  document.body.appendChild(toastElement);
  requestAnimationFrame(() => {
    toastElement.style.opacity = "1";
    toastElement.style.transform = "translateX(0)";
  });
  setTimeout(() => {
    toastElement.style.opacity = "0";
    toastElement.style.transform = "translateX(20px)";
    setTimeout(() => toastElement.remove(), 200);
  }, 2500);
}
function restoreUIInteractivity() {
  const resetUIState = () => {
    const espOverlay = document.getElementById("esp-overlay");
    if (espOverlay) {
      espOverlay.style.pointerEvents = "none";
    }
    const isReady = getMyAnimal();
    if (!isReady) {
      if (window.autoFarmActive) {
        window.autoFarmActive = false;
        const autoFarmButton = document.getElementById("autoFarmBtn");
        if (autoFarmButton) {
          autoFarmButton.textContent = "Auto Farm";
          autoFarmButton.classList.remove("toggle-on");
        }
      }
      const interactiveElements = document.querySelectorAll(
        "input, button, select, .play-game, .home, .start-screen, .el-dialog, .el-button, a",
      );
      interactiveElements.forEach((targetElement) => {
        targetElement.style.pointerEvents = "auto";
        if (
          targetElement.tagName === "BUTTON" ||
          targetElement.tagName === "INPUT"
        ) {
          targetElement.disabled = false;
        }
      });
      const vfmElements = document.querySelectorAll(
        '.vfm__content, .modal-content, [class*="vfm"], .vfm__overlay, .vfm',
      );
      vfmElements.forEach((topLayerElement) => {
        topLayerElement.style.pointerEvents = "auto";
        topLayerElement.style.zIndex = "100000";
        topLayerElement.querySelectorAll("*").forEach((targetElement) => {
          targetElement.style.pointerEvents = "auto";
        });
      });
      const gameOverElements = document.querySelectorAll(
        '[class*="death"], [class*="game-over"], [class*="respawn"], .modal-overlay, [class*="modal"]',
      );
      gameOverElements.forEach((interactiveElement) => {
        interactiveElement.style.pointerEvents = "auto";
      });
      const appElement = document.getElementById("app");
      if (appElement) {
        appElement.style.pointerEvents = "auto";
      }
      const playButtons = document.querySelectorAll(
        '.play-btn, .respawn-btn, .startButton, .el-button, button.play, [class*="play"], [class*="start"]',
      );
      playButtons.forEach((buttonElement) => {
        buttonElement.style.pointerEvents = "auto";
        buttonElement.disabled = false;
      });
      const toolPanels = document.querySelectorAll(
        "#deep-tools-panel, #plus-panel, #settings-panel, #update-history",
      );
      toolPanels.forEach((bottomLayerElement) => {
        if (bottomLayerElement) {
          bottomLayerElement.style.zIndex = "99998";
        }
      });
    } else {
      const uiPanels = document.querySelectorAll(
        "#deep-tools-panel, #plus-panel, #settings-panel, #update-history",
      );
      uiPanels.forEach((middleLayerElement) => {
        if (middleLayerElement) {
          middleLayerElement.style.zIndex = "99999";
        }
      });
    }
  };
  setInterval(resetUIState, 400);
  new MutationObserver(resetUIState).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });
}

export { typeText, showToast, restoreUIInteractivity };
