import { handleAnimalAction } from "../features/autofarm.js";
import { showNotification } from "./interaction.js";
import { createDeepToolsPanel } from "../features/chat.js";
import { injectPlusPanelStyles, initBackgroundImage } from "./theme.js";
import { initAdBlocker } from "../features/adblock.js";
import { securitySettings, radius, coreSharedState } from "../core.js";

const initControlOverlay = () => {
  if (coreSharedState.isInitialized_2) {
    return;
  }
  function sendActionSequence() {
    try {
      handleAnimalAction(1);
      setTimeout(() => {
        handleAnimalAction(5000);
      }, 50);
      setTimeout(() => {
        handleAnimalAction(5000);
      }, 100);
      setTimeout(() => {
        handleAnimalAction(5000);
      }, 150);
    } catch {}
  }
  function createControlOverlay() {
    try {
      document.getElementById("ctrl-overlay").remove();
    } catch {}
    const overlayDiv = document.createElement("div");
    const gameContainer = document.querySelector("div.game");
    if (gameContainer) {
      gameContainer.insertBefore(overlayDiv, gameContainer.children[0]);
    }
    overlayDiv.outerHTML =
      '<div id="ctrl-overlay" style="width: 100%;height: 100%;position: absolute;display: block;z-index:10000;pointer-events:none;"></div>';
    document
      .getElementById("ctrl-overlay")
      .addEventListener("contextmenu", (event) => event.preventDefault());
  }
  createControlOverlay();
  window.addEventListener(
    "click",
    (myAnimalsHandler) => {
      try {
        if (!coreSharedState.player?.myAnimals?.[0]) {
          return;
        }
        const visibleFishLevel =
          coreSharedState.player.myAnimals[0].visibleFishLevel;
        const fishSettings = {
          ...securitySettings.default,
          ...securitySettings[visibleFishLevel],
        };
        if (myAnimalsHandler.ctrlKey) {
          if (myAnimalsHandler.shiftKey && visibleFishLevel === 107) {
            sendActionSequence();
            return;
          } else if (
            myAnimalsHandler.shiftKey &&
            visibleFishLevel !== 101 &&
            coreSharedState.player.myAnimals[0]._standing
          ) {
            handleAnimalAction(
              Math.floor(Math.random() * 1647483648) + 500000000,
            );
            return;
          } else {
            let keyMap = Object.getOwnPropertyNames(coreSharedState.game)
              .map((clientKey) => coreSharedState.game[clientKey])
              .find((inputMap) => inputMap.keys instanceof Array);
            if (keyMap) {
              keyMap.pointerDown = true;
              keyMap.pressElapsed = Infinity;
              keyMap.setPointerDown(false);
            }
          }
        } else if (myAnimalsHandler.altKey) {
          handleAnimalAction(
            coreSharedState.player?.myAnimals?.[0]?._standing
              ? 41
              : Math.floor(fishSettings.secLoadTime / 2),
          );
        }
      } catch {}
    },
    false,
  );
  window.addEventListener(
    "keyup",
    (keyboardEvent) => {
      try {
        if (!keyboardEvent.ctrlKey && !keyboardEvent.altKey) {
          document.getElementById("ctrl-overlay").style.pointerEvents = "none";
        }
      } catch {}
    },
    false,
  );
  window.addEventListener("focus", () => {
    try {
      document.getElementById("ctrl-overlay").style.pointerEvents = "none";
    } catch {}
  });
  coreSharedState.isInitialized_2 = true;
};
function createUpdateHistoryPanel() {
  const historyStyle = document.createElement("style");
  historyStyle.textContent =
    "\n      #update-history {\n        position: fixed;\n        bottom: 20px;\n        left: 20px;\n        background: rgba(15, 15, 35, 0.95);\n        color: #ffffff;\n        padding: 16px;\n        border-radius: 16px;\n        font-size: 13px;\n        z-index: 9999;\n        max-width: 240px;\n        max-height: 280px;\n        overflow-y: auto;\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        cursor: move;\n        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);\n        border: 1px solid rgba(0, 212, 255, 0.2);\n        transition: all 0.3s ease;\n        backdrop-filter: blur(20px);\n      }\n      #update-history:hover {\n        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);\n        transform: translateY(-2px);\n      }\n      #update-history ul {\n        margin: 0;\n        padding-left: 18px;\n      }\n      #update-history li {\n        margin-bottom: 6px;\n        line-height: 1.4;\n      }\n      #update-history h3 {\n        margin: 0 0 12px 0;\n        font-size: 15px;\n        color: #00d4ff;\n        position: relative;\n        padding-right: 28px;\n        font-weight: 600;\n      }\n      #update-history button.min-btn {\n        background: none;\n        border: none;\n        color: #00d4ff;\n        font-size: 20px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 8px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: all 0.2s ease;\n        width: 24px;\n        height: 24px;\n        line-height: 24px;\n        border-radius: 50%;\n      }\n      #update-history button.min-btn:hover {\n        color: #ffffff;\n        background: rgba(0, 212, 255, 0.2);\n      }\n    ";
  document.head.appendChild(historyStyle);
  const historyPanel = document.createElement("div");
  historyPanel.id = "update-history";
  historyPanel.innerHTML =
    '\n      <h3>Update History <button class="min-btn" id="minHist">−</button></h3>\n      <div id="historyContent">\n        <ul>\n          <li>v1.3 - New Blue Themed UI with new UI animations and Client Logo! No more minimize or maximize for everything but Update History because of toogle client tool. Updated Astraphobia Client Website and Discord! Also, added new small minimap feature.</li>\n          <li>v1.2 - Astra-Vision added - no ink flash or deep darkness effects + no-zoom limit, added new client ui rework, and custom-background feature (images and gif\'s).</li>\n          <li>v1.1 - Added built-in ad blocker, removed boost trail, spoofing for username, keybind selector for auto spin, added settings GUI, added shift keybind to toogle all panels.</li>\n          <li>v1.0 - Initial release with auto chat, auto-spin, special character bypass, and thresher super boost, no-zoom limit is automatically enabled.</li>\n        </ul>\n      </div>\n    ';
  document.body.appendChild(historyPanel);
  const minHistElement = historyPanel.querySelector("#minHist");
  const historyContentElement = historyPanel.querySelector("#historyContent");
  let isHistoryHidden = false;
  minHistElement.onclick = (arg_6d48) => {
    arg_6d48.stopPropagation();
    isHistoryHidden = !isHistoryHidden;
    historyContentElement.style.display = isHistoryHidden ? "none" : "block";
    historyPanel.style.height = isHistoryHidden ? "60px" : "auto";
    minHistElement.textContent = isHistoryHidden ? "+" : "−";
  };
  let offsetX;
  let offsetY;
  let isDragging = false;
  let isResizing = false;
  historyPanel.addEventListener("mousedown", (arg_129f) => {
    if (
      ["BUTTON", "INPUT", "TEXTAREA", "A"].includes(arg_129f.target.tagName)
    ) {
      return;
    }
    isDragging = true;
    isResizing = false;
    offsetX = arg_129f.clientX - historyPanel.getBoundingClientRect().left;
    offsetY = arg_129f.clientY - historyPanel.getBoundingClientRect().top;
    historyPanel.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - arg_129f.clientX;
      const deltaY = mouseEvent.clientY - arg_129f.clientY;
      if (!isResizing && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isResizing = true;
      }
      if (isDragging) {
        historyPanel.style.left = mouseEvent.clientX - offsetX + "px";
        historyPanel.style.top = mouseEvent.clientY - offsetY + "px";
        historyPanel.style.bottom = "auto";
        historyPanel.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      isDragging = false;
      historyPanel.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
  historyPanel.addEventListener("click", (arg_222a) => {
    if (isResizing) {
      arg_222a.stopImmediatePropagation();
    }
  });
  return historyPanel;
}
function injectSettingsStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent =
    "\n      #settings-panel {\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: var(--shadow);\n        border: 1px solid var(--border);\n        background: var(--bg-primary);\n        backdrop-filter: blur(20px);\n        border-radius: 16px;\n        position: fixed;\n        top: 20px;\n        left: 20px;\n        color: var(--text-primary);\n        padding: 16px;\n        font-size: 14px;\n        z-index: 99999;\n        user-select: none;\n        width: 240px;\n        text-align: center;\n        cursor: move;\n        overflow: hidden;\n      }\n      #settings-panel:hover {\n        box-shadow: var(--shadow-hover);\n        transform: translateY(-2px);\n      }\n      #settings-panel button {\n        background: var(--bg-secondary);\n        color: var(--accent);\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        padding: 10px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        width: 100%;\n        margin-bottom: 10px;\n        position: relative;\n        overflow: hidden;\n      }\n      #settings-panel button::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: -100%;\n        width: 100%;\n        height: 100%;\n        background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.2), transparent);\n        transition: left 0.5s;\n      }\n      #settings-panel button:hover:not(:disabled)::before {\n        left: 100%;\n      }\n      #settings-panel button:hover:not(:disabled) {\n        background: rgba(45, 45, 75, 1);\n        border-color: var(--accent);\n        transform: translateY(-1px);\n        box-shadow: 0 4px 12px rgba(0, 212, 255, 0.2);\n        color: var(--accent-hover);\n      }\n      #settings-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);\n      }\n      #settings-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #settings-panel .keybind-set, #settings-panel .bg-set {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        margin-bottom: 10px;\n        font-size: 12px;\n      }\n      #settings-panel .keybind-set label, #settings-panel .bg-set label {\n        color: var(--text-primary);\n      }\n      #settings-panel #toggleKeyInput, #settings-panel #bgUrl {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        text-align: center;\n        transition: all 0.2s ease;\n      }\n      #settings-panel #toggleKeyInput {\n        width: 80px;\n      }\n      #settings-panel #bgUrl {\n        width: 120px;\n      }\n      #settings-panel .section-header {\n        font-weight: bold;\n        color: var(--accent);\n        margin: 12px 0 6px 0;\n        font-size: 13px;\n      }\n    ";
  document.head.appendChild(styleElement);
  const mainContainer = document.createElement("div");
  mainContainer.id = "settings-panel";
  mainContainer.innerHTML =
    '\n      <div style="font-weight:600; margin-bottom:12px; color:var(--accent); height: 40px; line-height: 40px;">\n        SETTINGS\n      </div>\n      <div id="settingsContent">\n        <div class="keybind-set">\n          <label for="toggleKeyInput">Toggle Client:</label>\n          <input type="text" id="toggleKeyInput" placeholder="PRESS" readonly>\n        </div>\n        <div class="section-header">Custom Background</div>\n        <div class="bg-set">\n          <label for="bgUrl">BG URL:</label>\n          <input type="text" id="bgUrl" placeholder="Image/GIF URL">\n        </div>\n        <button id="applyBg">Apply Custom Background</button>\n      </div>\n    ';
  document.body.appendChild(mainContainer);
  const bgUrlInput = mainContainer.querySelector("#bgUrl");
  bgUrlInput.value = localStorage.getItem("bgUrl") || "";
  const applyBgButton = mainContainer.querySelector("#applyBg");
  applyBgButton.onclick = () => {
    const backgroundUrl = bgUrlInput.value.trim();
    if (backgroundUrl === "") {
      showNotification("Enter a URL first!");
      return;
    }
    localStorage.setItem("bgUrl", backgroundUrl);
    let homeBgElement = document.querySelector(".home-bg");
    const updateBackgroundImage = () => {
      homeBgElement.style.setProperty(
        "background-image",
        'url("' + backgroundUrl + '")',
        "important",
      );
    };
    if (homeBgElement == null) {
      const bgCheckInterval = setInterval(() => {
        homeBgElement = document.querySelector(".home-bg");
        if (homeBgElement != null) {
          clearInterval(bgCheckInterval);
        }
        updateBackgroundImage();
      }, 100);
    } else {
      updateBackgroundImage();
    }
    showNotification("Custom Background applied!");
  };
  const toggleKeyInputButton = mainContainer.querySelector("#toggleKeyInput");
  toggleKeyInputButton.value = coreSharedState.currentKey;
  toggleKeyInputButton.addEventListener("keydown", (event) => {
    event.preventDefault();
    coreSharedState.currentKey = event.key;
    toggleKeyInputButton.value = coreSharedState.currentKey;
  });
  let offsetX;
  let offsetY;
  let isDragging = false;
  let isToggled = false;
  mainContainer.addEventListener("mousedown", (event_2) => {
    if (
      event_2.target.tagName === "BUTTON" ||
      event_2.target.tagName === "INPUT" ||
      event_2.target.classList.contains("credits")
    ) {
      return;
    }
    isDragging = true;
    isToggled = false;
    offsetX = event_2.clientX - mainContainer.getBoundingClientRect().left;
    offsetY = event_2.clientY - mainContainer.getBoundingClientRect().top;
    mainContainer.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - event_2.clientX;
      const deltaY = mouseEvent.clientY - event_2.clientY;
      if (!isToggled && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isToggled = true;
      }
      if (isDragging) {
        mainContainer.style.left = mouseEvent.clientX - offsetX + "px";
        mainContainer.style.top = mouseEvent.clientY - offsetY + "px";
        mainContainer.style.bottom = "auto";
        mainContainer.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      isDragging = false;
      mainContainer.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
  mainContainer.addEventListener("click", (event_3) => {
    if (isToggled) {
      event_3.stopImmediatePropagation();
    }
  });
  return mainContainer;
}
function togglePanels() {
  const deepToolsPanel = document.getElementById("deep-tools-panel");
  const updateHistoryPanel = document.getElementById("update-history");
  const settingsPanel = document.getElementById("settings-panel");
  const plusPanel = document.getElementById("plus-panel");
  const currentDisplay = deepToolsPanel.style.display;
  const newDisplay = currentDisplay === "none" ? "block" : "none";
  deepToolsPanel.style.display = newDisplay;
  updateHistoryPanel.style.display = newDisplay;
  settingsPanel.style.display = newDisplay;
  plusPanel.style.display = newDisplay;
}
function initializePanels() {
  const mainPanelElement = createDeepToolsPanel();
  const historyPanelElement = createUpdateHistoryPanel();
  const settingsPanelElement = injectSettingsStyles();
  const plusPanelElement = injectPlusPanelStyles();
  initBackgroundImage();
  initAdBlocker();
  return {
    mainPanel: mainPanelElement,
    historyPanel: historyPanelElement,
    settingsPanel: settingsPanelElement,
    plusPanel: plusPanelElement,
  };
}

export {
  initControlOverlay,
  createUpdateHistoryPanel,
  injectSettingsStyles,
  initializePanels,
};
