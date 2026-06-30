import {
  radius,
  setupTextEncoderHook,
  isProcessed_3,
  initHooks,
  state,
} from "../core.js";
import { simulateTyping, autoTypeChat, showToast } from "./interaction.js";
import { startScheduledTask, stopInterval } from "../features/chat.js";
import { featuresentitytrailState } from "../features/entitytrail.js";
import { toggleMouseSimulation } from "../features/movement.js";
import { generateRandomString } from "../utils.js";

function createUpdateHistoryPanel() {
  const historyStyleElement = document.createElement("style");
  historyStyleElement.textContent =
    "\n      #update-history {\n        position: fixed;\n        bottom: 20px;\n        left: 20px;\n        background: linear-gradient(to bottom, #0f0f0f, #1a1a1a);\n        color: #e0e0e0;\n        padding: 14px;\n        border-radius: 12px;\n        font-size: 13px;\n        z-index: 9999;\n        max-width: 220px;\n        max-height: 250px;\n        overflow-y: auto;\n        font-family: 'Segoe UI', sans-serif;\n        cursor: move;\n        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);\n        border: 1px solid #333;\n        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);\n      }\n      #update-history:hover {\n        transform: translateY(-2px);\n        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);\n      }\n      #update-history ul {\n        margin: 0;\n        padding-left: 15px;\n      }\n      #update-history li {\n        margin-bottom: 5px;\n        line-height: 1.3;\n      }\n      #update-history h3 {\n        margin: 0 0 10px 0;\n        font-size: 14px;\n        color: #ff4d4d;\n        position: relative;\n        padding-right: 25px;\n        text-shadow: 0 0 8px rgba(255,77,77,0.3);\n        font-weight: 700;\n      }\n      #update-history button.min-btn {\n        background: none;\n        border: none;\n        color: #ff4d4d;\n        font-size: 18px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 5px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: color 0.2s ease;\n        width: 20px;\n        height: 20px;\n        line-height: 20px;\n      }\n      #update-history button.min-btn:hover {\n        color: #ff6666;\n      }\n    ";
  document.head.appendChild(historyStyleElement);
  const historyPanel = document.createElement("div");
  historyPanel.id = "update-history";
  historyPanel.innerHTML =
    '\n      <h3>Update History <button class="min-btn" id="minHist">−</button></h3>\n      <div id="historyContent">\n        <ul>\n          <li>v1.1 - Added built-in ad blocker, removed boost trail, spoofing for username, keybind selector for auto spin, added settings GUI, added shift keybind to toogle all panels.</li>\n          <li>v1.0 - Initial release with auto chat, auto-spin, special character bypass, and thresher super boost, no-zoom limit is automatically enabled.</li>\n        </ul>\n      </div>\n    ';
  document.body.appendChild(historyPanel);
  const minHistBtn = historyPanel.querySelector("#minHist");
  const historyContent = historyPanel.querySelector("#historyContent");
  let isHidden = false;
  minHistBtn.onclick = (toggleEvent) => {
    toggleEvent.stopPropagation();
    isHidden = !isHidden;
    historyContent.style.display = isHidden ? "none" : "block";
    historyPanel.style.height = isHidden ? "50px" : "auto";
    minHistBtn.textContent = isHidden ? "+" : "−";
  };
  let offsetX;
  let offsetY;
  let isDraggingHistory = false;
  let isActive = false;
  historyPanel.addEventListener("mousedown", (clickEvent) => {
    if (
      ["BUTTON", "INPUT", "TEXTAREA", "A"].includes(clickEvent.target.tagName)
    ) {
      return;
    }
    isDraggingHistory = true;
    isActive = false;
    offsetX = clickEvent.clientX - historyPanel.getBoundingClientRect().left;
    offsetY = clickEvent.clientY - historyPanel.getBoundingClientRect().top;
    historyPanel.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - clickEvent.clientX;
      const deltaY = mouseEvent.clientY - clickEvent.clientY;
      if (!isActive && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isActive = true;
      }
      if (isDraggingHistory) {
        historyPanel.style.left = mouseEvent.clientX - offsetX + "px";
        historyPanel.style.top = mouseEvent.clientY - offsetY + "px";
        historyPanel.style.bottom = "auto";
        historyPanel.style.right = "auto";
      }
    };
    const stopDraggingTools = () => {
      isDraggingHistory = false;
      historyPanel.style.transition = "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopDraggingTools);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopDraggingTools);
  });
  historyPanel.addEventListener("click", (event) => {
    if (isActive) {
      event.stopImmediatePropagation();
    }
  });
  return historyPanel;
}
function createToolsPanel() {
  const toolsStyleElement = document.createElement("style");
  toolsStyleElement.textContent =
    "\n      #deep-tools-panel {\n        font-family: 'Segoe UI', sans-serif;\n        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);\n        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);\n        border: 1px solid #333;\n        background: linear-gradient(to bottom, #0f0f0f, #1a1a1a);\n      }\n      #deep-tools-panel:hover {\n        transform: translateY(-2px);\n        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);\n      }\n      #deep-tools-panel textarea {\n        background: #1a1a1a;\n        border: 1px solid #333;\n        color: #eee;\n        border-radius: 6px;\n        padding: 8px;\n        transition: border-color 0.2s;\n        font-size: 13px;\n      }\n      #deep-tools-panel textarea:focus {\n        outline: none;\n        border-color: #ff4d4d;\n        box-shadow: 0 0 0 2px rgba(255,77,77,0.3);\n      }\n      #deep-tools-panel input[type=\"number\"] {\n        background: #1a1a1a;\n        border: 1px solid #333;\n        color: #eee;\n        border-radius: 4px;\n        padding: 4px;\n        width: 60px;\n        text-align: center;\n      }\n      #deep-tools-panel button {\n        background: linear-gradient(to bottom, #222, #111);\n        color: #ff4d4d;\n        border: 1px solid #444;\n        border-radius: 6px;\n        padding: 8px 0;\n        font-weight: 600;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n      }\n      #deep-tools-panel button:hover:not(:disabled) {\n        background: linear-gradient(to bottom, #2a2a2a, #1a1a1a);\n        border-color: #ff4d4d;\n        transform: translateY(-1px);\n        box-shadow: 0 4px 8px rgba(255,77,77,0.3);\n      }\n      #deep-tools-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);\n      }\n      #deep-tools-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #deep-tools-panel button.min-btn {\n        background: none;\n        border: none;\n        color: #ff4d4d;\n        font-size: 18px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 5px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: color 0.2s ease;\n        width: 20px;\n        height: 20px;\n        line-height: 20px;\n      }\n      #deep-tools-panel button.min-btn:hover {\n        color: #ff6666;\n      }\n      #deep-tools-panel .credits {\n        margin-top: 10px;\n        font-size: 10px;\n        color: #777;\n        line-height: 1.3;\n      }\n      #deep-tools-panel .auto-chat-controls {\n        display: flex;\n        gap: 5px;\n        margin-bottom: 8px;\n        align-items: center;\n        justify-content: center;\n      }\n      #deep-tools-panel .spin-keybind {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        margin-bottom: 8px;\n        font-size: 12px;\n      }\n      #deep-tools-panel .spin-keybind label {\n        color: #eee;\n      }\n      #deep-tools-panel #spinKeyInput {\n        background: #1a1a1a;\n        border: 1px solid #333;\n        color: #eee;\n        border-radius: 4px;\n        padding: 4px;\n        width: 50px;\n        text-align: center;\n      }\n      #aim-overlay, #ctrl-overlay {\n        z-index: 10000 !important;\n      }\n      div.game {\n        position: relative;\n      }\n      /* Ad Removal */\n      div.sidebar.left > div.ad-block {\n        opacity: 0 !important;\n        pointer-events: none !important;\n        display: none !important;\n      }\n      div.sidebar.left > a {\n        display: none !important;\n      }\n      div.sidebar.left {\n        max-width: 30vw;\n        width: 21rem;\n        bottom: 0 !important;\n      }\n    ";
  document.head.appendChild(toolsStyleElement);
  const toolsPanel = document.createElement("div");
  toolsPanel.id = "deep-tools-panel";
  toolsPanel.style.position = "fixed";
  toolsPanel.style.bottom = "20px";
  toolsPanel.style.right = "20px";
  toolsPanel.style.color = "#e0e0e0";
  toolsPanel.style.padding = "14px";
  toolsPanel.style.borderRadius = "12px";
  toolsPanel.style.fontSize = "14px";
  toolsPanel.style.zIndex = "99999";
  toolsPanel.style.userSelect = "none";
  toolsPanel.style.width = "220px";
  toolsPanel.style.textAlign = "center";
  toolsPanel.style.cursor = "move";
  toolsPanel.style.overflow = "hidden";
  toolsPanel.innerHTML =
    '\n      <div style="font-weight:700; margin-bottom:10px; color:#ff4d4d; text-shadow: 0 0 8px rgba(255,77,77,0.3); position: relative; height: 40px; line-height: 40px; padding-right: 25px;">\n        ASTRAPHOBIA CLIENT\n        <button class="min-btn" id="minPanel">−</button>\n      </div>\n      <div id="panelContent">\n        <textarea id="chatMsg" placeholder="Type message..." style="width:100%; height:45px; margin-bottom:10px; resize:none;"></textarea>\n        <button id="sendBtn" style="width:100%; margin-bottom:8px;">Send Typed Chat</button>\n        <div class="auto-chat-controls">\n          <input type="number" id="delayInput" min="1" max="300" value="10" style="margin-right:5px;">\n          <span style="font-size:12px;">sec</span>\n        </div>\n        <button id="autoChatBtn" style="width:100%; margin-bottom:8px;">Enable Auto Chat</button>\n        <button id="patchBtn" style="width:100%; margin-bottom:8px;">Enable Special Characters(in chat/clan/name)</button>\n        <button id="spoofBtn" style="width:100%; margin-bottom:8px;">Spoof Username:Random Unicode Name(ban decrease)</button>\n        <button id="spinBtn" style="width:100%; margin-bottom:8px;">Enable Auto Spin</button>\n        <div class="spin-keybind">\n          <label for="spinKeyInput">Keybind:</label>\n          <input type="text" id="spinKeyInput" placeholder="Press key..." readonly>\n        </div>\n        <div class="credits">\n          Coder: Astraphobia<br>\n          Owner: Astraphobia<br>\n          Designer: Astraphobia<br>\n          Tester: Astraphobia\n        </div>\n      </div>\n    ';
  document.body.appendChild(toolsPanel);
  const minPanel = toolsPanel.querySelector("#minPanel");
  const panelContent = toolsPanel.querySelector("#panelContent");
  let isHidden = false;
  minPanel.onclick = (event) => {
    event.stopPropagation();
    isHidden = !isHidden;
    panelContent.style.display = isHidden ? "none" : "block";
    toolsPanel.style.height = isHidden ? "50px" : "auto";
    minPanel.textContent = isHidden ? "+" : "−";
  };
  toolsPanel.querySelector("#sendBtn").onclick = () => {
    const chatMessage = toolsPanel.querySelector("#chatMsg").value;
    if (chatMessage) {
      autoTypeChat(chatMessage);
    }
  };
  const spoofBtn = toolsPanel.querySelector("#patchBtn");
  spoofBtn.onclick = () => setupTextEncoderHook(spoofBtn);
  const spoofBtn_2 = toolsPanel.querySelector("#spoofBtn");
  spoofBtn_2.onclick = () => {
    const generatedValue = generateRandomString(8);
    if (simulateTyping(".play-game .el-input__inner", generatedValue)) {
      showToast("Spoofed name!");
    } else if (simulateTyping(".new-tribe .el-input__inner", generatedValue)) {
      showToast("Spoofed tribe name!");
    } else {
      showToast("No name input found! Enable special characters first.");
    }
  };
  const autoChatBtn = toolsPanel.querySelector("#spinBtn");
  autoChatBtn.onclick = () => {
    toggleMouseSimulation();
    if (featuresentitytrailState.entityTrailInterval_2) {
      autoChatBtn.textContent = "Disable Auto Spin";
      autoChatBtn.style.color = "#4dff4d";
    } else {
      autoChatBtn.textContent = "Enable Auto Spin";
      autoChatBtn.style.color = "#ff4d4d";
    }
  };
  const spinKeyInput = toolsPanel.querySelector("#spinKeyInput");
  let lastPressedKey = null;
  spinKeyInput.addEventListener("keydown", (keyboardEvent) => {
    keyboardEvent.preventDefault();
    lastPressedKey = keyboardEvent.code || keyboardEvent.key;
    spinKeyInput.value = lastPressedKey.replace("Key", "").toLowerCase();
  });
  document.addEventListener("keydown", (keyEvent) => {
    if (
      lastPressedKey &&
      keyEvent.code === lastPressedKey &&
      !keyEvent.target.matches("input, textarea, button")
    ) {
      keyEvent.preventDefault();
      toggleMouseSimulation();
      if (featuresentitytrailState.entityTrailInterval_2) {
        autoChatBtn.textContent = "Disable Auto Spin";
        autoChatBtn.style.color = "#4dff4d";
      } else {
        autoChatBtn.textContent = "Enable Auto Spin";
        autoChatBtn.style.color = "#ff4d4d";
      }
    }
  });
  const autoChatBtn_2 = toolsPanel.querySelector("#autoChatBtn");
  autoChatBtn_2.onclick = () => {
    const chatMessageText = toolsPanel.querySelector("#chatMsg").value;
    const delayInput = toolsPanel.querySelector("#delayInput");
    const delayValue = parseInt(delayInput.value) || 10;
    if (!chatMessageText) {
      showToast("⚠️ Enter a message first!");
      return;
    }
    if (state.isToggled) {
      stopInterval();
      autoChatBtn_2.textContent = "Enable Auto Chat";
      autoChatBtn_2.style.color = "#ff4d4d";
    } else {
      startScheduledTask(chatMessageText, delayValue);
      autoChatBtn_2.textContent = "Disable Auto Chat";
      autoChatBtn_2.style.color = "#4dff4d";
    }
  };
  let offsetX;
  let offsetY;
  let isDraggingTools = false;
  let isActive = false;
  toolsPanel.addEventListener("mousedown", (uiEvent) => {
    if (
      uiEvent.target.tagName === "BUTTON" ||
      uiEvent.target.tagName === "TEXTAREA" ||
      uiEvent.target.tagName === "INPUT" ||
      uiEvent.target.classList.contains("credits")
    ) {
      return;
    }
    isDraggingTools = true;
    isActive = false;
    offsetX = uiEvent.clientX - toolsPanel.getBoundingClientRect().left;
    offsetY = uiEvent.clientY - toolsPanel.getBoundingClientRect().top;
    toolsPanel.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - uiEvent.clientX;
      const deltaY = mouseEvent.clientY - uiEvent.clientY;
      if (!isActive && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isActive = true;
      }
      if (isDraggingTools) {
        toolsPanel.style.left = mouseEvent.clientX - offsetX + "px";
        toolsPanel.style.top = mouseEvent.clientY - offsetY + "px";
        toolsPanel.style.bottom = "auto";
        toolsPanel.style.right = "auto";
      }
    };
    const stopDraggingTools = () => {
      isDraggingTools = false;
      toolsPanel.style.transition = "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopDraggingTools);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopDraggingTools);
  });
  toolsPanel.addEventListener("click", (propagationEvent) => {
    if (isActive) {
      propagationEvent.stopImmediatePropagation();
    }
  });
  return toolsPanel;
}
function initPlusPanel() {
  const plusStyle = document.createElement("style");
  plusStyle.textContent =
    "\n      #plus-panel {\n        font-family: 'Segoe UI', sans-serif;\n        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);\n        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);\n        border: 1px solid #333;\n        background: linear-gradient(to bottom, #0f0f0f, #1a1a1a);\n      }\n      #plus-panel:hover {\n        transform: translateY(-2px);\n        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);\n      }\n      #plus-panel textarea {\n        background: #1a1a1a;\n        border: 1px solid #333;\n        color: #eee;\n        border-radius: 6px;\n        padding: 8px;\n        transition: border-color 0.2s;\n        font-size: 13px;\n      }\n      #plus-panel textarea:focus {\n        outline: none;\n        border-color: #ff4d4d;\n        box-shadow: 0 0 0 2px rgba(255,77,77,0.3);\n      }\n      #plus-panel input[type=\"number\"] {\n        background: #1a1a1a;\n        border: 1px solid #333;\n        color: #eee;\n        border-radius: 4px;\n        padding: 4px;\n        width: 60px;\n        text-align: center;\n      }\n      #plus-panel button {\n        background: linear-gradient(to bottom, #222, #111);\n        color: #ff4d4d;\n        border: 1px solid #444;\n        border-radius: 6px;\n        padding: 8px 0;\n        font-weight: 600;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        width: 100%;\n        margin-bottom: 8px;\n      }\n      #plus-panel button:hover:not(:disabled) {\n        background: linear-gradient(to bottom, #2a2a2a, #1a1a1a);\n        border-color: #ff4d4d;\n        transform: translateY(-1px);\n        box-shadow: 0 4px 8px rgba(255,77,77,0.3);\n      }\n      #plus-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);\n      }\n      #plus-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #plus-panel button.min-btn {\n        background: none;\n        border: none;\n        color: #ff4d4d;\n        font-size: 18px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 5px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: color 0.2s ease;\n        width: 20px;\n        height: 20px;\n        line-height: 20px;\n      }\n      #plus-panel button.min-btn:hover {\n        color: #ff6666;\n      }\n    ";
  document.head.appendChild(plusStyle);
  const plusPanelElement = document.createElement("div");
  plusPanelElement.id = "plus-panel";
  plusPanelElement.style.position = "fixed";
  plusPanelElement.style.top = "20px";
  plusPanelElement.style.right = "20px";
  plusPanelElement.style.color = "#e0e0e0";
  plusPanelElement.style.padding = "14px";
  plusPanelElement.style.borderRadius = "12px";
  plusPanelElement.style.fontSize = "14px";
  plusPanelElement.style.zIndex = "99999";
  plusPanelElement.style.userSelect = "none";
  plusPanelElement.style.width = "220px";
  plusPanelElement.style.textAlign = "center";
  plusPanelElement.style.cursor = "move";
  plusPanelElement.style.overflow = "hidden";
  plusPanelElement.innerHTML =
    '\n      <div style="font-weight:700; margin-bottom:10px; color:#ff4d4d; text-shadow: 0 0 8px rgba(255,77,77,0.3); position: relative; height: 40px; line-height: 40px; padding-right: 25px;">\n        ASTRAPHOBIA CLIENT\n        <button class="min-btn" id="minPlus">−</button>\n      </div>\n      <div id="plusContent">\n        <button id="thresherBtn">Enable Thresher Super Boost(ctrl + shift and click)(minumum required 2 boost)</button>\n      </div>\n    ';
  document.body.appendChild(plusPanelElement);
  const minPlusBtn = plusPanelElement.querySelector("#minPlus");
  const plusContent = plusPanelElement.querySelector("#plusContent");
  let isHidden = false;
  minPlusBtn.onclick = (eventHandler) => {
    eventHandler.stopPropagation();
    isHidden = !isHidden;
    plusContent.style.display = isHidden ? "none" : "block";
    plusPanelElement.style.height = isHidden ? "50px" : "auto";
    minPlusBtn.textContent = isHidden ? "+" : "−";
  };
  const thresherBtn = plusPanelElement.querySelector("#thresherBtn");
  thresherBtn.onclick = () => {
    if (isProcessed_3) {
      showToast("Thresher Super Boost is already active!");
      return;
    }
    initHooks();
    thresherBtn.textContent = "Thresher Super Boost Active";
    thresherBtn.style.color = "#4dff4d";
    thresherBtn.disabled = true;
  };
  let offsetX;
  let offsetY;
  let isDraggingPlusPanel = false;
  let isActive = false;
  plusPanelElement.addEventListener("mousedown", (clickEvent) => {
    if (
      clickEvent.target.tagName === "BUTTON" ||
      clickEvent.target.tagName === "TEXTAREA" ||
      clickEvent.target.tagName === "INPUT" ||
      clickEvent.target.classList.contains("credits")
    ) {
      return;
    }
    isDraggingPlusPanel = true;
    isActive = false;
    offsetX =
      clickEvent.clientX - plusPanelElement.getBoundingClientRect().left;
    offsetY = clickEvent.clientY - plusPanelElement.getBoundingClientRect().top;
    plusPanelElement.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - clickEvent.clientX;
      const deltaY = mouseEvent.clientY - clickEvent.clientY;
      if (!isActive && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isActive = true;
      }
      if (isDraggingPlusPanel) {
        plusPanelElement.style.left = mouseEvent.clientX - offsetX + "px";
        plusPanelElement.style.top = mouseEvent.clientY - offsetY + "px";
        plusPanelElement.style.bottom = "auto";
        plusPanelElement.style.right = "auto";
      }
    };
    const stopDraggingTools = () => {
      isDraggingPlusPanel = false;
      plusPanelElement.style.transition =
        "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopDraggingTools);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopDraggingTools);
  });
  plusPanelElement.addEventListener("click", (inputEvent) => {
    if (isActive) {
      inputEvent.stopImmediatePropagation();
    }
  });
  return plusPanelElement;
}
function initSettingsPanel() {
  const settingsStyle = document.createElement("style");
  settingsStyle.textContent =
    "\n      #settings-panel {\n        font-family: 'Segoe UI', sans-serif;\n        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);\n        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);\n        border: 1px solid #333;\n        background: linear-gradient(to bottom, #0f0f0f, #1a1a1a);\n        position: fixed;\n        top: 20px;\n        left: 20px;\n        color: #e0e0e0;\n        padding: 14px;\n        border-radius: 12px;\n        font-size: 14px;\n        z-index: 99999;\n        user-select: none;\n        width: 220px;\n        text-align: center;\n        cursor: move;\n        overflow: hidden;\n      }\n      #settings-panel:hover {\n        transform: translateY(-2px);\n        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);\n      }\n      #settings-panel button {\n        background: linear-gradient(to bottom, #222, #111);\n        color: #ff4d4d;\n        border: 1px solid #444;\n        border-radius: 6px;\n        padding: 8px 0;\n        font-weight: 600;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        width: 100%;\n        margin-bottom: 8px;\n      }\n      #settings-panel button:hover:not(:disabled) {\n        background: linear-gradient(to bottom, #2a2a2a, #1a1a1a);\n        border-color: #ff4d4d;\n        transform: translateY(-1px);\n        box-shadow: 0 4px 8px rgba(255,77,77,0.3);\n      }\n      #settings-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);\n      }\n      #settings-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #settings-panel button.min-btn {\n        background: none;\n        border: none;\n        color: #ff4d4d;\n        font-size: 18px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 5px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: color 0.2s ease;\n        width: 20px;\n        height: 20px;\n        line-height: 20px;\n      }\n      #settings-panel button.min-btn:hover {\n        color: #ff6666;\n      }\n      #settings-panel .keybind-set {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        margin-bottom: 8px;\n        font-size: 12px;\n      }\n      #settings-panel .keybind-set label {\n        color: #eee;\n      }\n      #settings-panel #toggleKeyInput {\n        background: #1a1a1a;\n        border: 1px solid #333;\n        color: #eee;\n        border-radius: 4px;\n        padding: 4px;\n        width: 80px;\n        text-align: center;\n      }\n    ";
  document.head.appendChild(settingsStyle);
  const settingsPanelElement = document.createElement("div");
  settingsPanelElement.id = "settings-panel";
  settingsPanelElement.innerHTML =
    '\n      <div style="font-weight:700; margin-bottom:10px; color:#ff4d4d; text-shadow: 0 0 8px rgba(255,77,77,0.3); position: relative; height: 40px; line-height: 40px; padding-right: 25px;">\n        SETTINGS\n        <button class="min-btn" id="minSettings">−</button>\n      </div>\n      <div id="settingsContent">\n        <div class="keybind-set">\n          <label for="toggleKeyInput">Toggle Client:</label>\n          <input type="text" id="toggleKeyInput" placeholder="Press key..." readonly>\n        </div>\n      </div>\n    ';
  document.body.appendChild(settingsPanelElement);
  const minSettingsBtn = settingsPanelElement.querySelector("#minSettings");
  const settingsContent =
    settingsPanelElement.querySelector("#settingsContent");
  let isHidden = false;
  minSettingsBtn.onclick = (toggleEvent) => {
    toggleEvent.stopPropagation();
    isHidden = !isHidden;
    settingsContent.style.display = isHidden ? "none" : "block";
    settingsPanelElement.style.height = isHidden ? "50px" : "auto";
    minSettingsBtn.textContent = isHidden ? "+" : "−";
  };
  const toggleKeyInput = settingsPanelElement.querySelector("#toggleKeyInput");
  toggleKeyInput.value = state.activeKey;
  toggleKeyInput.addEventListener("keydown", (keyEvent) => {
    keyEvent.preventDefault();
    state.activeKey = keyEvent.key;
    toggleKeyInput.value = state.activeKey;
  });
  let offsetX;
  let offsetY;
  let isDraggingSettingsPanel = false;
  let isActive = false;
  settingsPanelElement.addEventListener("mousedown", (clickEvent) => {
    if (
      clickEvent.target.tagName === "BUTTON" ||
      clickEvent.target.tagName === "INPUT" ||
      clickEvent.target.classList.contains("credits")
    ) {
      return;
    }
    isDraggingSettingsPanel = true;
    isActive = false;
    offsetX =
      clickEvent.clientX - settingsPanelElement.getBoundingClientRect().left;
    offsetY =
      clickEvent.clientY - settingsPanelElement.getBoundingClientRect().top;
    settingsPanelElement.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - clickEvent.clientX;
      const deltaY = mouseEvent.clientY - clickEvent.clientY;
      if (!isActive && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isActive = true;
      }
      if (isDraggingSettingsPanel) {
        settingsPanelElement.style.left = mouseEvent.clientX - offsetX + "px";
        settingsPanelElement.style.top = mouseEvent.clientY - offsetY + "px";
        settingsPanelElement.style.bottom = "auto";
        settingsPanelElement.style.right = "auto";
      }
    };
    const stopDraggingTools = () => {
      isDraggingSettingsPanel = false;
      settingsPanelElement.style.transition =
        "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopDraggingTools);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopDraggingTools);
  });
  settingsPanelElement.addEventListener("click", (event) => {
    if (isActive) {
      event.stopImmediatePropagation();
    }
  });
  return settingsPanelElement;
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
  createToolsPanel,
  initPlusPanel,
  initSettingsPanel,
  togglePanels,
};
