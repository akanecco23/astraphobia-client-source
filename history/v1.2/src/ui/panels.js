import { showNotification } from "./interaction.js";
import { setupAntiDetection } from "../features/antidetection.js";
import {
  radius,
  isInitialized,
  isInitialized_2,
  applyGameHacks,
  coreSharedState,
} from "../core.js";
import { createDeepToolsPanel } from "../features/chat.js";
import { applyCustomBackground, createSettingsStyles } from "./theme.js";
import { initAdBlocker } from "../features/adblock.js";

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
function initializePanels() {
  const mainPanelElement = createDeepToolsPanel();
  const historyPanelElement = createUpdateHistoryPanel();
  const settingsPanelElement = createSettingsStyles();
  const plusPanelElement = createPlusPanel();
  applyCustomBackground();
  initAdBlocker();
  return {
    mainPanel: mainPanelElement,
    historyPanel: historyPanelElement,
    settingsPanel: settingsPanelElement,
    plusPanel: plusPanelElement,
  };
}

export { createUpdateHistoryPanel, createPlusPanel, initializePanels };
