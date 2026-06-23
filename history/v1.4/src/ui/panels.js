import { handleAnimalAction } from "../features/autofarm.js";
import { showNotification } from "./interaction.js";
import {
  gameInstance,
  playerData,
  securitySettings,
  isReady,
  setupProxyHooks,
  disableGameRestrictions,
  state,
} from "../core.js";
import { toggleMinimapSize } from "../features/esp.js";
import { setTheme } from "./theme.js";

const initControlOverlay = () => {
  if (state.isInitialized_2) {
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
    const gameDiv = document.querySelector("div.game");
    if (gameDiv) {
      gameDiv.insertBefore(overlayDiv, gameDiv.children[0]);
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
    (callbackParam) => {
      try {
        if (!playerData?.myAnimals?.[0]) {
          return;
        }
        const visibleFishLevel = playerData.myAnimals[0].visibleFishLevel;
        const fishLevelConfig = {
          ...securitySettings.default,
          ...securitySettings[visibleFishLevel],
        };
        if (callbackParam.ctrlKey) {
          if (callbackParam.shiftKey && visibleFishLevel === 107) {
            sendActionSequence();
            return;
          } else if (
            callbackParam.shiftKey &&
            visibleFishLevel !== 101 &&
            playerData.myAnimals[0]._standing
          ) {
            handleAnimalAction(
              Math.floor(Math.random() * 1647483648) + 500000000,
            );
            return;
          } else {
            let keyMapping = Object.getOwnPropertyNames(gameInstance)
              .map((clientKey) => gameInstance[clientKey])
              .find((keyCollection) => keyCollection.keys instanceof Array);
            if (keyMapping) {
              keyMapping.pointerDown = true;
              keyMapping.pressElapsed = Infinity;
              keyMapping.setPointerDown(false);
            }
          }
        } else if (callbackParam.altKey) {
          handleAnimalAction(
            playerData?.myAnimals?.[0]?._standing
              ? 41
              : Math.floor(fishLevelConfig.secLoadTime / 2),
          );
        }
      } catch {}
    },
    false,
  );
  window.addEventListener(
    "keyup",
    (event) => {
      try {
        if (!event.ctrlKey && !event.altKey) {
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
  state.isInitialized_2 = true;
};
function setupUpdateHistory() {
  const historyStyle = document.createElement("style");
  historyStyle.textContent =
    "\n      #update-history {\n        position: fixed;\n        bottom: 20px;\n        left: 20px;\n        background: var(--bg-primary);\n        color: var(--text-primary);\n        padding: 16px;\n        border-radius: 16px;\n        font-size: 13px;\n        z-index: 9999;\n        max-width: 240px;\n        max-height: 280px;\n        overflow-y: auto;\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        cursor: move;\n        box-shadow: var(--shadow);\n        border: 1px solid var(--border);\n        transition: all 0.3s ease;\n        backdrop-filter: blur(20px);\n      }\n      #update-history:hover {\n        box-shadow: var(--shadow-hover);\n        transform: translateY(-2px);\n      }\n      #update-history ul {\n        margin: 0;\n        padding-left: 18px;\n      }\n      #update-history li {\n        margin-bottom: 6px;\n        line-height: 1.4;\n        color: var(--text-primary);\n      }\n      #update-history h3 {\n        margin: 0 0 12px 0;\n        font-size: 15px;\n        color: var(--accent);\n        position: relative;\n        padding-right: 28px;\n        font-weight: 600;\n      }\n      #update-history button.min-btn {\n        background: none;\n        border: none;\n        color: var(--accent);\n        font-size: 20px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 8px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: all 0.2s ease;\n        width: 24px;\n        height: 24px;\n        line-height: 24px;\n        border-radius: 50%;\n      }\n      #update-history button.min-btn:hover {\n        color: var(--accent-hover);\n        background: rgba(var(--accent-rgb), 0.2);\n      }\n    ";
  document.head.appendChild(historyStyle);
  const historyPanel = document.createElement("div");
  historyPanel.id = "update-history";
  historyPanel.innerHTML =
    '\n      <h3>Update History <button class="min-btn" id="minHist">−</button></h3>\n      <div id="historyContent">\n        <ul>\n          <li>v1.4 - New Themes Selection (NO MORE PLAIN RED UI MORE MODERN COLORS).</li>\n          <li>v1.3 - New Blue Themed UI with new UI animations and Client Logo! No more minimize or maximize for everything but Update History because of toogle client tool. Updated Astraphobia Client Website and Discord! Also, added new small minimap feature.</li>\n          <li>v1.2 - Astra-Vision added - no ink flash or deep darkness effects + no-zoom limit, added new client ui rework, and custom-background feature (images and gif\'s).</li>\n          <li>v1.1 - Added built-in ad blocker, removed boost trail, spoofing for username, keybind selector for auto spin, added settings GUI, added shift keybind to toogle all panels.</li>\n          <li>v1.0 - Initial release with auto chat, auto-spin, special character bypass, and thresher super boost, no-zoom limit is automatically enabled.</li>\n        </ul>\n      </div>\n    ';
  document.body.appendChild(historyPanel);
  const minHistBtn = historyPanel.querySelector("#minHist");
  const historyContent = historyPanel.querySelector("#historyContent");
  let isHistoryHidden = false;
  minHistBtn.onclick = (arg_bc94) => {
    arg_bc94.stopPropagation();
    isHistoryHidden = !isHistoryHidden;
    historyContent.style.display = isHistoryHidden ? "none" : "block";
    historyPanel.style.height = isHistoryHidden ? "60px" : "auto";
    minHistBtn.textContent = isHistoryHidden ? "+" : "−";
  };
  let offsetX;
  let offsetY;
  let isDragging = false;
  let isActive = false;
  historyPanel.addEventListener("mousedown", (arg_81e8) => {
    if (
      ["BUTTON", "INPUT", "TEXTAREA", "A"].includes(arg_81e8.target.tagName)
    ) {
      return;
    }
    isDragging = true;
    isActive = false;
    offsetX = arg_81e8.clientX - historyPanel.getBoundingClientRect().left;
    offsetY = arg_81e8.clientY - historyPanel.getBoundingClientRect().top;
    historyPanel.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - arg_81e8.clientX;
      const deltaY = mouseEvent.clientY - arg_81e8.clientY;
      if (!isActive && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isActive = true;
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
  historyPanel.addEventListener("click", (arg_d242) => {
    if (isActive) {
      arg_d242.stopImmediatePropagation();
    }
  });
  return historyPanel;
}
function injectPlusPanelStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent =
    "\n      #plus-panel {\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: var(--shadow);\n        border: 1px solid var(--border);\n        background: var(--bg-primary);\n        backdrop-filter: blur(20px);\n        border-radius: 16px;\n      }\n      #plus-panel:hover {\n        box-shadow: var(--shadow-hover);\n        transform: translateY(-2px);\n      }\n      #plus-panel textarea {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 8px;\n        padding: 10px;\n        transition: all 0.2s ease;\n        font-size: 13px;\n      }\n      #plus-panel textarea:focus {\n        outline: none;\n        border-color: var(--accent);\n        box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.2);\n      }\n      #plus-panel input[type=\"number\"] {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        width: 60px;\n        text-align: center;\n        transition: all 0.2s ease;\n      }\n      #plus-panel button {\n        background: var(--bg-secondary);\n        color: var(--accent);\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        padding: 10px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        position: relative;\n        overflow: hidden;\n        width: 100%;\n        margin-bottom: 10px;\n      }\n      #plus-panel button::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: -100%;\n        width: 100%;\n        height: 100%;\n        background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.2), transparent);\n        transition: left 0.5s;\n      }\n      #plus-panel button:hover:not(:disabled)::before {\n        left: 100%;\n      }\n      #plus-panel button:hover:not(:disabled) {\n        background: var(--hover-bg);\n        border-color: var(--accent);\n        transform: translateY(-1px);\n        box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.2);\n        color: var(--accent-hover);\n      }\n      #plus-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);\n      }\n      #plus-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n    ";
  document.head.appendChild(styleElement);
  const uiContainer = document.createElement("div");
  uiContainer.id = "plus-panel";
  uiContainer.style.position = "fixed";
  uiContainer.style.top = "20px";
  uiContainer.style.right = "20px";
  uiContainer.style.color = "var(--text-primary)";
  uiContainer.style.padding = "16px";
  uiContainer.style.borderRadius = "16px";
  uiContainer.style.fontSize = "14px";
  uiContainer.style.zIndex = "99999";
  uiContainer.style.userSelect = "none";
  uiContainer.style.width = "240px";
  uiContainer.style.textAlign = "center";
  uiContainer.style.cursor = "move";
  uiContainer.style.overflow = "hidden";
  uiContainer.innerHTML =
    '\n      <div style="font-weight:600; margin-bottom:12px; color:var(--accent); height: 40px; line-height: 40px;">\n        ASTRAPHOBIA CLIENT+\n      </div>\n      <div id="plusContent">\n        <button id="thresherBtn">Enable Thresher Super Boost(ctrl + shift and click)(minumum required 2 boost)</button>\n        <button id="astraVisionBtn">Enable Astra-Vision (no-zoom limit, no ink flash or deep darkness)</button>\n        <button id="smallMinimapBtn">Enable Small Minimap</button>\n      </div>\n    ';
  document.body.appendChild(uiContainer);
  const thresherButton = uiContainer.querySelector("#thresherBtn");
  thresherButton.onclick = () => {
    if (state.isInitialized_2) {
      showNotification("Thresher Super Boost is already active!");
      return;
    }
    setupProxyHooks();
    thresherButton.textContent = "Thresher Super Boost Active";
    thresherButton.style.color = "var(--accent)";
    thresherButton.style.opacity = "0.6";
    thresherButton.disabled = true;
  };
  const astraVisionButton = uiContainer.querySelector("#astraVisionBtn");
  astraVisionButton.onclick = () => {
    if (isReady) {
      showNotification("Astra-Vision already enabled!");
      return;
    }
    setupProxyHooks();
    disableGameRestrictions();
    astraVisionButton.textContent = "Astra-Vision Active";
    astraVisionButton.style.color = "var(--accent)";
    astraVisionButton.style.opacity = "0.6";
    astraVisionButton.disabled = true;
    showNotification(
      "👁️ Astra-Vision enabled! (zoom-limit unlocked, no ink-flash or deep darkness effects)",
    );
  };
  const smallMinimapButton = uiContainer.querySelector("#smallMinimapBtn");
  smallMinimapButton.onclick = () => {
    setupProxyHooks();
    toggleMinimapSize();
    if (state.isProcessing_2) {
      smallMinimapButton.textContent = "Disable Small Minimap";
      smallMinimapButton.style.color = "var(--accent)";
      smallMinimapButton.style.opacity = "0.6";
    } else {
      smallMinimapButton.textContent = "Enable Small Minimap";
      smallMinimapButton.style.color = "var(--accent)";
      smallMinimapButton.style.opacity = "1";
    }
  };
  let relativeX;
  let relativeY;
  let isActive = false;
  let isEnabled = false;
  uiContainer.addEventListener("mousedown", (arg_7846) => {
    if (
      arg_7846.target.tagName === "BUTTON" ||
      arg_7846.target.tagName === "TEXTAREA" ||
      arg_7846.target.tagName === "INPUT" ||
      arg_7846.target.classList.contains("credits")
    ) {
      return;
    }
    isActive = true;
    isEnabled = false;
    relativeX = arg_7846.clientX - uiContainer.getBoundingClientRect().left;
    relativeY = arg_7846.clientY - uiContainer.getBoundingClientRect().top;
    uiContainer.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - arg_7846.clientX;
      const deltaY = mouseEvent.clientY - arg_7846.clientY;
      if (!isEnabled && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isEnabled = true;
      }
      if (isActive) {
        uiContainer.style.left = mouseEvent.clientX - relativeX + "px";
        uiContainer.style.top = mouseEvent.clientY - relativeY + "px";
        uiContainer.style.bottom = "auto";
        uiContainer.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      isActive = false;
      uiContainer.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
  uiContainer.addEventListener("click", (arg_eef9) => {
    if (isEnabled) {
      arg_eef9.stopImmediatePropagation();
    }
  });
  return uiContainer;
}
function injectSettingsStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent =
    "\n      #settings-panel {\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: var(--shadow);\n        border: 1px solid var(--border);\n        background: var(--bg-primary);\n        backdrop-filter: blur(20px);\n        border-radius: 16px;\n        position: fixed;\n        top: 20px;\n        left: 20px;\n        color: var(--text-primary);\n        padding: 16px;\n        font-size: 14px;\n        z-index: 99999;\n        user-select: none;\n        width: 240px;\n        text-align: center;\n        cursor: move;\n        overflow: hidden;\n      }\n      #settings-panel:hover {\n        box-shadow: var(--shadow-hover);\n        transform: translateY(-2px);\n      }\n      #settings-panel button {\n        background: var(--bg-secondary);\n        color: var(--accent);\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        padding: 10px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        width: 100%;\n        margin-bottom: 10px;\n        position: relative;\n        overflow: hidden;\n      }\n      #settings-panel button::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: -100%;\n        width: 100%;\n        height: 100%;\n        background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.2), transparent);\n        transition: left 0.5s;\n      }\n      #settings-panel button:hover:not(:disabled)::before {\n        left: 100%;\n      }\n      #settings-panel button:hover:not(:disabled) {\n        background: var(--hover-bg);\n        border-color: var(--accent);\n        transform: translateY(-1px);\n        box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.2);\n        color: var(--accent-hover);\n      }\n      #settings-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);\n      }\n      #settings-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #settings-panel .keybind-set, #settings-panel .bg-set {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        margin-bottom: 10px;\n        font-size: 12px;\n      }\n      #settings-panel .keybind-set label, #settings-panel .bg-set label {\n        color: var(--text-primary);\n      }\n      #settings-panel #toggleKeyInput, #settings-panel #bgUrl {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        text-align: center;\n        transition: all 0.2s ease;\n      }\n      #settings-panel #toggleKeyInput {\n        width: 80px;\n      }\n      #settings-panel #bgUrl {\n        width: 120px;\n      }\n      #settings-panel .section-header {\n        font-weight: bold;\n        color: var(--accent);\n        margin: 12px 0 6px 0;\n        font-size: 13px;\n      }\n      #settings-panel select {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        width: 100%;\n        margin-bottom: 10px;\n        transition: all 0.2s ease;\n      }\n      #settings-panel select:focus {\n        outline: none;\n        border-color: var(--accent);\n        box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.2);\n      }\n    ";
  document.head.appendChild(styleElement);
  const container = document.createElement("div");
  container.id = "settings-panel";
  container.innerHTML =
    '\n      <div style="font-weight:600; margin-bottom:12px; color:var(--accent); height: 40px; line-height: 40px;">\n        SETTINGS\n      </div>\n      <div id="settingsContent">\n        <div class="keybind-set">\n          <label for="toggleKeyInput">Toggle Client:</label>\n          <input type="text" id="toggleKeyInput" placeholder="PRESS" readonly>\n        </div>\n        <div class="section-header">Custom Background</div>\n        <div class="bg-set">\n          <label for="bgUrl">BG URL:</label>\n          <input type="text" id="bgUrl" placeholder="Image/GIF URL">\n        </div>\n        <button id="applyBg">Apply Custom Background</button>\n        <div class="section-header">Themes</div>\n        <select id="themeSelect">\n          <option value="blue">Blue (Default)</option>\n          <option value="red">Red</option>\n          <option value="green">Green</option>\n        </select>\n      </div>\n    ';
  document.body.appendChild(container);
  const bgUrlInput = container.querySelector("#bgUrl");
  bgUrlInput.value = localStorage.getItem("bgUrl") || "";
  const applyBgButton = container.querySelector("#applyBg");
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
  const themeSelect = container.querySelector("#themeSelect");
  const currentTheme = localStorage.getItem("theme") || "blue";
  themeSelect.value = currentTheme;
  setTheme(currentTheme);
  themeSelect.onchange = (themeChangeEvent) => {
    setTheme(themeChangeEvent.target.value);
    showNotification("Theme changed to " + themeChangeEvent.target.value);
  };
  const toggleKeyInput = container.querySelector("#toggleKeyInput");
  toggleKeyInput.value = state.currentKey;
  toggleKeyInput.addEventListener("keydown", (keyboardEvent) => {
    keyboardEvent.preventDefault();
    state.currentKey = keyboardEvent.key;
    toggleKeyInput.value = state.currentKey;
  });
  let offsetX;
  let offsetY;
  let isDragging = false;
  let isToggled = false;
  container.addEventListener("mousedown", (uiEvent) => {
    if (
      uiEvent.target.tagName === "BUTTON" ||
      uiEvent.target.tagName === "INPUT" ||
      uiEvent.target.classList.contains("credits")
    ) {
      return;
    }
    isDragging = true;
    isToggled = false;
    offsetX = uiEvent.clientX - container.getBoundingClientRect().left;
    offsetY = uiEvent.clientY - container.getBoundingClientRect().top;
    container.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - uiEvent.clientX;
      const deltaY = mouseEvent.clientY - uiEvent.clientY;
      if (!isToggled && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isToggled = true;
      }
      if (isDragging) {
        container.style.left = mouseEvent.clientX - offsetX + "px";
        container.style.top = mouseEvent.clientY - offsetY + "px";
        container.style.bottom = "auto";
        container.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      isDragging = false;
      container.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
  container.addEventListener("click", (interceptedEvent) => {
    if (isToggled) {
      interceptedEvent.stopImmediatePropagation();
    }
  });
  return container;
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

export {
  initControlOverlay,
  setupUpdateHistory,
  injectPlusPanelStyles,
  injectSettingsStyles,
  togglePanels,
};
