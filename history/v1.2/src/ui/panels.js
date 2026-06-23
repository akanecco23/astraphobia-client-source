import {
  simulateTyping,
  autoTypeChat,
  showNotification,
} from "./interaction.js";
import {
  radius,
  initNetworkHook,
  isInitialized,
  isInitialized_2,
  setupAntiDetection,
  applyGameHacks,
  coreSharedState,
} from "../core.js";
import { generateRandomString } from "../utils.js";
import { toggleMouseSimulation } from "../features/movement.js";
import { startScheduledTask, stopInterval } from "../features/chat.js";

function createUpdateHistoryPanel() {
  const historyStyle = document.createElement("style");
  historyStyle.textContent =
    "\n      #update-history {\n        position: fixed;\n        bottom: 20px;\n        left: 20px;\n        background: #1e1e1e;\n        color: #e0e0e0;\n        padding: 14px;\n        border-radius: 8px;\n        font-size: 13px;\n        z-index: 9999;\n        max-width: 220px;\n        max-height: 250px;\n        overflow-y: auto;\n        font-family: 'Segoe UI', sans-serif;\n        cursor: move;\n        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);\n        border: 1px solid #333;\n        transition: all 0.3s ease;\n      }\n      #update-history:hover {\n        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);\n      }\n      #update-history ul {\n        margin: 0;\n        padding-left: 15px;\n      }\n      #update-history li {\n        margin-bottom: 5px;\n        line-height: 1.3;\n      }\n      #update-history h3 {\n        margin: 0 0 10px 0;\n        font-size: 14px;\n        color: #e74c3c;\n        position: relative;\n        padding-right: 25px;\n        font-weight: 600;\n      }\n      #update-history button.min-btn {\n        background: none;\n        border: none;\n        color: #e74c3c;\n        font-size: 18px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 5px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: color 0.2s ease;\n        width: 20px;\n        height: 20px;\n        line-height: 20px;\n      }\n      #update-history button.min-btn:hover {\n        color: #f39c12;\n      }\n    ";
  document.head.appendChild(historyStyle);
  const historyPanel = document.createElement("div");
  historyPanel.id = "update-history";
  historyPanel.innerHTML =
    '\n      <h3>Update History <button class="min-btn" id="minHist">−</button></h3>\n      <div id="historyContent">\n        <ul>\n          <li>v1.2 - Astra-Vision added - no ink flash or deep darkness effects + no-zoom limit, added new client ui rework, and custom-background feature (images and gif\'s).</li>\n          <li>v1.1 - Added built-in ad blocker, removed boost trail, spoofing for username, keybind selector for auto spin, added settings GUI, added shift keybind to toogle all panels.</li>\n          <li>v1.0 - Initial release with auto chat, auto-spin, special character bypass, and thresher super boost, no-zoom limit is automatically enabled.</li>\n        </ul>\n      </div>\n    ';
  document.body.appendChild(historyPanel);
  const minHistBtn = historyPanel.querySelector("#minHist");
  const historyContent = historyPanel.querySelector("#historyContent");
  let isHistoryHidden = false;
  minHistBtn.onclick = (event) => {
    event.stopPropagation();
    isHistoryHidden = !isHistoryHidden;
    historyContent.style.display = isHistoryHidden ? "none" : "block";
    historyPanel.style.height = isHistoryHidden ? "50px" : "auto";
    minHistBtn.textContent = isHistoryHidden ? "+" : "−";
  };
  let offsetX;
  let offsetY;
  let isDragging = false;
  let isResizing = false;
  historyPanel.addEventListener("mousedown", (event_2) => {
    if (["BUTTON", "INPUT", "TEXTAREA", "A"].includes(event_2.target.tagName)) {
      return;
    }
    isDragging = true;
    isResizing = false;
    offsetX = event_2.clientX - historyPanel.getBoundingClientRect().left;
    offsetY = event_2.clientY - historyPanel.getBoundingClientRect().top;
    historyPanel.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - event_2.clientX;
      const deltaY = mouseEvent.clientY - event_2.clientY;
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
  historyPanel.addEventListener("click", (event_3) => {
    if (isResizing) {
      event_3.stopImmediatePropagation();
    }
  });
  return historyPanel;
}
function createDeepToolsPanel() {
  const deepToolsStyle = document.createElement("style");
  deepToolsStyle.textContent =
    "\n      #deep-tools-panel {\n        font-family: 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);\n        border: 1px solid #333;\n        background: #1e1e1e;\n      }\n      #deep-tools-panel:hover {\n        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);\n      }\n      #deep-tools-panel textarea {\n        background: #2d2d2d;\n        border: 1px solid #444;\n        color: #e0e0e0;\n        border-radius: 6px;\n        padding: 8px;\n        transition: border-color 0.2s;\n        font-size: 13px;\n      }\n      #deep-tools-panel textarea:focus {\n        outline: none;\n        border-color: #e74c3c;\n        box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);\n      }\n      #deep-tools-panel input[type=\"number\"] {\n        background: #2d2d2d;\n        border: 1px solid #444;\n        color: #e0e0e0;\n        border-radius: 4px;\n        padding: 4px;\n        width: 60px;\n        text-align: center;\n      }\n      #deep-tools-panel button {\n        background: #2d2d2d;\n        color: #e74c3c;\n        border: 1px solid #444;\n        border-radius: 6px;\n        padding: 8px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n      }\n      #deep-tools-panel button:hover:not(:disabled) {\n        background: #3d3d3d;\n        border-color: #e74c3c;\n        transform: translateY(-1px);\n        box-shadow: 0 2px 6px rgba(231, 76, 60, 0.2);\n      }\n      #deep-tools-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);\n      }\n      #deep-tools-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #deep-tools-panel button.min-btn {\n        background: none;\n        border: none;\n        color: #e74c3c;\n        font-size: 18px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 5px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: color 0.2s ease;\n        width: 20px;\n        height: 20px;\n        line-height: 20px;\n      }\n      #deep-tools-panel button.min-btn:hover {\n        color: #f39c12;\n      }\n      #deep-tools-panel .credits {\n        margin-top: 10px;\n        font-size: 10px;\n        color: #888;\n        line-height: 1.3;\n      }\n      #deep-tools-panel .auto-chat-controls {\n        display: flex;\n        gap: 5px;\n        margin-bottom: 8px;\n        align-items: center;\n        justify-content: center;\n      }\n      #deep-tools-panel .spin-keybind {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        margin-bottom: 8px;\n        font-size: 12px;\n      }\n      #deep-tools-panel .spin-keybind label {\n        color: #e0e0e0;\n      }\n      #deep-tools-panel #spinKeyInput {\n        background: #2d2d2d;\n        border: 1px solid #444;\n        color: #e0e0e0;\n        border-radius: 4px;\n        padding: 4px;\n        width: 50px;\n        text-align: center;\n      }\n      #aim-overlay, #ctrl-overlay {\n        z-index: 10000 !important;\n      }\n      div.game {\n        position: relative;\n      }\n      /* Ad Removal */\n      div.sidebar.left > div.ad-block {\n        opacity: 0 !important;\n        pointer-events: none !important;\n        display: none !important;\n      }\n      div.sidebar.left > a {\n        display: none !important;\n      }\n      div.sidebar.left {\n        max-width: 30vw;\n        width: 21rem;\n        bottom: 0 !important;\n      }\n    ";
  document.head.appendChild(deepToolsStyle);
  const mainContainer = document.createElement("div");
  mainContainer.id = "deep-tools-panel";
  mainContainer.style.position = "fixed";
  mainContainer.style.bottom = "20px";
  mainContainer.style.right = "20px";
  mainContainer.style.color = "#e0e0e0";
  mainContainer.style.padding = "14px";
  mainContainer.style.borderRadius = "8px";
  mainContainer.style.fontSize = "14px";
  mainContainer.style.zIndex = "99999";
  mainContainer.style.userSelect = "none";
  mainContainer.style.width = "220px";
  mainContainer.style.textAlign = "center";
  mainContainer.style.cursor = "move";
  mainContainer.style.overflow = "hidden";
  mainContainer.innerHTML =
    '\n      <div style="font-weight:600; margin-bottom:10px; color:#e74c3c; position: relative; height: 40px; line-height: 40px; padding-right: 25px;">\n        ASTRAPHOBIA CLIENT\n        <button class="min-btn" id="minPanel">−</button>\n      </div>\n      <div id="panelContent">\n        <textarea id="chatMsg" placeholder="Type message..." style="width:100%; height:45px; margin-bottom:10px; resize:none;"></textarea>\n        <button id="sendBtn" style="width:100%; margin-bottom:8px;">Send Typed Chat</button>\n        <div class="auto-chat-controls">\n          <input type="number" id="delayInput" min="1" max="300" value="10" style="margin-right:5px;">\n          <span style="font-size:12px;">sec</span>\n        </div>\n        <button id="autoChatBtn" style="width:100%; margin-bottom:8px;">Enable Auto Chat</button>\n        <button id="patchBtn" style="width:100%; margin-bottom:8px;">Enable Special Characters(in chat/clan/name)</button>\n        <button id="spoofBtn" style="width:100%; margin-bottom:8px;">Spoof Username:Random Unicode Name(ban decrease)</button>\n        <button id="spinBtn" style="width:100%; margin-bottom:8px;">Enable Auto Spin</button>\n        <div class="spin-keybind">\n          <label for="spinKeyInput">Keybind:</label>\n          <input type="text" id="spinKeyInput" placeholder="Press key..." readonly>\n        </div>\n        <div class="credits">\n          Coder: Astraphobia<br>\n          Owner/Founder: Astraphobia<br>\n          Designer/Marketer: Astraphobia<br>\n          Tester: Astraphobia\n        </div>\n      </div>\n    ';
  document.body.appendChild(mainContainer);
  const minPanel = mainContainer.querySelector("#minPanel");
  const panelContent = mainContainer.querySelector("#panelContent");
  let isMinimized = false;
  minPanel.onclick = (event) => {
    event.stopPropagation();
    isMinimized = !isMinimized;
    panelContent.style.display = isMinimized ? "none" : "block";
    mainContainer.style.height = isMinimized ? "50px" : "auto";
    minPanel.textContent = isMinimized ? "+" : "−";
  };
  mainContainer.querySelector("#sendBtn").onclick = () => {
    const chatMessage = mainContainer.querySelector("#chatMsg").value;
    if (chatMessage) {
      autoTypeChat(chatMessage);
    }
  };
  const patchButton = mainContainer.querySelector("#patchBtn");
  patchButton.onclick = () => initNetworkHook(patchButton);
  const spoofButton = mainContainer.querySelector("#spoofBtn");
  spoofButton.onclick = () => {
    const maxLength = generateRandomString(8);
    if (simulateTyping(".play-game .el-input__inner", maxLength)) {
      showNotification("Spoofed name!");
    } else if (simulateTyping(".new-tribe .el-input__inner", maxLength)) {
      showNotification("Spoofed tribe name!");
    } else {
      showNotification("No name input found! Enable special characters first.");
    }
  };
  const spinButton = mainContainer.querySelector("#spinBtn");
  spinButton.onclick = () => {
    toggleMouseSimulation();
    if (coreSharedState.animationInterval) {
      spinButton.textContent = "Disable Auto Spin";
      spinButton.style.color = "#27ae60";
    } else {
      spinButton.textContent = "Enable Auto Spin";
      spinButton.style.color = "#e74c3c";
    }
  };
  const spinKeyInput = mainContainer.querySelector("#spinKeyInput");
  let activeKey = null;
  spinKeyInput.addEventListener("keydown", (keyEvent) => {
    keyEvent.preventDefault();
    activeKey = keyEvent.code || keyEvent.key;
    spinKeyInput.value = activeKey.replace("Key", "").toLowerCase();
  });
  document.addEventListener("keydown", (event_2) => {
    if (
      activeKey &&
      event_2.code === activeKey &&
      !event_2.target.matches("input, textarea, button")
    ) {
      event_2.preventDefault();
      toggleMouseSimulation();
      if (coreSharedState.animationInterval) {
        spinButton.textContent = "Disable Auto Spin";
        spinButton.style.color = "#27ae60";
      } else {
        spinButton.textContent = "Enable Auto Spin";
        spinButton.style.color = "#e74c3c";
      }
    }
  });
  const autoChatButton = mainContainer.querySelector("#autoChatBtn");
  autoChatButton.onclick = () => {
    const chatMessageText = mainContainer.querySelector("#chatMsg").value;
    const delayInput = mainContainer.querySelector("#delayInput");
    const delayValue = parseInt(delayInput.value) || 10;
    if (!chatMessageText) {
      showNotification("⚠️ Enter a message first!");
      return;
    }
    if (coreSharedState.isActive) {
      stopInterval();
      autoChatButton.textContent = "Enable Auto Chat";
      autoChatButton.style.color = "#e74c3c";
    } else {
      startScheduledTask(chatMessageText, delayValue);
      autoChatButton.textContent = "Disable Auto Chat";
      autoChatButton.style.color = "#27ae60";
    }
  };
  let offsetX;
  let offsetY;
  let isLoading = false;
  let isInitialized = false;
  mainContainer.addEventListener("mousedown", (event_3) => {
    if (
      event_3.target.tagName === "BUTTON" ||
      event_3.target.tagName === "TEXTAREA" ||
      event_3.target.tagName === "INPUT" ||
      event_3.target.classList.contains("credits")
    ) {
      return;
    }
    isLoading = true;
    isInitialized = false;
    offsetX = event_3.clientX - mainContainer.getBoundingClientRect().left;
    offsetY = event_3.clientY - mainContainer.getBoundingClientRect().top;
    mainContainer.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - event_3.clientX;
      const deltaY = mouseEvent.clientY - event_3.clientY;
      if (!isInitialized && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isInitialized = true;
      }
      if (isLoading) {
        mainContainer.style.left = mouseEvent.clientX - offsetX + "px";
        mainContainer.style.top = mouseEvent.clientY - offsetY + "px";
        mainContainer.style.bottom = "auto";
        mainContainer.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      isLoading = false;
      mainContainer.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
  mainContainer.addEventListener("click", (event_4) => {
    if (isInitialized) {
      event_4.stopImmediatePropagation();
    }
  });
  return mainContainer;
}
function createPlusPanel() {
  const plusPanelStyle = document.createElement("style");
  plusPanelStyle.textContent =
    "\n      #plus-panel {\n        font-family: 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);\n        border: 1px solid #333;\n        background: #1e1e1e;\n      }\n      #plus-panel:hover {\n        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);\n      }\n      #plus-panel textarea {\n        background: #2d2d2d;\n        border: 1px solid #444;\n        color: #e0e0e0;\n        border-radius: 6px;\n        padding: 8px;\n        transition: border-color 0.2s;\n        font-size: 13px;\n      }\n      #plus-panel textarea:focus {\n        outline: none;\n        border-color: #e74c3c;\n        box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);\n      }\n      #plus-panel input[type=\"number\"] {\n        background: #2d2d2d;\n        border: 1px solid #444;\n        color: #e0e0e0;\n        border-radius: 4px;\n        padding: 4px;\n        width: 60px;\n        text-align: center;\n      }\n      #plus-panel button {\n        background: #2d2d2d;\n        color: #e74c3c;\n        border: 1px solid #444;\n        border-radius: 6px;\n        padding: 8px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        width: 100%;\n        margin-bottom: 8px;\n      }\n      #plus-panel button:hover:not(:disabled) {\n        background: #3d3d3d;\n        border-color: #e74c3c;\n        transform: translateY(-1px);\n        box-shadow: 0 2px 6px rgba(231, 76, 60, 0.2);\n      }\n      #plus-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);\n      }\n      #plus-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #plus-panel button.min-btn {\n        background: none;\n        border: none;\n        color: #e74c3c;\n        font-size: 18px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 5px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: color 0.2s ease;\n        width: 20px;\n        height: 20px;\n        line-height: 20px;\n      }\n      #plus-panel button.min-btn:hover {\n        color: #f39c12;\n      }\n    ";
  document.head.appendChild(plusPanelStyle);
  const container = document.createElement("div");
  container.id = "plus-panel";
  container.style.position = "fixed";
  container.style.top = "20px";
  container.style.right = "20px";
  container.style.color = "#e0e0e0";
  container.style.padding = "14px";
  container.style.borderRadius = "8px";
  container.style.fontSize = "14px";
  container.style.zIndex = "99999";
  container.style.userSelect = "none";
  container.style.width = "220px";
  container.style.textAlign = "center";
  container.style.cursor = "move";
  container.style.overflow = "hidden";
  container.innerHTML =
    '\n      <div style="font-weight:600; margin-bottom:10px; color:#e74c3c; position: relative; height: 40px; line-height: 40px; padding-right: 25px;">\n        ASTRAPHOBIA CLIENT\n        <button class="min-btn" id="minPlus">−</button>\n      </div>\n      <div id="plusContent">\n        <button id="thresherBtn">Enable Thresher Super Boost(ctrl + shift and click)(minumum required 2 boost)</button>\n        <button id="astraVisionBtn">Enable Astra-Vision (no-zoom limit, no ink flash or deep darkness)</button>\n      </div>\n    ';
  document.body.appendChild(container);
  const minPlusBtn = container.querySelector("#minPlus");
  const plusContent = container.querySelector("#plusContent");
  let isHidden = false;
  minPlusBtn.onclick = (arg_5f0a) => {
    arg_5f0a.stopPropagation();
    isHidden = !isHidden;
    plusContent.style.display = isHidden ? "none" : "block";
    container.style.height = isHidden ? "50px" : "auto";
    minPlusBtn.textContent = isHidden ? "+" : "−";
  };
  const thresherBtn = container.querySelector("#thresherBtn");
  thresherBtn.onclick = () => {
    if (isInitialized_2) {
      showNotification("Thresher Super Boost is already active!");
      return;
    }
    setupAntiDetection();
    thresherBtn.textContent = "Thresher Super Boost Active";
    thresherBtn.style.color = "#27ae60";
    thresherBtn.disabled = true;
  };
  const astraVisionBtn = container.querySelector("#astraVisionBtn");
  astraVisionBtn.onclick = () => {
    if (isInitialized) {
      showNotification("Astra-Vision already enabled!");
      return;
    }
    setupAntiDetection();
    applyGameHacks();
    astraVisionBtn.textContent = "Astra-Vision Active";
    astraVisionBtn.style.color = "#27ae60";
    astraVisionBtn.disabled = true;
    showNotification(
      "👁️ Astra-Vision enabled! (zoom-limit unlocked, no ink-flash or deep darkness effects)",
    );
  };
  let offsetX;
  let offsetY;
  let isDragging = false;
  let isMinimized = false;
  container.addEventListener("mousedown", (arg_281e) => {
    if (
      arg_281e.target.tagName === "BUTTON" ||
      arg_281e.target.tagName === "TEXTAREA" ||
      arg_281e.target.tagName === "INPUT" ||
      arg_281e.target.classList.contains("credits")
    ) {
      return;
    }
    isDragging = true;
    isMinimized = false;
    offsetX = arg_281e.clientX - container.getBoundingClientRect().left;
    offsetY = arg_281e.clientY - container.getBoundingClientRect().top;
    container.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - arg_281e.clientX;
      const deltaY = mouseEvent.clientY - arg_281e.clientY;
      if (!isMinimized && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isMinimized = true;
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
  container.addEventListener("click", (arg_cd86) => {
    if (isMinimized) {
      arg_cd86.stopImmediatePropagation();
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
  createUpdateHistoryPanel,
  createDeepToolsPanel,
  createPlusPanel,
  togglePanels,
};
