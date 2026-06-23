import { showNotification, typeText } from "./interaction.js";
import {
  startScheduledTask,
  stopInterval,
  typeAndSendMessage,
} from "../features/chat.js";
import { interceptTextEncoder } from "../features/antidetection.js";
import { generateRandomString } from "../utils.js";
import { toggleMouseSimulation } from "../features/movement.js";
import {
  radius,
  clearTracking_2,
  initGameHooks,
  clearTracking_3,
  settings,
  state,
} from "../core.js";
import { initializeAstraVision } from "../features/xray.js";
import {
  clearTracking,
  trackPlayer,
  toggleMinimapSize,
} from "../features/esp.js";
import { toggleLock, enableAutoDodge } from "../features/aimbot.js";
import {
  setupPatrolPoints,
  startAutoFarm,
  stopAutoFarm,
} from "../features/autofarm.js";
import { applyTheme, initBackground } from "./theme.js";

window.lockKey = "t";
window.entityTraceKey = "h";

function refreshUI() {}
function showHalloweenModal(onUnlockCallback) {
  const modalContainer = document.createElement("div");
  modalContainer.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:100001;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s ease;";
  modalContainer.innerHTML =
    '<div style="background:#1a1a1a;padding:32px;border-radius:8px;text-align:center;max-width:400px;width:90%;border:1px solid #333;">\n      <div style="color:#e0e0e0;font-size:18px;font-weight:600;margin-bottom:16px;">Halloween Access Code</div>\n      <input id="hwCodeInput" type="text" placeholder="Enter code..." style="background:#111;border:1px solid #333;color:#e0e0e0;border-radius:4px;padding:10px;font-size:14px;text-align:center;width:100%;box-sizing:border-box;margin-bottom:16px;outline:none;">\n      <div style="display:flex;gap:8px;">\n        <button id="hwCancelBtn" style="flex:1;background:#222;color:#888;border:1px solid #333;border-radius:4px;padding:10px;cursor:pointer;">Cancel</button>\n        <button id="hwSubmitBtn" style="flex:1;background:#ff6600;color:#fff;border:none;border-radius:4px;padding:10px;cursor:pointer;font-weight:600;">Redeem</button>\n      </div></div>';
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
      showNotification("Halloween theme unlocked");
      closeModal();
      onUnlockCallback(true);
    } else {
      codeInput.style.borderColor = "#ff0000";
      setTimeout(() => {
        codeInput.style.borderColor = "#333";
      }, 500);
      showNotification("Invalid code");
    }
  };
  modalContainer.querySelector("#hwCancelBtn").onclick = () => {
    closeModal();
    onUnlockCallback(false);
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
    if (event.target.closest("button,input,textarea,select,label")) {
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
  element.addEventListener("click", (event_2) => {
    if (hasMoved) {
      event_2.stopImmediatePropagation();
    }
  });
}
function createToolsPanel() {
  const toolsPanel = document.createElement("div");
  toolsPanel.id = "deep-tools-panel";
  toolsPanel.className = "ast-panel";
  toolsPanel.style.cssText = "bottom:20px;right:20px;width:230px;";
  toolsPanel.innerHTML =
    '\n      <div class="ast-header"><span class="ast-header-title">Astraphobia Client</span><button class="ast-header-min" id="mainMin">−</button></div>\n      <div class="ast-body" id="mainBody">\n        <span class="ast-section-label">Chat</span>\n        <textarea class="ast-textarea" id="chatMsg" placeholder="Message..." rows="2"></textarea>\n        <button class="ast-btn" id="sendBtn">Send Chat</button>\n        <div class="ast-row" style="margin-top:4px;">\n          <input class="ast-input" type="number" id="delayInput" min="1" max="300" value="10" style="width:50px;text-align:center;">\n          <span style="font-size:11px;color:#888;">sec</span>\n          <button class="ast-btn" id="autoChatBtn" style="flex:1;margin-bottom:0;">Auto Chat</button>\n        </div>\n        <div class="ast-sep"></div>\n        <span class="ast-section-label">Tools</span>\n        <button class="ast-btn" id="patchBtn">Special Characters</button>\n        <button class="ast-btn" id="spoofBtn">Spoof Username</button>\n        <button class="ast-btn" id="spinBtn">Auto Spin</button>\n        <div class="ast-key-row"><span>Spin key</span><input class="ast-key-capture" id="spinKeyInput" type="text" placeholder="..." readonly></div>\n        <div class="ast-sep"></div>\n        <span class="ast-section-label">Turn Controls</span>\n        <div class="ast-key-row">\n          <span>Turn Left</span>\n          <input class="ast-key-capture" id="turnLeftKeyInput" type="text" value="Q" readonly>\n        </div>\n        <div class="ast-key-row">\n          <span>Turn Right</span>\n          <input class="ast-key-capture" id="turnRightKeyInput" type="text" value="E" readonly>\n        </div>\n        <div class="ast-credits">Made by Astraphobia</div>\n      </div>';
  document.body.appendChild(toolsPanel);
  const mainBody = toolsPanel.querySelector("#mainBody");
  let isHidden = false;
  toolsPanel.querySelector("#mainMin").onclick = (arg_ebd1) => {
    arg_ebd1.stopPropagation();
    isHidden = !isHidden;
    mainBody.style.display = isHidden ? "none" : "block";
    toolsPanel.querySelector("#mainMin").textContent = isHidden ? "+" : "−";
  };
  toolsPanel.querySelector("#sendBtn").onclick = () => {
    const var_c5cf = toolsPanel.querySelector("#chatMsg").value;
    if (var_c5cf) {
      typeAndSendMessage(var_c5cf);
    }
  };
  const autoChatBtn = toolsPanel.querySelector("#autoChatBtn");
  autoChatBtn.onclick = () => {
    const var_58c3 = toolsPanel.querySelector("#chatMsg").value;
    const var_2f90 =
      parseInt(toolsPanel.querySelector("#delayInput").value) || 10;
    if (!var_58c3) {
      showNotification("Enter a message first");
      return;
    }
    if (state.isProcessing) {
      stopInterval();
      autoChatBtn.textContent = "Auto Chat";
      autoChatBtn.classList.remove("toggle-on");
    } else {
      startScheduledTask(var_58c3, var_2f90);
      autoChatBtn.textContent = "Stop Chat";
      autoChatBtn.classList.add("toggle-on");
    }
  };
  const patchBtn = toolsPanel.querySelector("#patchBtn");
  patchBtn.onclick = () => {
    interceptTextEncoder();
    patchBtn.textContent = "Special Chars Active";
    patchBtn.disabled = true;
    patchBtn.classList.add("toggle-on");
  };
  toolsPanel.querySelector("#spoofBtn").onclick = () => {
    const var_fdc7 = generateRandomString(8);
    if (typeText(".play-game .el-input__inner", var_fdc7)) {
      showNotification("Name spoofed");
    } else if (typeText(".new-tribe .el-input__inner", var_fdc7)) {
      showNotification("Tribe name spoofed");
    } else {
      showNotification("No name input found");
    }
  };
  const spinBtn = toolsPanel.querySelector("#spinBtn");
  spinBtn.onclick = () => {
    toggleMouseSimulation();
    spinBtn.textContent = state.secondaryIntervalId ? "Stop Spin" : "Auto Spin";
    spinBtn.classList.toggle("toggle-on", !!state.secondaryIntervalId);
  };
  const spinKeyInput = toolsPanel.querySelector("#spinKeyInput");
  let lastKey = null;
  spinKeyInput.addEventListener("keydown", (arg_ac29) => {
    arg_ac29.preventDefault();
    lastKey = arg_ac29.code || arg_ac29.key;
    spinKeyInput.value = lastKey.replace("Key", "").toUpperCase();
  });
  document.addEventListener("keydown", (arg_3e00) => {
    if (
      lastKey &&
      arg_3e00.code === lastKey &&
      !arg_3e00.target.matches("input,textarea,button,select")
    ) {
      arg_3e00.preventDefault();
      toggleMouseSimulation();
      spinBtn.textContent = state.secondaryIntervalId
        ? "Stop Spin"
        : "Auto Spin";
      spinBtn.classList.toggle("toggle-on", !!state.secondaryIntervalId);
    }
  });
  const turnLeftKeyInput = toolsPanel.querySelector("#turnLeftKeyInput");
  const turnRightKeyInput = toolsPanel.querySelector("#turnRightKeyInput");
  turnLeftKeyInput.value = state.currentKey.toUpperCase();
  turnRightKeyInput.value = state.currentKey_2.toUpperCase();
  turnLeftKeyInput.addEventListener("keydown", (arg_de7) => {
    arg_de7.preventDefault();
    arg_de7.stopPropagation();
    state.currentKey = arg_de7.key;
    turnLeftKeyInput.value =
      arg_de7.key.length === 1 ? arg_de7.key.toUpperCase() : arg_de7.key;
  });
  turnRightKeyInput.addEventListener("keydown", (arg_1244) => {
    arg_1244.preventDefault();
    arg_1244.stopPropagation();
    state.currentKey_2 = arg_1244.key;
    turnRightKeyInput.value =
      arg_1244.key.length === 1 ? arg_1244.key.toUpperCase() : arg_1244.key;
  });
  makeDraggable(toolsPanel);
  return toolsPanel;
}
function createVisionPanel() {
  const visionPanel = document.createElement("div");
  visionPanel.id = "vision-panel";
  visionPanel.className = "ast-panel";
  visionPanel.style.cssText = "top:20px;right:20px;width:230px;";
  visionPanel.innerHTML =
    '\n      <div class="ast-header"><span class="ast-header-title">Astraphobia Client</span><button class="ast-header-min" id="visionMin">−</button></div>\n      <div class="ast-body" id="visionBody">\n        <span class="ast-section-label">Vision</span>\n        <button class="ast-btn patched" id="thresherBtn" disabled>Thresher Boost (Patched)</button>\n        <button class="ast-btn" id="astraVisionBtn">Astra-Vision</button>\n        <button class="ast-btn" id="smallMinimapBtn">Small Minimap</button>\n        <div class="ast-sep"></div>\n        <span class="ast-section-label">ESP</span>\n        <button class="ast-btn" id="espBtn">ESP</button>\n        <select class="ast-select" id="espModeSelect"><option value="players">Players</option><option value="food">Food</option></select>\n        <button class="ast-btn" id="trackNearestBtn">Track Nearest (F3)</button>\n        <button class="ast-btn" id="untrackBtn">Untrack (F4)</button>\n        <div class="ast-sep"></div>\n        <button class="ast-btn" id="espColorsToggleBtn" style="display:flex;align-items:center;justify-content:space-between;">\n          <span style="font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-sec,#888);">ESP Colors</span>\n          <span id="espColorsArrow" style="color:var(--text-sec,#888);font-size:12px;">▼</span>\n        </button>\n        <div id="espColorsSection" style="display:none;">\n          <div class="ast-key-row"><span>Close (&lt;500)</span><input type="color" id="espColorClose" value="#ff0000" style="width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);"></div>\n          <div class="ast-key-row"><span>Medium (&lt;1500)</span><input type="color" id="espColorMedium" value="#ffff00" style="width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);"></div>\n          <div class="ast-key-row"><span>Far (&lt;3000)</span><input type="color" id="espColorFar" value="#00ffff" style="width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);"></div>\n          <div class="ast-key-row"><span>Very Far</span><input type="color" id="espColorVeryFar" value="#00ff00" style="width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);"></div>\n          <div class="ast-key-row"><span>Tracked</span><input type="color" id="espColorTracked" value="#ff00ff" style="width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);"></div>\n          <div class="ast-key-row"><span>Food Close</span><input type="color" id="espColorFoodClose" value="#00ff00" style="width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);"></div>\n          <div class="ast-key-row"><span>Food Medium</span><input type="color" id="espColorFoodMedium" value="#88ff88" style="width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);"></div>\n          <div class="ast-key-row"><span>Food Far</span><input type="color" id="espColorFoodFar" value="#44cc44" style="width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);"></div>\n        </div>\n      </div>';
  document.body.appendChild(visionPanel);
  const visionBodyElement = visionPanel.querySelector("#visionBody");
  let isVisionHidden = false;
  visionPanel.querySelector("#visionMin").onclick = (toggleEvent) => {
    toggleEvent.stopPropagation();
    isVisionHidden = !isVisionHidden;
    visionBodyElement.style.display = isVisionHidden ? "none" : "block";
    visionPanel.querySelector("#visionMin").textContent = isVisionHidden
      ? "+"
      : "−";
  };
  visionPanel.querySelector("#thresherBtn").onclick = (boostEvent) => {
    boostEvent.preventDefault();
    showNotification("Thresher boost has been patched");
  };
  const astraVisionBtn = visionPanel.querySelector("#astraVisionBtn");
  astraVisionBtn.onclick = () => {
    if (state.isEnabled) {
      showNotification("Already active");
      return;
    }
    initGameHooks();
    initializeAstraVision();
    astraVisionBtn.textContent = "Astra-Vision ✓";
    astraVisionBtn.classList.add("toggle-on");
    astraVisionBtn.disabled = true;
  };
  const smallMinimapBtn = visionPanel.querySelector("#smallMinimapBtn");
  smallMinimapBtn.onclick = () => {
    initGameHooks();
    toggleMinimapSize();
    smallMinimapBtn.textContent = state.isMinimapSmall
      ? "Minimap: Small"
      : "Small Minimap";
    smallMinimapBtn.classList.toggle("toggle-on", state.isMinimapSmall);
  };
  const espBtn = visionPanel.querySelector("#espBtn");
  espBtn.onclick = () => {
    clearTracking();
    espBtn.textContent = window.espEnabled ? "ESP ✓" : "ESP";
    espBtn.classList.toggle("toggle-on", window.espEnabled);
  };
  const espModeSelect = visionPanel.querySelector("#espModeSelect");
  espModeSelect.value = window.espMode || "players";
  espModeSelect.onchange = (espModeEvent) => {
    window.espMode = espModeEvent.target.value;
    showNotification("ESP: " + espModeEvent.target.value);
  };
  visionPanel.querySelector("#trackNearestBtn").onclick = () => trackPlayer();
  visionPanel.querySelector("#untrackBtn").onclick = () => clearTracking_2();
  const espColorsToggleBtn = visionPanel.querySelector("#espColorsToggleBtn");
  const espColorsSection = visionPanel.querySelector("#espColorsSection");
  const espColorsArrow = visionPanel.querySelector("#espColorsArrow");
  let isEspColorsVisible = false;
  espColorsToggleBtn.onclick = () => {
    isEspColorsVisible = !isEspColorsVisible;
    espColorsSection.style.display = isEspColorsVisible ? "block" : "none";
    espColorsArrow.textContent = isEspColorsVisible ? "▲" : "▼";
  };
  const espColorSettings = {
    espColorClose: "close",
    espColorMedium: "medium",
    espColorFar: "far",
    espColorVeryFar: "veryFar",
    espColorTracked: "tracked",
    espColorFoodClose: "foodClose",
    espColorFoodMedium: "foodMedium",
    espColorFoodFar: "foodFar",
  };
  Object.entries(espColorSettings).forEach(([elementId, colorKey]) => {
    const targetElement = visionPanel.querySelector("#" + elementId);
    if (targetElement) {
      targetElement.addEventListener("input", (event) => {
        window.espColors[colorKey] = event.target.value;
      });
    }
  });
  makeDraggable(visionPanel);
  return visionPanel;
}
function createCombatPanel() {
  const combatPanel = document.createElement("div");
  combatPanel.id = "combat-panel";
  combatPanel.className = "ast-panel";
  combatPanel.style.cssText = "top:20px;left:260px;width:230px;";
  combatPanel.innerHTML =
    '\n      <div class="ast-header"><span class="ast-header-title">Astraphobia Client</span><button class="ast-header-min" id="combatMin">−</button></div>\n      <div class="ast-body" id="combatBody">\n        <span class="ast-section-label">Combat</span>\n        <button class="ast-btn" id="lockBtn">Lock Nearest</button>\n        <div class="ast-key-row"><span>Lock Key</span><input class="ast-key-capture" id="lockKeyInput" type="text" value="T" readonly></div>\n        <div class="ast-sep"></div>\n        <span class="ast-section-label">Tracking</span>\n        <div class="ast-key-row" style="margin-top:4px;">\n          <span>Trail Color</span>\n          <input type="color" id="trailColorPicker" value="#ff9600" style="width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;background:var(--bg2,#242424);cursor:pointer;padding:0;">\n        </div>\n        <div class="ast-key-row"><span>Trace Key (re-targets)</span><input class="ast-key-capture" id="traceKeyInput" type="text" value="H" readonly></div>\n      </div>';
  document.body.appendChild(combatPanel);
  const combatBody = combatPanel.querySelector("#combatBody");
  let isCombatMinimized = false;
  combatPanel.querySelector("#combatMin").onclick = (toggleEvent) => {
    toggleEvent.stopPropagation();
    isCombatMinimized = !isCombatMinimized;
    combatBody.style.display = isCombatMinimized ? "none" : "block";
    combatPanel.querySelector("#combatMin").textContent = isCombatMinimized
      ? "+"
      : "−";
  };
  const lockButton = combatPanel.querySelector("#lockBtn");
  lockButton.onclick = () => toggleLock();
  const lockKeyInput = combatPanel.querySelector("#lockKeyInput");
  lockKeyInput.value = window.lockKey.toUpperCase();
  lockKeyInput.addEventListener("keydown", (lockEvent) => {
    lockEvent.preventDefault();
    lockEvent.stopPropagation();
    window.lockKey = lockEvent.key;
    lockKeyInput.value =
      lockEvent.key.length === 1 ? lockEvent.key.toUpperCase() : lockEvent.key;
  });
  const trailColorPicker = combatPanel.querySelector("#trailColorPicker");
  trailColorPicker.addEventListener("input", (colorChangeEvent) => {
    const colorValue = colorChangeEvent.target.value;
    window.entityTrailColor = {
      r: parseInt(colorValue.slice(1, 3), 16),
      g: parseInt(colorValue.slice(3, 5), 16),
      b: parseInt(colorValue.slice(5, 7), 16),
    };
  });
  const traceKeyInput = combatPanel.querySelector("#traceKeyInput");
  traceKeyInput.value = window.entityTraceKey.toUpperCase();
  traceKeyInput.addEventListener("keydown", (traceEvent) => {
    traceEvent.preventDefault();
    traceEvent.stopPropagation();
    window.entityTraceKey = traceEvent.key.toLowerCase();
    traceKeyInput.value =
      traceEvent.key.length === 1
        ? traceEvent.key.toUpperCase()
        : traceEvent.key;
  });
  makeDraggable(combatPanel);
  return combatPanel;
}
function createAutomationPanel() {
  const automationPanel = document.createElement("div");
  automationPanel.id = "automation-panel";
  automationPanel.className = "ast-panel";
  automationPanel.style.cssText = "bottom:20px;left:260px;width:230px;";
  automationPanel.innerHTML =
    '\n      <div class="ast-header"><span class="ast-header-title">Astraphobia Client</span><button class="ast-header-min" id="autoMin">−</button></div>\n      <div class="ast-body" id="autoBody">\n        <span class="ast-section-label">Automation</span>\n        <button class="ast-btn" id="autoDodgeBtn">Auto Dodge</button>\n        <button class="ast-btn" id="autoFarmBtn">Auto Farm (F5)</button>\n        <select class="ast-select" id="farmModeSelect" style="margin-top:4px;">\n          <option value="nearest">Nearest Food</option>\n          <option value="cluster">Food Clusters</option>\n          <option value="patrol">Patrol Route</option>\n        </select>\n        <div class="ast-toggle-row"><span>Boost</span><div class="ast-switch"><input type="checkbox" id="farmBoostToggle" checked><span class="slider"></span></div></div>\n        <div class="ast-toggle-row"><span>Auto Evolve</span><div class="ast-switch"><input type="checkbox" id="farmEvolveToggle" checked><span class="slider"></span></div></div>\n        <div class="ast-toggle-row"><span>Avoid Players</span><div class="ast-switch"><input type="checkbox" id="farmAvoidToggle" checked><span class="slider"></span></div></div>\n      </div>';
  document.body.appendChild(automationPanel);
  const automationBody = automationPanel.querySelector("#autoBody");
  let isAutoMinimized = false;
  automationPanel.querySelector("#autoMin").onclick = (menuToggleEvent) => {
    menuToggleEvent.stopPropagation();
    isAutoMinimized = !isAutoMinimized;
    automationBody.style.display = isAutoMinimized ? "none" : "block";
    automationPanel.querySelector("#autoMin").textContent = isAutoMinimized
      ? "+"
      : "−";
  };
  const autoDodgeButton = automationPanel.querySelector("#autoDodgeBtn");
  autoDodgeButton.onclick = () => {
    if (window.autoDodgeEnabled) {
      clearTracking_3();
      autoDodgeButton.textContent = "Auto Dodge";
      autoDodgeButton.classList.remove("toggle-on");
    } else {
      enableAutoDodge();
      autoDodgeButton.textContent = "Dodging ✓";
      autoDodgeButton.classList.add("toggle-on");
    }
  };
  const autoFarmButton = automationPanel.querySelector("#autoFarmBtn");
  autoFarmButton.id = "autoFarmBtn";
  const farmModeSelect = automationPanel.querySelector("#farmModeSelect");
  autoFarmButton.onclick = () => {
    if (window.autoFarmActive) {
      stopAutoFarm();
      autoFarmButton.textContent = "Auto Farm (F5)";
      autoFarmButton.classList.remove("toggle-on");
    } else {
      startAutoFarm(farmModeSelect.value);
      autoFarmButton.textContent = "Stop Farm (F5)";
      autoFarmButton.classList.add("toggle-on");
    }
  };
  farmModeSelect.onchange = (farmModeChangeEvent) => {
    if (window.autoFarmActive) {
      window.autoFarmMode = farmModeChangeEvent.target.value;
      if (farmModeChangeEvent.target.value === "patrol") {
        setupPatrolPoints();
      }
      showNotification("Farm: " + farmModeChangeEvent.target.value);
    }
  };
  const farmBoostToggle = automationPanel.querySelector("#farmBoostToggle");
  const farmEvolveToggle = automationPanel.querySelector("#farmEvolveToggle");
  const farmAvoidToggle = automationPanel.querySelector("#farmAvoidToggle");
  farmBoostToggle.checked = window.autoFarmBoost;
  farmEvolveToggle.checked = window.autoFarmEvolve;
  farmAvoidToggle.checked = window.autoFarmAvoidPlayers;
  const farmBoostLabel = farmBoostToggle.nextElementSibling;
  farmBoostLabel.addEventListener("click", (farmOptionEvent1) => {
    farmOptionEvent1.stopPropagation();
    farmBoostToggle.checked = !farmBoostToggle.checked;
    window.autoFarmBoost = farmBoostToggle.checked;
    showNotification(
      farmBoostToggle.checked ? "Farm boost ON" : "Farm boost OFF",
    );
  });
  const farmEvolveLabel = farmEvolveToggle.nextElementSibling;
  farmEvolveLabel.addEventListener("click", (farmOptionEvent2) => {
    farmOptionEvent2.stopPropagation();
    farmEvolveToggle.checked = !farmEvolveToggle.checked;
    window.autoFarmEvolve = farmEvolveToggle.checked;
    showNotification(
      farmEvolveToggle.checked ? "Auto evolve ON" : "Auto evolve OFF",
    );
  });
  const farmAvoidLabel = farmAvoidToggle.nextElementSibling;
  farmAvoidLabel.addEventListener("click", (farmOptionEvent3) => {
    farmOptionEvent3.stopPropagation();
    farmAvoidToggle.checked = !farmAvoidToggle.checked;
    window.autoFarmAvoidPlayers = farmAvoidToggle.checked;
    showNotification(
      farmAvoidToggle.checked ? "Avoid players ON" : "Avoid players OFF",
    );
  });
  makeDraggable(automationPanel);
  return automationPanel;
}
function createSettingsPanel() {
  const settingsPanel = document.createElement("div");
  settingsPanel.id = "settings-panel";
  settingsPanel.className = "ast-panel";
  settingsPanel.style.cssText = "top:20px;left:20px;width:220px;";
  settingsPanel.innerHTML =
    '\n      <div class="ast-header"><span class="ast-header-title">Settings</span><button class="ast-header-min" id="settingsMin">−</button></div>\n      <div class="ast-body" id="settingsBody">\n        <div class="ast-key-row"><span>Toggle UI</span><input class="ast-key-capture" id="toggleKeyInput" type="text" value="SHIFT" readonly></div>\n        <div class="ast-sep"></div>\n        <span class="ast-section-label">Background</span>\n        <div class="ast-row"><input class="ast-input" type="text" id="bgUrl" placeholder="Image URL..." style="flex:1;"><button class="ast-btn" id="applyBg" style="width:auto;padding:6px 10px;margin:0;">Set</button></div>\n        <div class="ast-sep"></div>\n        <span class="ast-section-label">Theme</span>\n        <select class="ast-select" id="themeSelect">\n          <option value="grey">Grey</option><option value="blue">Blue</option><option value="red">Red</option>\n          <option value="green">Green</option><option value="pink">Pink</option><option value="starwars">Star Wars</option>\n          <option value="kfc">KFC</option><option value="halloween">Halloween 🔒</option>\n        </select>\n        <div class="ast-sep"></div>\n        <button class="ast-btn" id="customThemeToggleBtn" style="display:flex;align-items:center;justify-content:space-between;">\n          <span style="font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-sec,#888);">Create Theme</span>\n          <span id="customThemeArrow" style="color:var(--text-sec,#888);font-size:12px;">▼</span>\n        </button>\n        <div id="customThemeSection" style="display:none;padding-top:4px;">\n          <input class="ast-input" type="text" id="customThemeName" placeholder="Theme name..." style="width:100%;box-sizing:border-box;margin-bottom:4px;">\n<div class="ast-key-row"><span>Accent</span><input type="color" id="ctAcc" value="#888888" style="width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);"></div>\n<div class="ast-key-row"><span>Background</span><input type="color" id="ctBg" value="#1a1a1a" style="width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);"></div>\n<div class="ast-key-row"><span>Panel</span><input type="color" id="ctPanel" value="#242424" style="width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);"></div>\n<button class="ast-btn" id="saveCustomTheme" style="margin-top:4px;">Save Theme</button>\n        </div>\n        <div class="ast-sep"></div>\n        <button class="ast-btn" id="myThemesToggleBtn" style="display:flex;align-items:center;justify-content:space-between;">\n          <span style="font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-sec,#888);">My Themes</span>\n          <span id="myThemesArrow" style="color:var(--text-sec,#888);font-size:12px;">▼</span>\n        </button>\n        <div id="myThemesSection" style="display:none;padding-top:4px;">\n          <div id="customThemeList"></div>\n          <div id="noThemesMsg" style="font-size:11px;color:#555;text-align:center;padding:8px 0;">No custom themes yet</div>\n        </div>\n      </div>';
  document.body.appendChild(settingsPanel);
  const settingsBody = settingsPanel.querySelector("#settingsBody");
  let isSettingsHidden = false;
  settingsPanel.querySelector("#settingsMin").onclick = (event) => {
    event.stopPropagation();
    isSettingsHidden = !isSettingsHidden;
    settingsBody.style.display = isSettingsHidden ? "none" : "block";
    settingsPanel.querySelector("#settingsMin").textContent = isSettingsHidden
      ? "+"
      : "−";
  };
  const toggleKeyInput = settingsPanel.querySelector("#toggleKeyInput");
  toggleKeyInput.value = state.pressedKey.toUpperCase();
  toggleKeyInput.addEventListener("keydown", (keyboardEvent) => {
    keyboardEvent.preventDefault();
    state.pressedKey = keyboardEvent.key;
    toggleKeyInput.value =
      keyboardEvent.key.length === 1
        ? keyboardEvent.key.toUpperCase()
        : keyboardEvent.key;
  });
  const bgUrlInput = settingsPanel.querySelector("#bgUrl");
  bgUrlInput.value = localStorage.getItem("bgUrl") || "";
  settingsPanel.querySelector("#applyBg").onclick = () => {
    const backgroundUrl = bgUrlInput.value.trim();
    if (!backgroundUrl) {
      showNotification("Enter a URL");
      return;
    }
    localStorage.setItem("bgUrl", backgroundUrl);
    initBackground();
    showNotification("Background applied");
  };
  const themeSelect = settingsPanel.querySelector("#themeSelect");
  const currentTheme = localStorage.getItem("theme") || "grey";
  const customThemes = JSON.parse(localStorage.getItem("customThemes") || "{}");
  const presetThemes = [
    "grey",
    "blue",
    "red",
    "green",
    "pink",
    "starwars",
    "kfc",
    "halloween",
  ];
  themeSelect.value =
    presetThemes.includes(currentTheme) || customThemes[currentTheme]
      ? currentTheme
      : "grey";
  themeSelect.onchange = (themeChangeEvent) => {
    const selectedTheme = themeChangeEvent.target.value;
    if (selectedTheme === "halloween") {
      showHalloweenModal((isHalloween) => {
        if (isHalloween) {
          applyTheme("halloween");
        } else {
          themeChangeEvent.target.value =
            localStorage.getItem("theme") || "grey";
        }
      });
    } else {
      applyTheme(selectedTheme);
      showNotification("Theme: " + selectedTheme);
    }
  };
  const renderCustomThemes = () => {
    const customThemeList = settingsPanel.querySelector("#customThemeList");
    const noThemesMessage = settingsPanel.querySelector("#noThemesMsg");
    const customThemes = JSON.parse(
      localStorage.getItem("customThemes") || "{}",
    );
    const customThemeKeys = Object.keys(customThemes);
    customThemeList.innerHTML = "";
    noThemesMessage.style.display =
      customThemeKeys.length === 0 ? "block" : "none";
    customThemeKeys.forEach((selectedTheme) => {
      const themeElement = document.createElement("div");
      themeElement.style.cssText = "display:flex;gap:4px;margin-bottom:3px;";
      const isThemeActive = localStorage.getItem("theme") === selectedTheme;
      themeElement.innerHTML =
        '\n          <button class="ast-btn' +
        (isThemeActive ? " toggle-on" : "") +
        '" style="flex:1;margin:0;">' +
        selectedTheme +
        '</button>\n          <button class="ast-btn" style="width:32px;margin:0;text-align:center;color:#f44336;">✕</button>';
      themeElement.querySelectorAll("button")[0].onclick = () => {
        applyTheme(selectedTheme);
        showNotification("Theme: " + selectedTheme);
        renderCustomThemes();
      };
      themeElement.querySelectorAll("button")[1].onclick = () => {
        const customThemes = JSON.parse(
          localStorage.getItem("customThemes") || "{}",
        );
        delete customThemes[selectedTheme];
        localStorage.setItem("customThemes", JSON.stringify(customThemes));
        if (localStorage.getItem("theme") === selectedTheme) {
          applyTheme("grey");
          themeSelect.value = "grey";
          showNotification("Theme reset to Grey");
        } else {
          showNotification("Deleted: " + selectedTheme);
        }
        renderCustomThemes();
      };
      customThemeList.appendChild(themeElement);
    });
  };
  renderCustomThemes();
  settingsPanel.querySelector("#saveCustomTheme").onclick = () => {
    const customThemeName = settingsPanel
      .querySelector("#customThemeName")
      .value.trim();
    if (!customThemeName) {
      showNotification("Enter a theme name");
      return;
    }
    const availableThemes = [
      "grey",
      "blue",
      "red",
      "green",
      "pink",
      "starwars",
      "kfc",
      "halloween",
    ];
    if (availableThemes.includes(customThemeName.toLowerCase())) {
      showNotification("Cannot use built-in theme name");
      return;
    }
    const accountValue = settingsPanel.querySelector("#ctAcc").value;
    const themeBgColor = settingsPanel.querySelector("#ctBg").value;
    const themePanelColor = settingsPanel.querySelector("#ctPanel").value;
    const red = parseInt(accountValue.slice(1, 3), 16);
    const green = parseInt(accountValue.slice(3, 5), 16);
    const blue = parseInt(accountValue.slice(5, 7), 16);
    const adjustColor = (hexColor) => {
      const redComponent = parseInt(hexColor.slice(1, 3), 16) + 10;
      const greenComponent = parseInt(hexColor.slice(3, 5), 16) + 10;
      const blueComponent = parseInt(hexColor.slice(5, 7), 16) + 10;
      return (
        "#" +
        [redComponent, greenComponent, blueComponent]
          .map((colorValue) =>
            Math.min(255, colorValue).toString(16).padStart(2, "0"),
          )
          .join("")
      );
    };
    const themeSettings = {
      acc: accountValue,
      accH: adjustColor(accountValue),
      accRGB: red + "," + green + "," + blue,
      text: "#e0e0e0",
      textSec: "#888",
      bg1: themeBgColor,
      bg2: themePanelColor,
      bg3: adjustColor(themePanelColor),
      border: "#333",
      hover: adjustColor(themePanelColor),
    };
    const customThemes_2 = JSON.parse(
      localStorage.getItem("customThemes") || "{}",
    );
    customThemes_2[customThemeName] = themeSettings;
    localStorage.setItem("customThemes", JSON.stringify(customThemes_2));
    applyTheme(customThemeName);
    settingsPanel.querySelector("#customThemeName").value = "";
    renderCustomThemes();
    showNotification("Theme saved: " + customThemeName);
  };
  const customThemeToggleBtn = settingsPanel.querySelector(
    "#customThemeToggleBtn",
  );
  const customThemeSection = settingsPanel.querySelector("#customThemeSection");
  const customThemeArrow = settingsPanel.querySelector("#customThemeArrow");
  let isCustomThemeVisible = false;
  customThemeToggleBtn.onclick = () => {
    isCustomThemeVisible = !isCustomThemeVisible;
    customThemeSection.style.display = isCustomThemeVisible ? "block" : "none";
    customThemeArrow.textContent = isCustomThemeVisible ? "▲" : "▼";
  };
  const myThemesToggleBtn = settingsPanel.querySelector("#myThemesToggleBtn");
  const myThemesSection = settingsPanel.querySelector("#myThemesSection");
  const myThemesArrow = settingsPanel.querySelector("#myThemesArrow");
  let isThemesSectionVisible = false;
  myThemesToggleBtn.onclick = () => {
    isThemesSectionVisible = !isThemesSectionVisible;
    myThemesSection.style.display = isThemesSectionVisible ? "block" : "none";
    myThemesArrow.textContent = isThemesSectionVisible ? "▲" : "▼";
    if (isThemesSectionVisible) {
      renderCustomThemes();
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
    '\n      <div class="ast-header"><span class="ast-header-title">Updates</span><button class="ast-header-min" id="updateMin">−</button></div>\n      <div class="ast-body" id="updateBody" style="overflow-y:auto;max-height:220px;">\n        <ul class="ast-update-list">\n         <li><strong>v1.8</strong> — Fixed Astra-Vision (Shadows not being Removed), added Custom Themes Feature, fixed enable/disable for sliders, fixed ESP not working properly/gltiched.</li>\n          <li><strong>v1.7</strong> — New Features and Organization.</li>\n        </ul>\n      </div>';
  document.body.appendChild(updatePanel);
  const updateBody = updatePanel.querySelector("#updateBody");
  let isMinimized = false;
  updatePanel.querySelector("#updateMin").onclick = (event) => {
    event.stopPropagation();
    isMinimized = !isMinimized;
    updateBody.style.display = isMinimized ? "none" : "block";
    updatePanel.querySelector("#updateMin").textContent = isMinimized
      ? "+"
      : "−";
  };
  makeDraggable(updatePanel);
  return updatePanel;
}
function togglePanelsVisibility() {
  const panelIds = [
    "deep-tools-panel",
    "vision-panel",
    "combat-panel",
    "automation-panel",
    "update-history",
    "settings-panel",
  ];
  const mainPanel = document.getElementById("deep-tools-panel");
  if (!mainPanel) {
    return;
  }
  const isMainPanelVisible = mainPanel.style.display !== "none";
  panelIds.forEach((elementId) => {
    const targetElement = document.getElementById(elementId);
    if (targetElement) {
      targetElement.style.display = isMainPanelVisible ? "none" : "block";
    }
  });
}

export {
  refreshUI,
  showHalloweenModal,
  makeDraggable,
  createToolsPanel,
  createVisionPanel,
  createCombatPanel,
  createAutomationPanel,
  createSettingsPanel,
  createUpdateHistoryPanel,
};
