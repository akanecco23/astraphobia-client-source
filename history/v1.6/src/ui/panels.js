import {
  radius,
  config,
  hookTextEncoder,
  isProcessed_skx,
  initAutoFarm,
  initializeAntiDetection,
  initializeViewportSettings,
  angle,
  state,
} from "../core.js";
import {
  toggleEsp,
  trackPlayer,
  toggleEsp_sdk,
  toggleEsp_sl9,
  toggleMinimapSize,
} from "../features/esp.js";
import {
  startScheduledTask,
  stopInterval,
  simulateChatInput,
} from "../features/chat.js";
import { generatePatrolPoints, stopAutoFarm } from "../features/autofarm.js";
import { featuresentitytrailState } from "../features/entitytrail.js";
import { toggleMouseSimulation } from "../features/movement.js";
import { enableAutoDodge } from "../features/aimbot.js";
import { applyTheme, initBackground } from "./theme.js";
import { showToast, typeText } from "./interaction.js";
import { generateRandomString } from "../utils.js";

function showHalloweenModal(config) {
  const modalContainer = document.createElement("div");
  modalContainer.id = "halloween-code-modal";
  modalContainer.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:100001;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s ease;";
  modalContainer.innerHTML =
    '\n      <div style="background:#1a1a1a;padding:32px;border-radius:8px;text-align:center;max-width:400px;width:90%;border:1px solid #333;">\n        <div style="color:#e0e0e0;font-size:18px;font-weight:600;margin-bottom:16px;font-family:\'Segoe UI\',system-ui,sans-serif;">Halloween Access Code</div>\n        <p style="color:#888;margin:0 0 16px 0;font-size:13px;font-family:\'Segoe UI\',system-ui,sans-serif;">Enter the code to unlock the Halloween theme</p>\n        <input id="hwCodeInput" type="text" placeholder="Enter code..." style="background:#111;border:1px solid #333;color:#e0e0e0;border-radius:4px;padding:10px;font-size:14px;text-align:center;width:100%;box-sizing:border-box;margin-bottom:16px;outline:none;font-family:\'Segoe UI\',system-ui,sans-serif;">\n        <div style="display:flex;gap:8px;">\n          <button id="hwCancelBtn" style="flex:1;background:#222;color:#888;border:1px solid #333;border-radius:4px;padding:10px;cursor:pointer;font-size:13px;font-family:\'Segoe UI\',system-ui,sans-serif;">Cancel</button>\n          <button id="hwSubmitBtn" style="flex:1;background:#ff6600;color:#fff;border:none;border-radius:4px;padding:10px;cursor:pointer;font-size:13px;font-weight:600;font-family:\'Segoe UI\',system-ui,sans-serif;">Redeem</button>\n        </div>\n      </div>\n    ';
  document.body.appendChild(modalContainer);
  setTimeout(() => {
    modalContainer.style.opacity = "1";
  }, 10);
  const codeInput = modalContainer.querySelector("#hwCodeInput");
  const closeModal = () => {
    modalContainer.style.opacity = "0";
    setTimeout(() => modalContainer.remove(), 300);
  };
  modalContainer.querySelector("#hwSubmitBtn").onclick = () => {
    const inputCode = codeInput.value.trim();
    if (inputCode === "HappyHalloween9" || inputCode === "TrickOrTreat9") {
      localStorage.setItem("halloweenUnlocked", "true");
      showToast("Halloween theme unlocked");
      closeModal();
      config(true);
    } else {
      codeInput.style.borderColor = "#ff0000";
      setTimeout(() => {
        codeInput.style.borderColor = "#333";
      }, 500);
      showToast("Invalid code");
    }
  };
  modalContainer.querySelector("#hwCancelBtn").onclick = () => {
    closeModal();
    config(false);
  };
  codeInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      modalContainer.querySelector("#hwSubmitBtn").click();
    }
  });
  codeInput.focus();
}
function makeDraggable(element) {
  let offsetX;
  let offsetY;
  let isDragging = false;
  let hasMoved = false;
  element.addEventListener("mousedown", (event) => {
    if (
      ["BUTTON", "INPUT", "TEXTAREA", "SELECT", "A", "LABEL"].includes(
        event.target.tagName,
      )
    ) {
      return;
    }
    if (event.target.closest("button, input, textarea, select, label")) {
      return;
    }
    isDragging = true;
    hasMoved = false;
    offsetX = event.clientX - element.getBoundingClientRect().left;
    offsetY = event.clientY - element.getBoundingClientRect().top;
    element.style.transition = "none";
    const handleMouseMove = (event) => {
      if (
        !hasMoved &&
        (Math.abs(event.clientX - event.clientX) > 5 ||
          Math.abs(event.clientY - event.clientY) > 5)
      ) {
        hasMoved = true;
      }
      if (isDragging) {
        element.style.left = event.clientX - offsetX + "px";
        element.style.top = event.clientY - offsetY + "px";
        element.style.bottom = "auto";
        element.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      isDragging = false;
      element.style.transition = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
  element.addEventListener("click", (event_a8f) => {
    if (hasMoved) {
      event_a8f.stopImmediatePropagation();
    }
  });
}
function createToolsPanel() {
  const panelElement = document.createElement("div");
  panelElement.id = "deep-tools-panel";
  panelElement.className = "ast-panel";
  panelElement.style.cssText = "bottom:20px;right:20px;width:230px;";
  panelElement.innerHTML =
    '\n      <div class="ast-header">\n        <span class="ast-header-title">Astraphobia Client</span>\n        <button class="ast-header-min" id="mainMin">−</button>\n      </div>\n      <div class="ast-body" id="mainBody">\n        <span class="ast-section-label">Chat</span>\n        <textarea class="ast-textarea" id="chatMsg" placeholder="Message..." rows="2"></textarea>\n        <button class="ast-btn" id="sendBtn">Send Chat</button>\n        <div class="ast-row" style="margin-top:4px;">\n          <input class="ast-input" type="number" id="delayInput" min="1" max="300" value="10" style="width:50px;text-align:center;">\n          <span style="font-size:11px;color:#888;">sec</span>\n          <button class="ast-btn" id="autoChatBtn" style="flex:1;margin-bottom:0;">Auto Chat</button>\n        </div>\n\n        <div class="ast-sep"></div>\n        <span class="ast-section-label">Tools</span>\n        <button class="ast-btn" id="patchBtn">Special Characters</button>\n        <button class="ast-btn" id="spoofBtn">Spoof Username</button>\n        <button class="ast-btn" id="spinBtn">Auto Spin</button>\n\n        <div class="ast-key-row">\n          <span>Spin key</span>\n          <input class="ast-key-capture" id="spinKeyInput" type="text" placeholder="..." readonly>\n        </div>\n\n        <div class="ast-sep"></div>\n        <span class="ast-section-label">Turn Controls</span>\n        <div class="ast-key-row">\n          <span>Turn Left</span>\n          <input class="ast-key-capture" id="turnLeftKeyInput" type="text" value="Q" readonly>\n        </div>\n        <div class="ast-key-row">\n          <span>Turn Right</span>\n          <input class="ast-key-capture" id="turnRightKeyInput" type="text" value="E" readonly>\n        </div>\n\n        <div class="ast-sep"></div>\n        <div class="ast-credits">\n          Made by Astraphobia\n        </div>\n      </div>\n    ';
  document.body.appendChild(panelElement);
  const mainBody = panelElement.querySelector("#mainBody");
  let isHidden = false;
  panelElement.querySelector("#mainMin").onclick = (event) => {
    event.stopPropagation();
    isHidden = !isHidden;
    mainBody.style.display = isHidden ? "none" : "block";
    panelElement.querySelector("#mainMin").textContent = isHidden ? "+" : "−";
  };
  panelElement.querySelector("#sendBtn").onclick = () => {
    const chatMessage = panelElement.querySelector("#chatMsg").value;
    if (chatMessage) {
      simulateChatInput(chatMessage);
    }
  };
  const spinBtn = panelElement.querySelector("#autoChatBtn");
  spinBtn.onclick = () => {
    const messageText = panelElement.querySelector("#chatMsg").value;
    const delayValue =
      parseInt(panelElement.querySelector("#delayInput").value) || 10;
    if (!messageText) {
      showToast("Enter a message first");
      return;
    }
    if (state.isToggled) {
      stopInterval();
      spinBtn.textContent = "Auto Chat";
      spinBtn.classList.remove("toggle-on");
    } else {
      startScheduledTask(messageText, delayValue);
      spinBtn.textContent = "Stop Chat";
      spinBtn.classList.add("toggle-on");
    }
  };
  const patchBtn = panelElement.querySelector("#patchBtn");
  patchBtn.onclick = () => {
    hookTextEncoder();
    patchBtn.textContent = "Special Chars Active";
    patchBtn.disabled = true;
    patchBtn.classList.add("toggle-on");
  };
  panelElement.querySelector("#spoofBtn").onclick = () => {
    const randomString = generateRandomString(8);
    if (typeText(".play-game .el-input__inner", randomString)) {
      showToast("Name spoofed");
    } else if (typeText(".new-tribe .el-input__inner", randomString)) {
      showToast("Tribe name spoofed");
    } else {
      showToast("No name input found");
    }
  };
  const spinBtn_jno = panelElement.querySelector("#spinBtn");
  spinBtn_jno.onclick = () => {
    toggleMouseSimulation();
    if (featuresentitytrailState.entityTrailInterval_rfg) {
      spinBtn_jno.textContent = "Stop Spin";
      spinBtn_jno.classList.add("toggle-on");
    } else {
      spinBtn_jno.textContent = "Auto Spin";
      spinBtn_jno.classList.remove("toggle-on");
    }
  };
  const turnRightKeyInput = panelElement.querySelector("#spinKeyInput");
  let lastPressedKey = null;
  turnRightKeyInput.addEventListener("keydown", (keyEvent) => {
    keyEvent.preventDefault();
    lastPressedKey = keyEvent.code || keyEvent.key;
    turnRightKeyInput.value = lastPressedKey.replace("Key", "").toUpperCase();
  });
  document.addEventListener("keydown", (keyboardEvent) => {
    if (
      lastPressedKey &&
      keyboardEvent.code === lastPressedKey &&
      !keyboardEvent.target.matches("input,textarea,button,select")
    ) {
      keyboardEvent.preventDefault();
      toggleMouseSimulation();
      if (featuresentitytrailState.entityTrailInterval_rfg) {
        spinBtn_jno.textContent = "Stop Spin";
        spinBtn_jno.classList.add("toggle-on");
      } else {
        spinBtn_jno.textContent = "Auto Spin";
        spinBtn_jno.classList.remove("toggle-on");
      }
    }
  });
  const turnRightKeyInput_hid = panelElement.querySelector("#turnLeftKeyInput");
  const turnRightKeyInput_ij7 =
    panelElement.querySelector("#turnRightKeyInput");
  turnRightKeyInput_hid.value = state.keyQ.toUpperCase();
  turnRightKeyInput_ij7.value = state.keyE.toUpperCase();
  turnRightKeyInput_hid.addEventListener("keydown", (uiEvent) => {
    uiEvent.preventDefault();
    uiEvent.stopPropagation();
    state.keyQ = uiEvent.key;
    turnRightKeyInput_hid.value =
      uiEvent.key.length === 1 ? uiEvent.key.toUpperCase() : uiEvent.key;
  });
  turnRightKeyInput_ij7.addEventListener("keydown", (inputEvent) => {
    inputEvent.preventDefault();
    inputEvent.stopPropagation();
    state.keyE = inputEvent.key;
    turnRightKeyInput_ij7.value =
      inputEvent.key.length === 1
        ? inputEvent.key.toUpperCase()
        : inputEvent.key;
  });
  makeDraggable(panelElement);
  return panelElement;
}
function createPlusPanel() {
  const plusPanel = document.createElement("div");
  plusPanel.id = "plus-panel";
  plusPanel.className = "ast-panel";
  plusPanel.style.cssText = "top:20px;right:20px;width:230px;";
  plusPanel.innerHTML =
    '\n      <div class="ast-header">\n        <span class="ast-header-title">Astraphobia Client</span>\n        <button class="ast-header-min" id="plusMin">−</button>\n      </div>\n      <div class="ast-body" id="plusBody">\n        <span class="ast-section-label">Vision</span>\n        <button class="ast-btn patched" id="thresherBtn" disabled>Thresher Boost (Patched)</button>\n        <button class="ast-btn" id="astraVisionBtn">Astra-Vision</button>\n        <button class="ast-btn" id="smallMinimapBtn">Small Minimap</button>\n\n        <div class="ast-sep"></div>\n        <span class="ast-section-label">ESP</span>\n        <button class="ast-btn" id="espBtn">ESP</button>\n        <select class="ast-select" id="espModeSelect">\n          <option value="players">Players</option>\n          <option value="food">Food</option>\n        </select>\n        <button class="ast-btn" id="trackNearestBtn">Track Nearest (F3)</button>\n        <button class="ast-btn" id="untrackBtn">Untrack (F4)</button>\n\n        <div class="ast-sep"></div>\n        <span class="ast-section-label">Automation</span>\n        <button class="ast-btn" id="autoDodgeBtn">Auto Dodge</button>\n        <select class="ast-select" id="farmModeSelect">\n          <option value="nearest">Nearest Food</option>\n          <option value="cluster">Food Clusters</option>\n          <option value="patrol">Patrol Route</option>\n        </select>\n        <button class="ast-btn" id="autoFarmBtn">Auto Farm (F5)</button>\n\n        <div class="ast-toggle-row">\n          <label for="farmBoostToggle">Boost</label>\n          <div class="ast-switch">\n            <input type="checkbox" id="farmBoostToggle" checked>\n            <span class="slider"></span>\n          </div>\n        </div>\n        <div class="ast-toggle-row">\n          <label for="farmEvolveToggle">Evolve</label>\n          <div class="ast-switch">\n            <input type="checkbox" id="farmEvolveToggle" checked>\n            <span class="slider"></span>\n          </div>\n        </div>\n        <div class="ast-toggle-row">\n          <label for="farmAvoidToggle">Avoid Players</label>\n          <div class="ast-switch">\n            <input type="checkbox" id="farmAvoidToggle" checked>\n            <span class="slider"></span>\n          </div>\n        </div>\n      </div>\n    ';
  document.body.appendChild(plusPanel);
  const plusBody = plusPanel.querySelector("#plusBody");
  let isHidden = false;
  plusPanel.querySelector("#plusMin").onclick = (toggleEvent) => {
    toggleEvent.stopPropagation();
    isHidden = !isHidden;
    plusBody.style.display = isHidden ? "none" : "block";
    plusPanel.querySelector("#plusMin").textContent = isHidden ? "+" : "−";
  };
  plusPanel.querySelector("#thresherBtn").onclick = (boostEvent) => {
    boostEvent.preventDefault();
    showToast("Thresher boost has been patched");
  };
  const astraVisionBtn = plusPanel.querySelector("#astraVisionBtn");
  astraVisionBtn.onclick = () => {
    if (isProcessed_skx) {
      showToast("Already active");
      return;
    }
    initializeAntiDetection();
    initializeViewportSettings();
    astraVisionBtn.textContent = "Astra-Vision ✓";
    astraVisionBtn.classList.add("toggle-on");
    astraVisionBtn.disabled = true;
  };
  const autoDodgeBtn = plusPanel.querySelector("#smallMinimapBtn");
  autoDodgeBtn.onclick = () => {
    initializeAntiDetection();
    toggleMinimapSize();
    if (state.isToggled_sak) {
      autoDodgeBtn.textContent = "Minimap: Small";
      autoDodgeBtn.classList.add("toggle-on");
    } else {
      autoDodgeBtn.textContent = "Small Minimap";
      autoDodgeBtn.classList.remove("toggle-on");
    }
  };
  const autoDodgeBtn_w1m = plusPanel.querySelector("#espBtn");
  autoDodgeBtn_w1m.onclick = () => {
    toggleEsp();
    if (window.espEnabled) {
      autoDodgeBtn_w1m.textContent = "ESP ✓";
      autoDodgeBtn_w1m.classList.add("toggle-on");
    } else {
      autoDodgeBtn_w1m.textContent = "ESP";
      autoDodgeBtn_w1m.classList.remove("toggle-on");
    }
  };
  const farmModeSelect = plusPanel.querySelector("#espModeSelect");
  farmModeSelect.value = window.espMode || "players";
  farmModeSelect.onchange = (espModeEvent) => {
    window.espMode = espModeEvent.target.value;
    showToast("ESP: " + espModeEvent.target.value);
  };
  plusPanel.querySelector("#trackNearestBtn").onclick = () => trackPlayer();
  plusPanel.querySelector("#untrackBtn").onclick = () => toggleEsp_sdk();
  const autoDodgeBtn_gu6 = plusPanel.querySelector("#autoDodgeBtn");
  autoDodgeBtn_gu6.onclick = () => {
    if (window.autoDodgeEnabled) {
      toggleEsp_sl9();
      autoDodgeBtn_gu6.textContent = "Auto Dodge";
      autoDodgeBtn_gu6.classList.remove("toggle-on");
    } else {
      enableAutoDodge();
      autoDodgeBtn_gu6.textContent = "Dodging ✓";
      autoDodgeBtn_gu6.classList.add("toggle-on");
    }
  };
  const autoFarmBtn = plusPanel.querySelector("#autoFarmBtn");
  autoFarmBtn.id = "autoFarmBtn";
  const farmModeSelect_wjb = plusPanel.querySelector("#farmModeSelect");
  autoFarmBtn.onclick = () => {
    if (window.autoFarmActive) {
      stopAutoFarm();
      autoFarmBtn.textContent = "Auto Farm (F5)";
      autoFarmBtn.classList.remove("toggle-on");
    } else {
      initAutoFarm(farmModeSelect_wjb.value);
      autoFarmBtn.textContent = "Stop Farm (F5)";
      autoFarmBtn.classList.add("toggle-on");
    }
  };
  farmModeSelect_wjb.onchange = (autoFarmModeEvent) => {
    if (window.autoFarmActive) {
      window.autoFarmMode = autoFarmModeEvent.target.value;
      if (autoFarmModeEvent.target.value === "patrol") {
        generatePatrolPoints();
      }
      showToast("Farm: " + autoFarmModeEvent.target.value);
    }
  };
  plusPanel.querySelector("#farmBoostToggle").onchange = (
    autoFarmBoostEvent,
  ) => {
    window.autoFarmBoost = autoFarmBoostEvent.target.checked;
  };
  plusPanel.querySelector("#farmEvolveToggle").onchange = (
    autoFarmEvolveEvent,
  ) => {
    window.autoFarmEvolve = autoFarmEvolveEvent.target.checked;
  };
  plusPanel.querySelector("#farmAvoidToggle").onchange = (
    autoFarmAvoidPlayersEvent,
  ) => {
    window.autoFarmAvoidPlayers = autoFarmAvoidPlayersEvent.target.checked;
  };
  makeDraggable(plusPanel);
  return plusPanel;
}
function createSettingsPanel() {
  const settingsPanel = document.createElement("div");
  settingsPanel.id = "settings-panel";
  settingsPanel.className = "ast-panel";
  settingsPanel.style.cssText = "top:20px;left:20px;width:220px;";
  settingsPanel.innerHTML =
    '\n      <div class="ast-header">\n        <span class="ast-header-title">Settings</span>\n        <button class="ast-header-min" id="settingsMin">−</button>\n      </div>\n      <div class="ast-body" id="settingsBody">\n        <div class="ast-key-row">\n          <span>Toggle UI</span>\n          <input class="ast-key-capture" id="toggleKeyInput" type="text" value="SHIFT" readonly>\n        </div>\n\n        <div class="ast-sep"></div>\n        <span class="ast-section-label">Background</span>\n        <div class="ast-row">\n          <input class="ast-input" type="text" id="bgUrl" placeholder="Image URL..." style="flex:1;">\n          <button class="ast-btn" id="applyBg" style="width:auto;padding:6px 10px;margin:0;">Set</button>\n        </div>\n\n        <div class="ast-sep"></div>\n        <span class="ast-section-label">Theme</span>\n        <select class="ast-select" id="themeSelect">\n          <option value="grey">Grey</option>\n          <option value="blue">Blue</option>\n          <option value="red">Red</option>\n          <option value="green">Green</option>\n          <option value="pink">Pink</option>\n          <option value="starwars">Star Wars</option>\n          <option value="kfc">KFC</option>\n          <option value="halloween">Halloween 🔒</option>\n        </select>\n      </div>\n    ';
  document.body.appendChild(settingsPanel);
  const settingsBody = settingsPanel.querySelector("#settingsBody");
  let isSettingsMinimized = false;
  settingsPanel.querySelector("#settingsMin").onclick = (clickEvent) => {
    clickEvent.stopPropagation();
    isSettingsMinimized = !isSettingsMinimized;
    settingsBody.style.display = isSettingsMinimized ? "none" : "block";
    settingsPanel.querySelector("#settingsMin").textContent =
      isSettingsMinimized ? "+" : "−";
  };
  const toggleKeyInput = settingsPanel.querySelector("#toggleKeyInput");
  toggleKeyInput.value = state.activeKey.toUpperCase();
  toggleKeyInput.addEventListener("keydown", (keyEvent) => {
    keyEvent.preventDefault();
    state.activeKey = keyEvent.key;
    toggleKeyInput.value =
      keyEvent.key.length === 1 ? keyEvent.key.toUpperCase() : keyEvent.key;
  });
  const bgUrlInput = settingsPanel.querySelector("#bgUrl");
  bgUrlInput.value = localStorage.getItem("bgUrl") || "";
  settingsPanel.querySelector("#applyBg").onclick = () => {
    const bgUrl = bgUrlInput.value.trim();
    if (!bgUrl) {
      showToast("Enter a URL");
      return;
    }
    localStorage.setItem("bgUrl", bgUrl);
    initBackground();
    showToast("Background applied");
  };
  const themeSelect = settingsPanel.querySelector("#themeSelect");
  const angle = localStorage.getItem("theme") || "grey";
  themeSelect.value = angle;
  themeSelect.onchange = (changeEvent) => {
    const url = changeEvent.target.value;
    if (url === "halloween") {
      showHalloweenModal((isHalloweenMode) => {
        if (isHalloweenMode) {
          applyTheme("halloween");
        } else {
          changeEvent.target.value = localStorage.getItem("theme") || "grey";
        }
      });
    } else {
      applyTheme(url);
      showToast("Theme: " + url);
    }
  };
  makeDraggable(settingsPanel);
  return settingsPanel;
}
function createUpdateHistoryPanel() {
  const updatePanel = document.createElement("div");
  updatePanel.id = "update-history";
  updatePanel.className = "ast-panel";
  updatePanel.style.cssText =
    "bottom:20px;left:20px;width:230px;max-height:280px;";
  updatePanel.innerHTML =
    '\n      <div class="ast-header">\n        <span class="ast-header-title">Updates</span>\n        <button class="ast-header-min" id="updateMin">−</button>\n      </div>\n      <div class="ast-body" id="updateBody" style="overflow-y:auto;max-height:220px;">\n        <ul class="ast-update-list">\n          <li><strong>v1.6</strong> — Grey default theme, auto dodge stuck detection & adaptive pathing, area-based food skip, turn keybinds (customizable), UI revamp, ESP + radar, auto boost fixes, 1s food skip, auto dodge, auto evolve, draggable radar, auto food farm.</li>\n        </ul>\n      </div>\n    ';
  document.body.appendChild(updatePanel);
  const updateBody = updatePanel.querySelector("#updateBody");
  let isUpdateMinimized = false;
  updatePanel.querySelector("#updateMin").onclick = (event) => {
    event.stopPropagation();
    isUpdateMinimized = !isUpdateMinimized;
    updateBody.style.display = isUpdateMinimized ? "none" : "block";
    updatePanel.querySelector("#updateMin").textContent = isUpdateMinimized
      ? "+"
      : "−";
  };
  makeDraggable(updatePanel);
  return updatePanel;
}
function toggleUiVisibility() {
  const panelIds = [
    "deep-tools-panel",
    "update-history",
    "settings-panel",
    "plus-panel",
  ];
  const mainPanel = document.getElementById("deep-tools-panel");
  if (!mainPanel) {
    return;
  }
  const isVisible = mainPanel.style.display !== "none";
  const newDisplayState = isVisible ? "none" : "block";
  panelIds.forEach((elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = newDisplayState;
    }
  });
}

export {
  showHalloweenModal,
  makeDraggable,
  createToolsPanel,
  createPlusPanel,
  createSettingsPanel,
  createUpdateHistoryPanel,
  toggleUiVisibility,
};
