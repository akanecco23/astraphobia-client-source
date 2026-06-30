import {
  toggleEsp,
  trackPlayer,
  toggleEsp_2,
  toggleMinimapSize,
  toggleEsp_3,
} from "../features/esp.js";
import {
  radius,
  hookTextEncoder,
  initAntiTamper,
  startAutoFarm,
  state,
} from "../core.js";
import {
  startScheduledTask,
  stopInterval,
  simulateChatInput,
} from "../features/chat.js";
import { setupPatrolPoints, stopAutoFarm } from "../features/autofarm.js";
import { featuresentitytrailState } from "../features/entitytrail.js";
import { toggleLock, enableAutoDodge } from "../features/aimbot.js";
import { toggleMouseSimulation } from "../features/movement.js";
import { initializeViewportHacks } from "../features/xray.js";
import { showNotification, typeText } from "./interaction.js";
import { setTheme, initHomeBackground } from "./theme.js";
import { generateRandomString } from "../utils.js";

window.lockKey = "t";
window.entityTraceKey = "h";

function refreshUI() {}
function showHalloweenCodeModal(onUnlockCallback) {
  const modalOverlay = document.createElement("div");
  modalOverlay.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:100001;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s ease;";
  modalOverlay.innerHTML =
    '<div style="background:#1a1a1a;padding:32px;border-radius:8px;text-align:center;max-width:400px;width:90%;border:1px solid #333;">\n      <div style="color:#e0e0e0;font-size:18px;font-weight:600;margin-bottom:16px;">Halloween Access Code</div>\n      <input id="hwCodeInput" type="text" placeholder="Enter code..." style="background:#111;border:1px solid #333;color:#e0e0e0;border-radius:4px;padding:10px;font-size:14px;text-align:center;width:100%;box-sizing:border-box;margin-bottom:16px;outline:none;">\n      <div style="display:flex;gap:8px;">\n        <button id="hwCancelBtn" style="flex:1;background:#222;color:#888;border:1px solid #333;border-radius:4px;padding:10px;cursor:pointer;">Cancel</button>\n        <button id="hwSubmitBtn" style="flex:1;background:#ff6600;color:#fff;border:none;border-radius:4px;padding:10px;cursor:pointer;font-weight:600;">Redeem</button>\n      </div></div>';
  document.body.appendChild(modalOverlay);
  setTimeout(() => {
    modalOverlay.style.opacity = "1";
  }, 10);
  const codeInput = modalOverlay.querySelector("#hwCodeInput");
  const closeModal = () => {
    modalOverlay.style.opacity = "0";
    setTimeout(() => modalOverlay.remove(), 300);
  };
  modalOverlay.querySelector("#hwSubmitBtn").onclick = () => {
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
  modalOverlay.querySelector("#hwCancelBtn").onclick = () => {
    closeModal();
    onUnlockCallback(false);
  };
  codeInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      modalOverlay.querySelector("#hwSubmitBtn").click();
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
    const handleMouseMove = (mouseEvent) => {
      if (
        !hasMoved &&
        (Math.abs(mouseEvent.clientX - event.clientX) > 5 ||
          Math.abs(mouseEvent.clientY - event.clientY) > 5)
      ) {
        hasMoved = true;
      }
      if (isDragging) {
        element.style.left = mouseEvent.clientX - offsetX + "px";
        element.style.top = mouseEvent.clientY - offsetY + "px";
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
  toolsPanel.querySelector("#mainMin").onclick = (toggleEvent) => {
    toggleEvent.stopPropagation();
    isHidden = !isHidden;
    mainBody.style.display = isHidden ? "none" : "block";
    toolsPanel.querySelector("#mainMin").textContent = isHidden ? "+" : "−";
  };
  toolsPanel.querySelector("#sendBtn").onclick = () => {
    const chatMessage = toolsPanel.querySelector("#chatMsg").value;
    if (chatMessage) {
      simulateChatInput(chatMessage);
    }
  };
  const spinButton = toolsPanel.querySelector("#autoChatBtn");
  spinButton.onclick = () => {
    const chatMessage_2 = toolsPanel.querySelector("#chatMsg").value;
    const delay = parseInt(toolsPanel.querySelector("#delayInput").value) || 10;
    if (!chatMessage_2) {
      showNotification("Enter a message first");
      return;
    }
    if (state.isToggled) {
      stopInterval();
      spinButton.textContent = "Auto Chat";
      spinButton.classList.remove("toggle-on");
    } else {
      startScheduledTask(chatMessage_2, delay);
      spinButton.textContent = "Stop Chat";
      spinButton.classList.add("toggle-on");
    }
  };
  const patchButton = toolsPanel.querySelector("#patchBtn");
  patchButton.onclick = () => {
    hookTextEncoder();
    patchButton.textContent = "Special Chars Active";
    patchButton.disabled = true;
    patchButton.classList.add("toggle-on");
  };
  toolsPanel.querySelector("#spoofBtn").onclick = () => {
    const randomString = generateRandomString(8);
    if (typeText(".play-game .el-input__inner", randomString)) {
      showNotification("Name spoofed");
    } else if (typeText(".new-tribe .el-input__inner", randomString)) {
      showNotification("Tribe name spoofed");
    } else {
      showNotification("No name input found");
    }
  };
  const spinButton_2 = toolsPanel.querySelector("#spinBtn");
  spinButton_2.onclick = () => {
    toggleMouseSimulation();
    spinButton_2.textContent = featuresentitytrailState.entityTrailInterval_2
      ? "Stop Spin"
      : "Auto Spin";
    spinButton_2.classList.toggle(
      "toggle-on",
      !!featuresentitytrailState.entityTrailInterval_2,
    );
  };
  const turnRightKeyInput = toolsPanel.querySelector("#spinKeyInput");
  let lastPressedKey = null;
  turnRightKeyInput.addEventListener("keydown", (keydownEvent) => {
    keydownEvent.preventDefault();
    lastPressedKey = keydownEvent.code || keydownEvent.key;
    turnRightKeyInput.value = lastPressedKey.replace("Key", "").toUpperCase();
  });
  document.addEventListener("keydown", (keyupEvent) => {
    if (
      lastPressedKey &&
      keyupEvent.code === lastPressedKey &&
      !keyupEvent.target.matches("input,textarea,button,select")
    ) {
      keyupEvent.preventDefault();
      toggleMouseSimulation();
      spinButton_2.textContent = featuresentitytrailState.entityTrailInterval_2
        ? "Stop Spin"
        : "Auto Spin";
      spinButton_2.classList.toggle(
        "toggle-on",
        !!featuresentitytrailState.entityTrailInterval_2,
      );
    }
  });
  const turnRightKeyInput_2 = toolsPanel.querySelector("#turnLeftKeyInput");
  const turnRightKeyInput_3 = toolsPanel.querySelector("#turnRightKeyInput");
  turnRightKeyInput_2.value = state.keyQ.toUpperCase();
  turnRightKeyInput_3.value = state.keyE.toUpperCase();
  turnRightKeyInput_2.addEventListener("keydown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    state.keyQ = event.key;
    turnRightKeyInput_2.value =
      event.key.length === 1 ? event.key.toUpperCase() : event.key;
  });
  turnRightKeyInput_3.addEventListener("keydown", (event_2) => {
    event_2.preventDefault();
    event_2.stopPropagation();
    state.keyE = event_2.key;
    turnRightKeyInput_3.value =
      event_2.key.length === 1 ? event_2.key.toUpperCase() : event_2.key;
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
  const espColorsSection = visionPanel.querySelector("#visionBody");
  let isHidden = false;
  visionPanel.querySelector("#visionMin").onclick = (clickEvent) => {
    clickEvent.stopPropagation();
    isHidden = !isHidden;
    espColorsSection.style.display = isHidden ? "none" : "block";
    visionPanel.querySelector("#visionMin").textContent = isHidden ? "+" : "−";
  };
  visionPanel.querySelector("#thresherBtn").onclick = (submitEvent) => {
    submitEvent.preventDefault();
    showNotification("Thresher boost has been patched");
  };
  const astraVisionBtn = visionPanel.querySelector("#astraVisionBtn");
  astraVisionBtn.onclick = () => {
    if (state.isProcessed_3) {
      showNotification("Already active");
      return;
    }
    initAntiTamper();
    initializeViewportHacks();
    astraVisionBtn.textContent = "Astra-Vision ✓";
    astraVisionBtn.classList.add("toggle-on");
    astraVisionBtn.disabled = true;
  };
  const espBtn = visionPanel.querySelector("#smallMinimapBtn");
  espBtn.onclick = () => {
    initAntiTamper();
    toggleMinimapSize();
    espBtn.textContent = state.isToggled_2 ? "Minimap: Small" : "Small Minimap";
    espBtn.classList.toggle("toggle-on", state.isToggled_2);
  };
  const espBtn_2 = visionPanel.querySelector("#espBtn");
  espBtn_2.onclick = () => {
    toggleEsp();
    espBtn_2.textContent = window.espEnabled ? "ESP ✓" : "ESP";
    espBtn_2.classList.toggle("toggle-on", window.espEnabled);
  };
  const espModeSelect = visionPanel.querySelector("#espModeSelect");
  espModeSelect.value = window.espMode || "players";
  espModeSelect.onchange = (changeEvent) => {
    window.espMode = changeEvent.target.value;
    showNotification("ESP: " + changeEvent.target.value);
  };
  visionPanel.querySelector("#trackNearestBtn").onclick = () => trackPlayer();
  visionPanel.querySelector("#untrackBtn").onclick = () => toggleEsp_2();
  const espColorsToggleBtn = visionPanel.querySelector("#espColorsToggleBtn");
  const espColorsSection_2 = visionPanel.querySelector("#espColorsSection");
  const espColorsArrow = visionPanel.querySelector("#espColorsArrow");
  let isHidden_2 = false;
  espColorsToggleBtn.onclick = () => {
    isHidden_2 = !isHidden_2;
    espColorsSection_2.style.display = isHidden_2 ? "block" : "none";
    espColorsArrow.textContent = isHidden_2 ? "▲" : "▼";
  };
  const eventInit = {
    espColorClose: "close",
    espColorMedium: "medium",
    espColorFar: "far",
    espColorVeryFar: "veryFar",
    espColorTracked: "tracked",
    espColorFoodClose: "foodClose",
    espColorFoodMedium: "foodMedium",
    espColorFoodFar: "foodFar",
  };
  Object.entries(eventInit).forEach(([elementId, colorKey]) => {
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
  lockKeyInput.addEventListener("keydown", (lockKeyEvent) => {
    lockKeyEvent.preventDefault();
    lockKeyEvent.stopPropagation();
    window.lockKey = lockKeyEvent.key;
    lockKeyInput.value =
      lockKeyEvent.key.length === 1
        ? lockKeyEvent.key.toUpperCase()
        : lockKeyEvent.key;
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
  traceKeyInput.addEventListener("keydown", (traceKeyEvent) => {
    traceKeyEvent.preventDefault();
    traceKeyEvent.stopPropagation();
    window.entityTraceKey = traceKeyEvent.key.toLowerCase();
    traceKeyInput.value =
      traceKeyEvent.key.length === 1
        ? traceKeyEvent.key.toUpperCase()
        : traceKeyEvent.key;
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
    '\n      <div class="ast-header"><span class="ast-header-title">Astraphobia Client</span><button class="ast-header-min" id="autoMin">−</button></div>\n      <div class="ast-body" id="autoBody">\n        <span class="ast-section-label">Automation</span>\n        <button class="ast-btn" id="autoDodgeBtn">Auto Dodge</button>\n        <button class="ast-btn" id="autoFarmBtn">Auto Farm (F5)</button>\n        <select class="ast-select" id="farmModeSelect" style="margin-top:4px;">\n          <option value="nearest">Nearest Food</option>\n          <option value="cluster">Food Clusters</option>\n          <option value="patrol">Patrol Route</option>\n        </select>\n        <div class="ast-toggle-row"><label for="farmBoostToggle">Boost</label><div class="ast-switch"><input type="checkbox" id="farmBoostToggle" checked><span class="slider"></span></div></div>\n        <div class="ast-toggle-row"><label for="farmEvolveToggle">Auto Evolve</label><div class="ast-switch"><input type="checkbox" id="farmEvolveToggle" checked><span class="slider"></span></div></div>\n        <div class="ast-toggle-row"><label for="farmAvoidToggle">Avoid Players</label><div class="ast-switch"><input type="checkbox" id="farmAvoidToggle" checked><span class="slider"></span></div></div>\n      </div>';
  document.body.appendChild(automationPanel);
  const automationBody = automationPanel.querySelector("#autoBody");
  let isAutomationMinimized = false;
  automationPanel.querySelector("#autoMin").onclick = (toggleEvent) => {
    toggleEvent.stopPropagation();
    isAutomationMinimized = !isAutomationMinimized;
    automationBody.style.display = isAutomationMinimized ? "none" : "block";
    automationPanel.querySelector("#autoMin").textContent =
      isAutomationMinimized ? "+" : "−";
  };
  const autoDodgeButton = automationPanel.querySelector("#autoDodgeBtn");
  autoDodgeButton.onclick = () => {
    if (window.autoDodgeEnabled) {
      toggleEsp_3();
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
  farmModeSelect.onchange = (modeEvent) => {
    if (window.autoFarmActive) {
      window.autoFarmMode = modeEvent.target.value;
      if (modeEvent.target.value === "patrol") {
        setupPatrolPoints();
      }
      showNotification("Farm: " + modeEvent.target.value);
    }
  };
  const farmAvoidToggle = automationPanel.querySelector("#farmBoostToggle");
  const farmAvoidToggle_2 = automationPanel.querySelector("#farmEvolveToggle");
  const farmAvoidToggle_3 = automationPanel.querySelector("#farmAvoidToggle");
  farmAvoidToggle.checked = window.autoFarmBoost;
  farmAvoidToggle_2.checked = window.autoFarmEvolve;
  farmAvoidToggle_3.checked = window.autoFarmAvoidPlayers;
  farmAvoidToggle.onchange = (boostEvent) =>
    (window.autoFarmBoost = boostEvent.target.checked);
  farmAvoidToggle_2.onchange = (evolveEvent) =>
    (window.autoFarmEvolve = evolveEvent.target.checked);
  farmAvoidToggle_3.onchange = (avoidPlayersEvent) =>
    (window.autoFarmAvoidPlayers = avoidPlayersEvent.target.checked);
  makeDraggable(automationPanel);
  return automationPanel;
}
function createSettingsPanel() {
  const settingsPanel = document.createElement("div");
  settingsPanel.id = "settings-panel";
  settingsPanel.className = "ast-panel";
  settingsPanel.style.cssText = "top:20px;left:20px;width:220px;";
  settingsPanel.innerHTML =
    '\n      <div class="ast-header"><span class="ast-header-title">Settings</span><button class="ast-header-min" id="settingsMin">−</button></div>\n      <div class="ast-body" id="settingsBody">\n        <div class="ast-key-row"><span>Toggle UI</span><input class="ast-key-capture" id="toggleKeyInput" type="text" value="SHIFT" readonly></div>\n        <div class="ast-sep"></div>\n        <span class="ast-section-label">Background</span>\n        <div class="ast-row"><input class="ast-input" type="text" id="bgUrl" placeholder="Image URL..." style="flex:1;"><button class="ast-btn" id="applyBg" style="width:auto;padding:6px 10px;margin:0;">Set</button></div>\n        <div class="ast-sep"></div>\n        <span class="ast-section-label">Theme</span>\n        <select class="ast-select" id="themeSelect">\n          <option value="grey">Grey</option><option value="blue">Blue</option><option value="red">Red</option>\n          <option value="green">Green</option><option value="pink">Pink</option><option value="starwars">Star Wars</option>\n          <option value="kfc">KFC</option><option value="halloween">Halloween 🔒</option>\n        </select>\n      </div>';
  document.body.appendChild(settingsPanel);
  const settingsBody = settingsPanel.querySelector("#settingsBody");
  let isSettingsMinimized = false;
  settingsPanel.querySelector("#settingsMin").onclick = (event) => {
    event.stopPropagation();
    isSettingsMinimized = !isSettingsMinimized;
    settingsBody.style.display = isSettingsMinimized ? "none" : "block";
    settingsPanel.querySelector("#settingsMin").textContent =
      isSettingsMinimized ? "+" : "−";
  };
  const toggleKeyInput = settingsPanel.querySelector("#toggleKeyInput");
  toggleKeyInput.value = state.activeKey.toUpperCase();
  toggleKeyInput.addEventListener("keydown", (keyboardEvent) => {
    keyboardEvent.preventDefault();
    state.activeKey = keyboardEvent.key;
    toggleKeyInput.value =
      keyboardEvent.key.length === 1
        ? keyboardEvent.key.toUpperCase()
        : keyboardEvent.key;
  });
  const bgUrlInput = settingsPanel.querySelector("#bgUrl");
  bgUrlInput.value = localStorage.getItem("bgUrl") || "";
  settingsPanel.querySelector("#applyBg").onclick = () => {
    const bgUrl = bgUrlInput.value.trim();
    if (!bgUrl) {
      showNotification("Enter a URL");
      return;
    }
    localStorage.setItem("bgUrl", bgUrl);
    initHomeBackground();
    showNotification("Background applied");
  };
  const themeSelectElement = settingsPanel.querySelector("#themeSelect");
  themeSelectElement.value = localStorage.getItem("theme") || "grey";
  themeSelectElement.onchange = (themeEvent) => {
    const myY = themeEvent.target.value;
    if (myY === "halloween") {
      showHalloweenCodeModal((myY) => {
        if (myY) {
          setTheme("halloween");
        } else {
          themeEvent.target.value = localStorage.getItem("theme") || "grey";
        }
      });
    } else {
      setTheme(myY);
      showNotification("Theme: " + myY);
    }
  };
  makeDraggable(settingsPanel);
  return settingsPanel;
}
function createUpdatePanel() {
  const updatePanel = document.createElement("div");
  updatePanel.id = "update-history";
  updatePanel.className = "ast-panel";
  updatePanel.style.cssText =
    "bottom:20px;left:20px;width:230px;max-height:280px;";
  updatePanel.innerHTML =
    '\n      <div class="ast-header"><span class="ast-header-title">Updates</span><button class="ast-header-min" id="updateMin">−</button></div>\n      <div class="ast-body" id="updateBody" style="overflow-y:auto;max-height:220px;">\n        <ul class="ast-update-list">\n          <li><strong>v1.7</strong> — New Features and Organization.</li>\n        </ul>\n      </div>';
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
function togglePanelsVisibility() {
  const panelIds = [
    "deep-tools-panel",
    "vision-panel",
    "combat-panel",
    "automation-panel",
    "update-history",
    "settings-panel",
  ];
  const deepToolsPanel = document.getElementById("deep-tools-panel");
  if (!deepToolsPanel) {
    return;
  }
  const isVisible = deepToolsPanel.style.display !== "none";
  panelIds.forEach((elementId) => {
    const targetElement = document.getElementById(elementId);
    if (targetElement) {
      targetElement.style.display = isVisible ? "none" : "block";
    }
  });
}

export {
  refreshUI,
  showHalloweenCodeModal,
  makeDraggable,
  createToolsPanel,
  createVisionPanel,
  createCombatPanel,
  createAutomationPanel,
  createSettingsPanel,
  createUpdatePanel,
  togglePanelsVisibility,
};
