import {
  radius,
  hookTextEncoder,
  sysIsProcessed,
  initAutoFarm,
  initializeAntiDetection,
  initializeViewportSettings,
  state,
} from "../core.js";
import {
  toggleEsp,
  trackPlayer,
  globalToggleEsp,
  v55bbToggleEsp,
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
  codeInput.addEventListener("keypress", (v8a09Event) => {
    if (v8a09Event.key === "Enter") {
      modalContainer.querySelector("#hwSubmitBtn").click();
    }
  });
  codeInput.focus();
}
function makeDraggable(element) {
  let v279dOffsetX;
  let ee7cOffsetY;
  let isDragging = false;
  let v3fa0HasMoved = false;
  element.addEventListener("mousedown", (v10c1Event) => {
    if (
      ["BUTTON", "INPUT", "TEXTAREA", "SELECT", "A", "LABEL"].includes(
        v10c1Event.target.tagName,
      )
    ) {
      return;
    }
    if (v10c1Event.target.closest("button, input, textarea, select, label")) {
      return;
    }
    isDragging = true;
    v3fa0HasMoved = false;
    v279dOffsetX = v10c1Event.clientX - element.getBoundingClientRect().left;
    ee7cOffsetY = v10c1Event.clientY - element.getBoundingClientRect().top;
    element.style.transition = "none";
    const handleMouseMove = (v27ccEvent) => {
      if (
        !v3fa0HasMoved &&
        (Math.abs(v27ccEvent.clientX - v10c1Event.clientX) > 5 ||
          Math.abs(v27ccEvent.clientY - v10c1Event.clientY) > 5)
      ) {
        v3fa0HasMoved = true;
      }
      if (isDragging) {
        element.style.left = v27ccEvent.clientX - v279dOffsetX + "px";
        element.style.top = v27ccEvent.clientY - ee7cOffsetY + "px";
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
  element.addEventListener("click", (v367eEvent) => {
    if (v3fa0HasMoved) {
      v367eEvent.stopImmediatePropagation();
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
  const Body = panelElement.querySelector("#mainBody");
  let isHidden = false;
  panelElement.querySelector("#mainMin").onclick = (v9a5dEvent) => {
    v9a5dEvent.stopPropagation();
    isHidden = !isHidden;
    Body.style.display = isHidden ? "none" : "block";
    panelElement.querySelector("#mainMin").textContent = isHidden ? "+" : "−";
  };
  panelElement.querySelector("#sendBtn").onclick = () => {
    const chatMessage = panelElement.querySelector("#chatMsg").value;
    if (chatMessage) {
      simulateChatInput(chatMessage);
    }
  };
  const v4d79SpinBtn = panelElement.querySelector("#autoChatBtn");
  v4d79SpinBtn.onclick = () => {
    const messageText = panelElement.querySelector("#chatMsg").value;
    const delayValue =
      parseInt(panelElement.querySelector("#delayInput").value) || 10;
    if (!messageText) {
      showToast("Enter a message first");
      return;
    }
    if (state.IsToggled) {
      stopInterval();
      v4d79SpinBtn.textContent = "Auto Chat";
      v4d79SpinBtn.classList.remove("toggle-on");
    } else {
      startScheduledTask(messageText, delayValue);
      v4d79SpinBtn.textContent = "Stop Chat";
      v4d79SpinBtn.classList.add("toggle-on");
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
  const v4d79V4d79SpinBtn = panelElement.querySelector("#spinBtn");
  v4d79V4d79SpinBtn.onclick = () => {
    toggleMouseSimulation();
    if (featuresentitytrailState.globalEntityTrailInterval) {
      v4d79V4d79SpinBtn.textContent = "Stop Spin";
      v4d79V4d79SpinBtn.classList.add("toggle-on");
    } else {
      v4d79V4d79SpinBtn.textContent = "Auto Spin";
      v4d79V4d79SpinBtn.classList.remove("toggle-on");
    }
  };
  const v38c3TurnRightKeyInput = panelElement.querySelector("#spinKeyInput");
  let lastPressedKey = null;
  v38c3TurnRightKeyInput.addEventListener("keydown", (keyEvent) => {
    keyEvent.preventDefault();
    lastPressedKey = keyEvent.code || keyEvent.key;
    v38c3TurnRightKeyInput.value = lastPressedKey
      .replace("Key", "")
      .toUpperCase();
  });
  document.addEventListener("keydown", (keyboardEvent) => {
    if (
      lastPressedKey &&
      keyboardEvent.code === lastPressedKey &&
      !keyboardEvent.target.matches("input,textarea,button,select")
    ) {
      keyboardEvent.preventDefault();
      toggleMouseSimulation();
      if (featuresentitytrailState.globalEntityTrailInterval) {
        v4d79V4d79SpinBtn.textContent = "Stop Spin";
        v4d79V4d79SpinBtn.classList.add("toggle-on");
      } else {
        v4d79V4d79SpinBtn.textContent = "Auto Spin";
        v4d79V4d79SpinBtn.classList.remove("toggle-on");
      }
    }
  });
  const v13abV38c3TurnRightKeyInput =
    panelElement.querySelector("#turnLeftKeyInput");
  const v38c3V38c3TurnRightKeyInput =
    panelElement.querySelector("#turnRightKeyInput");
  v13abV38c3TurnRightKeyInput.value = state.keyQ.toUpperCase();
  v38c3V38c3TurnRightKeyInput.value = state.keyE.toUpperCase();
  v13abV38c3TurnRightKeyInput.addEventListener("keydown", (Event) => {
    Event.preventDefault();
    Event.stopPropagation();
    state.keyQ = Event.key;
    v13abV38c3TurnRightKeyInput.value =
      Event.key.length === 1 ? Event.key.toUpperCase() : Event.key;
  });
  v38c3V38c3TurnRightKeyInput.addEventListener("keydown", (inputEvent) => {
    inputEvent.preventDefault();
    inputEvent.stopPropagation();
    state.keyE = inputEvent.key;
    v38c3V38c3TurnRightKeyInput.value =
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
  let v573aIsHidden = false;
  plusPanel.querySelector("#plusMin").onclick = (toggleEvent) => {
    toggleEvent.stopPropagation();
    v573aIsHidden = !v573aIsHidden;
    plusBody.style.display = v573aIsHidden ? "none" : "block";
    plusPanel.querySelector("#plusMin").textContent = v573aIsHidden ? "+" : "−";
  };
  plusPanel.querySelector("#thresherBtn").onclick = (boostEvent) => {
    boostEvent.preventDefault();
    showToast("Thresher boost has been patched");
  };
  const astraVisionBtn = plusPanel.querySelector("#astraVisionBtn");
  astraVisionBtn.onclick = () => {
    if (sysIsProcessed) {
      showToast("Already active");
      return;
    }
    initializeAntiDetection();
    initializeViewportSettings();
    astraVisionBtn.textContent = "Astra-Vision ✓";
    astraVisionBtn.classList.add("toggle-on");
    astraVisionBtn.disabled = true;
  };
  const AutoDodgeBtn = plusPanel.querySelector("#smallMinimapBtn");
  AutoDodgeBtn.onclick = () => {
    initializeAntiDetection();
    toggleMinimapSize();
    if (state.boolIsToggled) {
      AutoDodgeBtn.textContent = "Minimap: Small";
      AutoDodgeBtn.classList.add("toggle-on");
    } else {
      AutoDodgeBtn.textContent = "Small Minimap";
      AutoDodgeBtn.classList.remove("toggle-on");
    }
  };
  const v2725AutoDodgeBtn = plusPanel.querySelector("#espBtn");
  v2725AutoDodgeBtn.onclick = () => {
    toggleEsp();
    if (window.espEnabled) {
      v2725AutoDodgeBtn.textContent = "ESP ✓";
      v2725AutoDodgeBtn.classList.add("toggle-on");
    } else {
      v2725AutoDodgeBtn.textContent = "ESP";
      v2725AutoDodgeBtn.classList.remove("toggle-on");
    }
  };
  const v3880FarmModeSelect = plusPanel.querySelector("#espModeSelect");
  v3880FarmModeSelect.value = window.espMode || "players";
  v3880FarmModeSelect.onchange = (espModeEvent) => {
    window.espMode = espModeEvent.target.value;
    showToast("ESP: " + espModeEvent.target.value);
  };
  plusPanel.querySelector("#trackNearestBtn").onclick = () => trackPlayer();
  plusPanel.querySelector("#untrackBtn").onclick = () => globalToggleEsp();
  const a047AutoDodgeBtn = plusPanel.querySelector("#autoDodgeBtn");
  a047AutoDodgeBtn.onclick = () => {
    if (window.autoDodgeEnabled) {
      v55bbToggleEsp();
      a047AutoDodgeBtn.textContent = "Auto Dodge";
      a047AutoDodgeBtn.classList.remove("toggle-on");
    } else {
      enableAutoDodge();
      a047AutoDodgeBtn.textContent = "Dodging ✓";
      a047AutoDodgeBtn.classList.add("toggle-on");
    }
  };
  const autoFarmBtn = plusPanel.querySelector("#autoFarmBtn");
  autoFarmBtn.id = "autoFarmBtn";
  const v3880V3880FarmModeSelect = plusPanel.querySelector("#farmModeSelect");
  autoFarmBtn.onclick = () => {
    if (window.autoFarmActive) {
      stopAutoFarm();
      autoFarmBtn.textContent = "Auto Farm (F5)";
      autoFarmBtn.classList.remove("toggle-on");
    } else {
      initAutoFarm(v3880V3880FarmModeSelect.value);
      autoFarmBtn.textContent = "Stop Farm (F5)";
      autoFarmBtn.classList.add("toggle-on");
    }
  };
  v3880V3880FarmModeSelect.onchange = (autoFarmModeEvent) => {
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
  toggleKeyInput.addEventListener("keydown", (v3f86KeyEvent) => {
    v3f86KeyEvent.preventDefault();
    state.activeKey = v3f86KeyEvent.key;
    toggleKeyInput.value =
      v3f86KeyEvent.key.length === 1
        ? v3f86KeyEvent.key.toUpperCase()
        : v3f86KeyEvent.key;
  });
  const bgUrlInput = settingsPanel.querySelector("#bgUrl");
  bgUrlInput.value = localStorage.getItem("bgUrl") || "";
  settingsPanel.querySelector("#applyBg").onclick = () => {
    const v59ecBgUrl = bgUrlInput.value.trim();
    if (!v59ecBgUrl) {
      showToast("Enter a URL");
      return;
    }
    localStorage.setItem("bgUrl", v59ecBgUrl);
    initBackground();
    showToast("Background applied");
  };
  const themeSelect = settingsPanel.querySelector("#themeSelect");
  const v28edAngle = localStorage.getItem("theme") || "grey";
  themeSelect.value = v28edAngle;
  themeSelect.onchange = (changeEvent) => {
    const v14bcUrl = changeEvent.target.value;
    if (v14bcUrl === "halloween") {
      showHalloweenModal((isHalloweenMode) => {
        if (isHalloweenMode) {
          applyTheme("halloween");
        } else {
          changeEvent.target.value = localStorage.getItem("theme") || "grey";
        }
      });
    } else {
      applyTheme(v14bcUrl);
      showToast("Theme: " + v14bcUrl);
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
  updatePanel.querySelector("#updateMin").onclick = (v7427Event) => {
    v7427Event.stopPropagation();
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
  const Panel = document.getElementById("deep-tools-panel");
  if (!Panel) {
    return;
  }
  const isVisible = Panel.style.display !== "none";
  const newDisplayState = isVisible ? "none" : "block";
  panelIds.forEach((elementId) => {
    const v1b54Element = document.getElementById(elementId);
    if (v1b54Element) {
      v1b54Element.style.display = newDisplayState;
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
