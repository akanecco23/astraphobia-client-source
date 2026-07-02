import {
  radius,
  initNetworkHook,
  boolIsProcessed,
  appIsProcessed,
  setupAntiDetection,
  applyGameHacks,
  state,
} from "../core.js";
import {
  simulateTyping,
  autoTypeChat,
  showNotification,
} from "./interaction.js";
import { startScheduledTask, stopInterval } from "../features/chat.js";
import { featuresentitytrailState } from "../features/entitytrail.js";
import { toggleMouseSimulation } from "../features/movement.js";
import { generateRandomString } from "../utils.js";

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
  let isHidden = false;
  minHistBtn.onclick = (v4253Event) => {
    v4253Event.stopPropagation();
    isHidden = !isHidden;
    historyContent.style.display = isHidden ? "none" : "block";
    historyPanel.style.height = isHidden ? "50px" : "auto";
    minHistBtn.textContent = isHidden ? "+" : "−";
  };
  let offsetX;
  let offsetY;
  let isActive = false;
  let v4b0aIsActive = false;
  historyPanel.addEventListener("mousedown", (dbcdEvent) => {
    if (
      ["BUTTON", "INPUT", "TEXTAREA", "A"].includes(dbcdEvent.target.tagName)
    ) {
      return;
    }
    isActive = true;
    v4b0aIsActive = false;
    offsetX = dbcdEvent.clientX - historyPanel.getBoundingClientRect().left;
    offsetY = dbcdEvent.clientY - historyPanel.getBoundingClientRect().top;
    historyPanel.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - dbcdEvent.clientX;
      const deltaY = mouseEvent.clientY - dbcdEvent.clientY;
      if (!v4b0aIsActive && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        v4b0aIsActive = true;
      }
      if (isActive) {
        historyPanel.style.left = mouseEvent.clientX - offsetX + "px";
        historyPanel.style.top = mouseEvent.clientY - offsetY + "px";
        historyPanel.style.bottom = "auto";
        historyPanel.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      isActive = false;
      historyPanel.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
  historyPanel.addEventListener("click", (v2e7fEvent) => {
    if (v4b0aIsActive) {
      v2e7fEvent.stopImmediatePropagation();
    }
  });
  return historyPanel;
}
function createDeepToolsPanel() {
  const deepToolsStyle = document.createElement("style");
  deepToolsStyle.textContent =
    "\n      #deep-tools-panel {\n        font-family: 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);\n        border: 1px solid #333;\n        background: #1e1e1e;\n      }\n      #deep-tools-panel:hover {\n        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);\n      }\n      #deep-tools-panel textarea {\n        background: #2d2d2d;\n        border: 1px solid #444;\n        color: #e0e0e0;\n        border-radius: 6px;\n        padding: 8px;\n        transition: border-color 0.2s;\n        font-size: 13px;\n      }\n      #deep-tools-panel textarea:focus {\n        outline: none;\n        border-color: #e74c3c;\n        box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);\n      }\n      #deep-tools-panel input[type=\"number\"] {\n        background: #2d2d2d;\n        border: 1px solid #444;\n        color: #e0e0e0;\n        border-radius: 4px;\n        padding: 4px;\n        width: 60px;\n        text-align: center;\n      }\n      #deep-tools-panel button {\n        background: #2d2d2d;\n        color: #e74c3c;\n        border: 1px solid #444;\n        border-radius: 6px;\n        padding: 8px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n      }\n      #deep-tools-panel button:hover:not(:disabled) {\n        background: #3d3d3d;\n        border-color: #e74c3c;\n        transform: translateY(-1px);\n        box-shadow: 0 2px 6px rgba(231, 76, 60, 0.2);\n      }\n      #deep-tools-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);\n      }\n      #deep-tools-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #deep-tools-panel button.min-btn {\n        background: none;\n        border: none;\n        color: #e74c3c;\n        font-size: 18px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 5px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: color 0.2s ease;\n        width: 20px;\n        height: 20px;\n        line-height: 20px;\n      }\n      #deep-tools-panel button.min-btn:hover {\n        color: #f39c12;\n      }\n      #deep-tools-panel .credits {\n        margin-top: 10px;\n        font-size: 10px;\n        color: #888;\n        line-height: 1.3;\n      }\n      #deep-tools-panel .auto-chat-controls {\n        display: flex;\n        gap: 5px;\n        margin-bottom: 8px;\n        align-items: center;\n        justify-content: center;\n      }\n      #deep-tools-panel .spin-keybind {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        margin-bottom: 8px;\n        font-size: 12px;\n      }\n      #deep-tools-panel .spin-keybind label {\n        color: #e0e0e0;\n      }\n      #deep-tools-panel #spinKeyInput {\n        background: #2d2d2d;\n        border: 1px solid #444;\n        color: #e0e0e0;\n        border-radius: 4px;\n        padding: 4px;\n        width: 50px;\n        text-align: center;\n      }\n      #aim-overlay, #ctrl-overlay {\n        z-index: 10000 !important;\n      }\n      div.game {\n        position: relative;\n      }\n      /* Ad Removal */\n      div.sidebar.left > div.ad-block {\n        opacity: 0 !important;\n        pointer-events: none !important;\n        display: none !important;\n      }\n      div.sidebar.left > a {\n        display: none !important;\n      }\n      div.sidebar.left {\n        max-width: 30vw;\n        width: 21rem;\n        bottom: 0 !important;\n      }\n    ";
  document.head.appendChild(deepToolsStyle);
  const container = document.createElement("div");
  container.id = "deep-tools-panel";
  container.style.position = "fixed";
  container.style.bottom = "20px";
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
    '\n      <div style="font-weight:600; margin-bottom:10px; color:#e74c3c; position: relative; height: 40px; line-height: 40px; padding-right: 25px;">\n        ASTRAPHOBIA CLIENT\n        <button class="min-btn" id="minPanel">−</button>\n      </div>\n      <div id="panelContent">\n        <textarea id="chatMsg" placeholder="Type message..." style="width:100%; height:45px; margin-bottom:10px; resize:none;"></textarea>\n        <button id="sendBtn" style="width:100%; margin-bottom:8px;">Send Typed Chat</button>\n        <div class="auto-chat-controls">\n          <input type="number" id="delayInput" min="1" max="300" value="10" style="margin-right:5px;">\n          <span style="font-size:12px;">sec</span>\n        </div>\n        <button id="autoChatBtn" style="width:100%; margin-bottom:8px;">Enable Auto Chat</button>\n        <button id="patchBtn" style="width:100%; margin-bottom:8px;">Enable Special Characters(in chat/clan/name)</button>\n        <button id="spoofBtn" style="width:100%; margin-bottom:8px;">Spoof Username:Random Unicode Name(ban decrease)</button>\n        <button id="spinBtn" style="width:100%; margin-bottom:8px;">Enable Auto Spin</button>\n        <div class="spin-keybind">\n          <label for="spinKeyInput">Keybind:</label>\n          <input type="text" id="spinKeyInput" placeholder="Press key..." readonly>\n        </div>\n        <div class="credits">\n          Coder: Astraphobia<br>\n          Owner/Founder: Astraphobia<br>\n          Designer/Marketer: Astraphobia<br>\n          Tester: Astraphobia\n        </div>\n      </div>\n    ';
  document.body.appendChild(container);
  const minPanel = container.querySelector("#minPanel");
  const panelContent = container.querySelector("#panelContent");
  let v3d2cIsHidden = false;
  minPanel.onclick = (v3bfaEvent) => {
    v3bfaEvent.stopPropagation();
    v3d2cIsHidden = !v3d2cIsHidden;
    panelContent.style.display = v3d2cIsHidden ? "none" : "block";
    container.style.height = v3d2cIsHidden ? "50px" : "auto";
    minPanel.textContent = v3d2cIsHidden ? "+" : "−";
  };
  container.querySelector("#sendBtn").onclick = () => {
    const chatMessage = container.querySelector("#chatMsg").value;
    if (chatMessage) {
      autoTypeChat(chatMessage);
    }
  };
  const spoofButton = container.querySelector("#patchBtn");
  spoofButton.onclick = () => initNetworkHook(spoofButton);
  const v2136SpoofButton = container.querySelector("#spoofBtn");
  v2136SpoofButton.onclick = () => {
    const maxLength = generateRandomString(8);
    if (simulateTyping(".play-game .el-input__inner", maxLength)) {
      showNotification("Spoofed name!");
    } else if (simulateTyping(".new-tribe .el-input__inner", maxLength)) {
      showNotification("Spoofed tribe name!");
    } else {
      showNotification("No name input found! Enable special characters first.");
    }
  };
  const autoChatButton = container.querySelector("#spinBtn");
  autoChatButton.onclick = () => {
    toggleMouseSimulation();
    if (featuresentitytrailState.modEntityTrailInterval) {
      autoChatButton.textContent = "Disable Auto Spin";
      autoChatButton.style.color = "#27ae60";
    } else {
      autoChatButton.textContent = "Enable Auto Spin";
      autoChatButton.style.color = "#e74c3c";
    }
  };
  const spinKeyInput = container.querySelector("#spinKeyInput");
  let lastPressedKey = null;
  spinKeyInput.addEventListener("keydown", (keyEvent) => {
    keyEvent.preventDefault();
    lastPressedKey = keyEvent.code || keyEvent.key;
    spinKeyInput.value = lastPressedKey.replace("Key", "").toLowerCase();
  });
  document.addEventListener("keydown", (v1dedEvent) => {
    if (
      lastPressedKey &&
      v1dedEvent.code === lastPressedKey &&
      !v1dedEvent.target.matches("input, textarea, button")
    ) {
      v1dedEvent.preventDefault();
      toggleMouseSimulation();
      if (featuresentitytrailState.modEntityTrailInterval) {
        autoChatButton.textContent = "Disable Auto Spin";
        autoChatButton.style.color = "#27ae60";
      } else {
        autoChatButton.textContent = "Enable Auto Spin";
        autoChatButton.style.color = "#e74c3c";
      }
    }
  });
  const v2ffaAutoChatButton = container.querySelector("#autoChatBtn");
  v2ffaAutoChatButton.onclick = () => {
    const chatMessageText = container.querySelector("#chatMsg").value;
    const delayInput = container.querySelector("#delayInput");
    const delayValue = parseInt(delayInput.value) || 10;
    if (!chatMessageText) {
      showNotification("⚠️ Enter a message first!");
      return;
    }
    if (state.IsToggled) {
      stopInterval();
      v2ffaAutoChatButton.textContent = "Enable Auto Chat";
      v2ffaAutoChatButton.style.color = "#e74c3c";
    } else {
      startScheduledTask(chatMessageText, delayValue);
      v2ffaAutoChatButton.textContent = "Disable Auto Chat";
      v2ffaAutoChatButton.style.color = "#27ae60";
    }
  };
  let v1985OffsetX;
  let v12c5OffsetY;
  let v3a7fIsActive = false;
  let v41e7IsActive = false;
  container.addEventListener("mousedown", (v1573Event) => {
    if (
      v1573Event.target.tagName === "BUTTON" ||
      v1573Event.target.tagName === "TEXTAREA" ||
      v1573Event.target.tagName === "INPUT" ||
      v1573Event.target.classList.contains("credits")
    ) {
      return;
    }
    v3a7fIsActive = true;
    v41e7IsActive = false;
    v1985OffsetX = v1573Event.clientX - container.getBoundingClientRect().left;
    v12c5OffsetY = v1573Event.clientY - container.getBoundingClientRect().top;
    container.style.transition = "none";
    const v4387HandleMouseMove = (v448cMouseEvent) => {
      const v5b68DeltaX = v448cMouseEvent.clientX - v1573Event.clientX;
      const v2a22DeltaY = v448cMouseEvent.clientY - v1573Event.clientY;
      if (
        !v41e7IsActive &&
        (Math.abs(v5b68DeltaX) > 5 || Math.abs(v2a22DeltaY) > 5)
      ) {
        v41e7IsActive = true;
      }
      if (v3a7fIsActive) {
        container.style.left = v448cMouseEvent.clientX - v1985OffsetX + "px";
        container.style.top = v448cMouseEvent.clientY - v12c5OffsetY + "px";
        container.style.bottom = "auto";
        container.style.right = "auto";
      }
    };
    const v5038HandleMouseUp = () => {
      v3a7fIsActive = false;
      container.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", v4387HandleMouseMove);
      document.removeEventListener("mouseup", v5038HandleMouseUp);
    };
    document.addEventListener("mousemove", v4387HandleMouseMove);
    document.addEventListener("mouseup", v5038HandleMouseUp);
  });
  container.addEventListener("click", (v5baaEvent) => {
    if (v41e7IsActive) {
      v5baaEvent.stopImmediatePropagation();
    }
  });
  return container;
}
function createPlusPanel() {
  const plusPanelStyle = document.createElement("style");
  plusPanelStyle.textContent =
    "\n      #plus-panel {\n        font-family: 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);\n        border: 1px solid #333;\n        background: #1e1e1e;\n      }\n      #plus-panel:hover {\n        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);\n      }\n      #plus-panel textarea {\n        background: #2d2d2d;\n        border: 1px solid #444;\n        color: #e0e0e0;\n        border-radius: 6px;\n        padding: 8px;\n        transition: border-color 0.2s;\n        font-size: 13px;\n      }\n      #plus-panel textarea:focus {\n        outline: none;\n        border-color: #e74c3c;\n        box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);\n      }\n      #plus-panel input[type=\"number\"] {\n        background: #2d2d2d;\n        border: 1px solid #444;\n        color: #e0e0e0;\n        border-radius: 4px;\n        padding: 4px;\n        width: 60px;\n        text-align: center;\n      }\n      #plus-panel button {\n        background: #2d2d2d;\n        color: #e74c3c;\n        border: 1px solid #444;\n        border-radius: 6px;\n        padding: 8px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        width: 100%;\n        margin-bottom: 8px;\n      }\n      #plus-panel button:hover:not(:disabled) {\n        background: #3d3d3d;\n        border-color: #e74c3c;\n        transform: translateY(-1px);\n        box-shadow: 0 2px 6px rgba(231, 76, 60, 0.2);\n      }\n      #plus-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);\n      }\n      #plus-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #plus-panel button.min-btn {\n        background: none;\n        border: none;\n        color: #e74c3c;\n        font-size: 18px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 5px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: color 0.2s ease;\n        width: 20px;\n        height: 20px;\n        line-height: 20px;\n      }\n      #plus-panel button.min-btn:hover {\n        color: #f39c12;\n      }\n    ";
  document.head.appendChild(plusPanelStyle);
  const v18aeContainer = document.createElement("div");
  v18aeContainer.id = "plus-panel";
  v18aeContainer.style.position = "fixed";
  v18aeContainer.style.top = "20px";
  v18aeContainer.style.right = "20px";
  v18aeContainer.style.color = "#e0e0e0";
  v18aeContainer.style.padding = "14px";
  v18aeContainer.style.borderRadius = "8px";
  v18aeContainer.style.fontSize = "14px";
  v18aeContainer.style.zIndex = "99999";
  v18aeContainer.style.userSelect = "none";
  v18aeContainer.style.width = "220px";
  v18aeContainer.style.textAlign = "center";
  v18aeContainer.style.cursor = "move";
  v18aeContainer.style.overflow = "hidden";
  v18aeContainer.innerHTML =
    '\n      <div style="font-weight:600; margin-bottom:10px; color:#e74c3c; position: relative; height: 40px; line-height: 40px; padding-right: 25px;">\n        ASTRAPHOBIA CLIENT\n        <button class="min-btn" id="minPlus">−</button>\n      </div>\n      <div id="plusContent">\n        <button id="thresherBtn">Enable Thresher Super Boost(ctrl + shift and click)(minumum required 2 boost)</button>\n        <button id="astraVisionBtn">Enable Astra-Vision (no-zoom limit, no ink flash or deep darkness)</button>\n      </div>\n    ';
  document.body.appendChild(v18aeContainer);
  const minPlusBtn = v18aeContainer.querySelector("#minPlus");
  const plusContent = v18aeContainer.querySelector("#plusContent");
  let v4e99IsHidden = false;
  minPlusBtn.onclick = (v57c7Event) => {
    v57c7Event.stopPropagation();
    v4e99IsHidden = !v4e99IsHidden;
    plusContent.style.display = v4e99IsHidden ? "none" : "block";
    v18aeContainer.style.height = v4e99IsHidden ? "50px" : "auto";
    minPlusBtn.textContent = v4e99IsHidden ? "+" : "−";
  };
  const astraVisionBtn = v18aeContainer.querySelector("#thresherBtn");
  astraVisionBtn.onclick = () => {
    if (appIsProcessed) {
      showNotification("Thresher Super Boost is already active!");
      return;
    }
    setupAntiDetection();
    astraVisionBtn.textContent = "Thresher Super Boost Active";
    astraVisionBtn.style.color = "#27ae60";
    astraVisionBtn.disabled = true;
  };
  const v3fd4AstraVisionBtn = v18aeContainer.querySelector("#astraVisionBtn");
  v3fd4AstraVisionBtn.onclick = () => {
    if (boolIsProcessed) {
      showNotification("Astra-Vision already enabled!");
      return;
    }
    setupAntiDetection();
    applyGameHacks();
    v3fd4AstraVisionBtn.textContent = "Astra-Vision Active";
    v3fd4AstraVisionBtn.style.color = "#27ae60";
    v3fd4AstraVisionBtn.disabled = true;
    showNotification(
      "👁️ Astra-Vision enabled! (zoom-limit unlocked, no ink-flash or deep darkness effects)",
    );
  };
  let v3e3bOffsetX;
  let v3748OffsetY;
  let v5540IsActive = false;
  let v5e22IsActive = false;
  v18aeContainer.addEventListener("mousedown", (clickEvent) => {
    if (
      clickEvent.target.tagName === "BUTTON" ||
      clickEvent.target.tagName === "TEXTAREA" ||
      clickEvent.target.tagName === "INPUT" ||
      clickEvent.target.classList.contains("credits")
    ) {
      return;
    }
    v5540IsActive = true;
    v5e22IsActive = false;
    v3e3bOffsetX =
      clickEvent.clientX - v18aeContainer.getBoundingClientRect().left;
    v3748OffsetY =
      clickEvent.clientY - v18aeContainer.getBoundingClientRect().top;
    v18aeContainer.style.transition = "none";
    const v1ebfHandleMouseMove = (v4a1fMouseEvent) => {
      const v5d23DeltaX = v4a1fMouseEvent.clientX - clickEvent.clientX;
      const v1c1fDeltaY = v4a1fMouseEvent.clientY - clickEvent.clientY;
      if (
        !v5e22IsActive &&
        (Math.abs(v5d23DeltaX) > 5 || Math.abs(v1c1fDeltaY) > 5)
      ) {
        v5e22IsActive = true;
      }
      if (v5540IsActive) {
        v18aeContainer.style.left =
          v4a1fMouseEvent.clientX - v3e3bOffsetX + "px";
        v18aeContainer.style.top =
          v4a1fMouseEvent.clientY - v3748OffsetY + "px";
        v18aeContainer.style.bottom = "auto";
        v18aeContainer.style.right = "auto";
      }
    };
    const v1767HandleMouseUp = () => {
      v5540IsActive = false;
      v18aeContainer.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", v1ebfHandleMouseMove);
      document.removeEventListener("mouseup", v1767HandleMouseUp);
    };
    document.addEventListener("mousemove", v1ebfHandleMouseMove);
    document.addEventListener("mouseup", v1767HandleMouseUp);
  });
  v18aeContainer.addEventListener("click", (v33cbKeyboardEvent) => {
    if (v5e22IsActive) {
      v33cbKeyboardEvent.stopImmediatePropagation();
    }
  });
  return v18aeContainer;
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
