import {
  toggleEsp,
  trackPlayer,
  modToggleEsp,
  toggleMinimapSize,
  v571eToggleEsp,
} from "../features/esp.js";
import {
  radius,
  interceptTextEncoder,
  initGameHooks,
  startAutoFarm,
  state,
} from "../core.js";
import {
  startScheduledTask,
  stopInterval,
  typeAndSendMessage,
} from "../features/chat.js";
import { setupPatrolPoints, stopAutoFarm } from "../features/autofarm.js";
import { featuresentitytrailState } from "../features/entitytrail.js";
import { toggleLock, enableAutoDodge } from "../features/aimbot.js";
import { toggleMouseSimulation } from "../features/movement.js";
import { showNotification, typeText } from "./interaction.js";
import { initializeAstraVision } from "../features/xray.js";
import { applyTheme, initBackground } from "./theme.js";
import { generateRandomString } from "../utils.js";

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
  let v26b8OffsetX;
  let v58cdOffsetY;
  let isDragging = false;
  let hasMoved = false;
  element.addEventListener("mousedown", (v5309Event) => {
    if (
      ["BUTTON", "INPUT", "TEXTAREA", "SELECT", "A", "LABEL"].includes(
        v5309Event.target.tagName,
      )
    ) {
      return;
    }
    if (v5309Event.target.closest("button,input,textarea,select,label")) {
      return;
    }
    isDragging = true;
    hasMoved = false;
    v26b8OffsetX = v5309Event.clientX - element.getBoundingClientRect().left;
    v58cdOffsetY = v5309Event.clientY - element.getBoundingClientRect().top;
    element.style.transition = "none";
    const handleMouseMove = (v2a7cEvent) => {
      if (
        !hasMoved &&
        (Math.abs(v2a7cEvent.clientX - v5309Event.clientX) > 5 ||
          Math.abs(v2a7cEvent.clientY - v5309Event.clientY) > 5)
      ) {
        hasMoved = true;
      }
      if (isDragging) {
        element.style.left = v2a7cEvent.clientX - v26b8OffsetX + "px";
        element.style.top = v2a7cEvent.clientY - v58cdOffsetY + "px";
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
  element.addEventListener("click", (v5d21Event) => {
    if (hasMoved) {
      v5d21Event.stopImmediatePropagation();
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
  const Body = toolsPanel.querySelector("#mainBody");
  let isHidden = false;
  toolsPanel.querySelector("#mainMin").onclick = (toggleEvent) => {
    toggleEvent.stopPropagation();
    isHidden = !isHidden;
    Body.style.display = isHidden ? "none" : "block";
    toolsPanel.querySelector("#mainMin").textContent = isHidden ? "+" : "−";
  };
  toolsPanel.querySelector("#sendBtn").onclick = () => {
    const chatMessage = toolsPanel.querySelector("#chatMsg").value;
    if (chatMessage) {
      typeAndSendMessage(chatMessage);
    }
  };
  const v3fd5SpinBtn = toolsPanel.querySelector("#autoChatBtn");
  v3fd5SpinBtn.onclick = () => {
    const chatInputContent = toolsPanel.querySelector("#chatMsg").value;
    const messageDelay =
      parseInt(toolsPanel.querySelector("#delayInput").value) || 10;
    if (!chatInputContent) {
      showNotification("Enter a message first");
      return;
    }
    if (state.IsToggled) {
      stopInterval();
      v3fd5SpinBtn.textContent = "Auto Chat";
      v3fd5SpinBtn.classList.remove("toggle-on");
    } else {
      startScheduledTask(chatInputContent, messageDelay);
      v3fd5SpinBtn.textContent = "Stop Chat";
      v3fd5SpinBtn.classList.add("toggle-on");
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
    const randomIdentifier = generateRandomString(8);
    if (typeText(".play-game .el-input__inner", randomIdentifier)) {
      showNotification("Name spoofed");
    } else if (typeText(".new-tribe .el-input__inner", randomIdentifier)) {
      showNotification("Tribe name spoofed");
    } else {
      showNotification("No name input found");
    }
  };
  const v3fd5V3fd5SpinBtn = toolsPanel.querySelector("#spinBtn");
  v3fd5V3fd5SpinBtn.onclick = () => {
    toggleMouseSimulation();
    v3fd5V3fd5SpinBtn.textContent =
      featuresentitytrailState.sysEntityTrailInterval
        ? "Stop Spin"
        : "Auto Spin";
    v3fd5V3fd5SpinBtn.classList.toggle(
      "toggle-on",
      !!featuresentitytrailState.sysEntityTrailInterval,
    );
  };
  const v239bTurnRightKeyInput = toolsPanel.querySelector("#spinKeyInput");
  let lastPressedKey = null;
  v239bTurnRightKeyInput.addEventListener("keydown", (keyboardEvent) => {
    keyboardEvent.preventDefault();
    lastPressedKey = keyboardEvent.code || keyboardEvent.key;
    v239bTurnRightKeyInput.value = lastPressedKey
      .replace("Key", "")
      .toUpperCase();
  });
  document.addEventListener("keydown", (shortcutEvent) => {
    if (
      lastPressedKey &&
      shortcutEvent.code === lastPressedKey &&
      !shortcutEvent.target.matches("input,textarea,button,select")
    ) {
      shortcutEvent.preventDefault();
      toggleMouseSimulation();
      v3fd5V3fd5SpinBtn.textContent =
        featuresentitytrailState.sysEntityTrailInterval
          ? "Stop Spin"
          : "Auto Spin";
      v3fd5V3fd5SpinBtn.classList.toggle(
        "toggle-on",
        !!featuresentitytrailState.sysEntityTrailInterval,
      );
    }
  });
  const v8332V239bTurnRightKeyInput =
    toolsPanel.querySelector("#turnLeftKeyInput");
  const v239bV239bTurnRightKeyInput =
    toolsPanel.querySelector("#turnRightKeyInput");
  v8332V239bTurnRightKeyInput.value = state.keyQ.toUpperCase();
  v239bV239bTurnRightKeyInput.value = state.keyE.toUpperCase();
  v8332V239bTurnRightKeyInput.addEventListener(
    "keydown",
    (contextMenuEvent) => {
      contextMenuEvent.preventDefault();
      contextMenuEvent.stopPropagation();
      state.keyQ = contextMenuEvent.key;
      v8332V239bTurnRightKeyInput.value =
        contextMenuEvent.key.length === 1
          ? contextMenuEvent.key.toUpperCase()
          : contextMenuEvent.key;
    },
  );
  v239bV239bTurnRightKeyInput.addEventListener("keydown", (dragEvent) => {
    dragEvent.preventDefault();
    dragEvent.stopPropagation();
    state.keyE = dragEvent.key;
    v239bV239bTurnRightKeyInput.value =
      dragEvent.key.length === 1 ? dragEvent.key.toUpperCase() : dragEvent.key;
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
  const v1386EspColorsSection = visionPanel.querySelector("#visionBody");
  let v1bcfIsHidden = false;
  visionPanel.querySelector("#visionMin").onclick = (v5654ToggleEvent) => {
    v5654ToggleEvent.stopPropagation();
    v1bcfIsHidden = !v1bcfIsHidden;
    v1386EspColorsSection.style.display = v1bcfIsHidden ? "none" : "block";
    visionPanel.querySelector("#visionMin").textContent = v1bcfIsHidden
      ? "+"
      : "−";
  };
  visionPanel.querySelector("#thresherBtn").onclick = (boostEvent) => {
    boostEvent.preventDefault();
    showNotification("Thresher boost has been patched");
  };
  const astraVisionBtn = visionPanel.querySelector("#astraVisionBtn");
  astraVisionBtn.onclick = () => {
    if (state.globalIsProcessed) {
      showNotification("Already active");
      return;
    }
    initGameHooks();
    initializeAstraVision();
    astraVisionBtn.textContent = "Astra-Vision ✓";
    astraVisionBtn.classList.add("toggle-on");
    astraVisionBtn.disabled = true;
  };
  const v2735EspBtn = visionPanel.querySelector("#smallMinimapBtn");
  v2735EspBtn.onclick = () => {
    initGameHooks();
    toggleMinimapSize();
    v2735EspBtn.textContent = state.boolIsToggled
      ? "Minimap: Small"
      : "Small Minimap";
    v2735EspBtn.classList.toggle("toggle-on", state.boolIsToggled);
  };
  const v2735V2735EspBtn = visionPanel.querySelector("#espBtn");
  v2735V2735EspBtn.onclick = () => {
    toggleEsp();
    v2735V2735EspBtn.textContent = window.espEnabled ? "ESP ✓" : "ESP";
    v2735V2735EspBtn.classList.toggle("toggle-on", window.espEnabled);
  };
  const espModeSelect = visionPanel.querySelector("#espModeSelect");
  espModeSelect.value = window.espMode || "players";
  espModeSelect.onchange = (espModeEvent) => {
    window.espMode = espModeEvent.target.value;
    showNotification("ESP: " + espModeEvent.target.value);
  };
  visionPanel.querySelector("#trackNearestBtn").onclick = () => trackPlayer();
  visionPanel.querySelector("#untrackBtn").onclick = () => modToggleEsp();
  const espColorsToggleBtn = visionPanel.querySelector("#espColorsToggleBtn");
  const v1386V1386EspColorsSection =
    visionPanel.querySelector("#espColorsSection");
  const espColorsArrow = visionPanel.querySelector("#espColorsArrow");
  let v1bcfV1bcfIsHidden = false;
  espColorsToggleBtn.onclick = () => {
    v1bcfV1bcfIsHidden = !v1bcfV1bcfIsHidden;
    v1386V1386EspColorsSection.style.display = v1bcfV1bcfIsHidden
      ? "block"
      : "none";
    espColorsArrow.textContent = v1bcfV1bcfIsHidden ? "▲" : "▼";
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
    const v28c3TargetElement = visionPanel.querySelector("#" + elementId);
    if (v28c3TargetElement) {
      v28c3TargetElement.addEventListener("input", (d8c8Event) => {
        window.espColors[colorKey] = d8c8Event.target.value;
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
  combatPanel.querySelector("#combatMin").onclick = (v5e01ToggleEvent) => {
    v5e01ToggleEvent.stopPropagation();
    isCombatMinimized = !isCombatMinimized;
    combatBody.style.display = isCombatMinimized ? "none" : "block";
    combatPanel.querySelector("#combatMin").textContent = isCombatMinimized
      ? "+"
      : "−";
  };
  const v5301LockButton = combatPanel.querySelector("#lockBtn");
  v5301LockButton.onclick = () => toggleLock();
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
      v571eToggleEsp();
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
  const v3419FarmAvoidToggle =
    automationPanel.querySelector("#farmBoostToggle");
  const fa20V3419FarmAvoidToggle =
    automationPanel.querySelector("#farmEvolveToggle");
  const v3419V3419FarmAvoidToggle =
    automationPanel.querySelector("#farmAvoidToggle");
  v3419FarmAvoidToggle.checked = window.autoFarmBoost;
  fa20V3419FarmAvoidToggle.checked = window.autoFarmEvolve;
  v3419V3419FarmAvoidToggle.checked = window.autoFarmAvoidPlayers;
  const farmBoostLabel = v3419FarmAvoidToggle.nextElementSibling;
  farmBoostLabel.addEventListener("click", (farmOptionEvent1) => {
    farmOptionEvent1.stopPropagation();
    v3419FarmAvoidToggle.checked = !v3419FarmAvoidToggle.checked;
    window.autoFarmBoost = v3419FarmAvoidToggle.checked;
    showNotification(
      v3419FarmAvoidToggle.checked ? "Farm boost ON" : "Farm boost OFF",
    );
  });
  const farmEvolveLabel = fa20V3419FarmAvoidToggle.nextElementSibling;
  farmEvolveLabel.addEventListener("click", (farmOptionEvent2) => {
    farmOptionEvent2.stopPropagation();
    fa20V3419FarmAvoidToggle.checked = !fa20V3419FarmAvoidToggle.checked;
    window.autoFarmEvolve = fa20V3419FarmAvoidToggle.checked;
    showNotification(
      fa20V3419FarmAvoidToggle.checked ? "Auto evolve ON" : "Auto evolve OFF",
    );
  });
  const farmAvoidLabel = v3419V3419FarmAvoidToggle.nextElementSibling;
  farmAvoidLabel.addEventListener("click", (farmOptionEvent3) => {
    farmOptionEvent3.stopPropagation();
    v3419V3419FarmAvoidToggle.checked = !v3419V3419FarmAvoidToggle.checked;
    window.autoFarmAvoidPlayers = v3419V3419FarmAvoidToggle.checked;
    showNotification(
      v3419V3419FarmAvoidToggle.checked
        ? "Avoid players ON"
        : "Avoid players OFF",
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
  const MyThemesSection = settingsPanel.querySelector("#settingsBody");
  let v4198IsHidden = false;
  settingsPanel.querySelector("#settingsMin").onclick = (v253cEvent) => {
    v253cEvent.stopPropagation();
    v4198IsHidden = !v4198IsHidden;
    MyThemesSection.style.display = v4198IsHidden ? "none" : "block";
    settingsPanel.querySelector("#settingsMin").textContent = v4198IsHidden
      ? "+"
      : "−";
  };
  const toggleKeyInput = settingsPanel.querySelector("#toggleKeyInput");
  toggleKeyInput.value = state.activeKey.toUpperCase();
  toggleKeyInput.addEventListener("keydown", (v32f1KeyboardEvent) => {
    v32f1KeyboardEvent.preventDefault();
    state.activeKey = v32f1KeyboardEvent.key;
    toggleKeyInput.value =
      v32f1KeyboardEvent.key.length === 1
        ? v32f1KeyboardEvent.key.toUpperCase()
        : v32f1KeyboardEvent.key;
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
    initBackground();
    showNotification("Background applied");
  };
  const themeSelect = settingsPanel.querySelector("#themeSelect");
  const v17a7Angle = localStorage.getItem("theme") || "grey";
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
    presetThemes.includes(v17a7Angle) || customThemes[v17a7Angle]
      ? v17a7Angle
      : "grey";
  themeSelect.onchange = (themeChangeEvent) => {
    const v48deMyY = themeChangeEvent.target.value;
    if (v48deMyY === "halloween") {
      showHalloweenModal((isHalloween) => {
        if (isHalloween) {
          applyTheme("halloween");
        } else {
          themeChangeEvent.target.value =
            localStorage.getItem("theme") || "grey";
        }
      });
    } else {
      applyTheme(v48deMyY);
      showNotification("Theme: " + v48deMyY);
    }
  };
  const renderCustomThemes = () => {
    const customThemeList = settingsPanel.querySelector("#customThemeList");
    const noThemesMessage = settingsPanel.querySelector("#noThemesMsg");
    const v4d42CustomThemes = JSON.parse(
      localStorage.getItem("customThemes") || "{}",
    );
    const customThemeKeys = Object.keys(v4d42CustomThemes);
    customThemeList.innerHTML = "";
    noThemesMessage.style.display =
      customThemeKeys.length === 0 ? "block" : "none";
    customThemeKeys.forEach((v1928MyY) => {
      const themeElement = document.createElement("div");
      themeElement.style.cssText = "display:flex;gap:4px;margin-bottom:3px;";
      const isThemeActive = localStorage.getItem("theme") === v1928MyY;
      themeElement.innerHTML =
        '\n          <button class="ast-btn' +
        (isThemeActive ? " toggle-on" : "") +
        '" style="flex:1;margin:0;">' +
        v1928MyY +
        '</button>\n          <button class="ast-btn" style="width:32px;margin:0;text-align:center;color:#f44336;">✕</button>';
      themeElement.querySelectorAll("button")[0].onclick = () => {
        applyTheme(v1928MyY);
        showNotification("Theme: " + v1928MyY);
        renderCustomThemes();
      };
      themeElement.querySelectorAll("button")[1].onclick = () => {
        const v2f0cCustomThemes = JSON.parse(
          localStorage.getItem("customThemes") || "{}",
        );
        delete v2f0cCustomThemes[v1928MyY];
        localStorage.setItem("customThemes", JSON.stringify(v2f0cCustomThemes));
        if (localStorage.getItem("theme") === v1928MyY) {
          applyTheme("grey");
          themeSelect.value = "grey";
          showNotification("Theme reset to Grey");
        } else {
          showNotification("Deleted: " + v1928MyY);
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
    const v2cacRed = parseInt(accountValue.slice(1, 3), 16);
    const v11cfGreen = parseInt(accountValue.slice(3, 5), 16);
    const v3783Blue = parseInt(accountValue.slice(5, 7), 16);
    const adjustColor = (hexColor) => {
      const redComponent = parseInt(hexColor.slice(1, 3), 16) + 10;
      const greenComponent = parseInt(hexColor.slice(3, 5), 16) + 10;
      const blueComponent = parseInt(hexColor.slice(5, 7), 16) + 10;
      return (
        "#" +
        [redComponent, greenComponent, blueComponent]
          .map((v5bd4ColorValue) =>
            Math.min(255, v5bd4ColorValue).toString(16).padStart(2, "0"),
          )
          .join("")
      );
    };
    const themeSettings = {
      acc: accountValue,
      accH: adjustColor(accountValue),
      accRGB: v2cacRed + "," + v11cfGreen + "," + v3783Blue,
      text: "#e0e0e0",
      textSec: "#888",
      bg1: themeBgColor,
      bg2: themePanelColor,
      bg3: adjustColor(themePanelColor),
      border: "#333",
      hover: adjustColor(themePanelColor),
    };
    const v551fCustomThemes = JSON.parse(
      localStorage.getItem("customThemes") || "{}",
    );
    v551fCustomThemes[customThemeName] = themeSettings;
    localStorage.setItem("customThemes", JSON.stringify(v551fCustomThemes));
    applyTheme(customThemeName);
    settingsPanel.querySelector("#customThemeName").value = "";
    renderCustomThemes();
    showNotification("Theme saved: " + customThemeName);
  };
  const v4b6aMyThemesToggleBtn = settingsPanel.querySelector(
    "#customThemeToggleBtn",
  );
  const cf1dMyThemesSection = settingsPanel.querySelector(
    "#customThemeSection",
  );
  const v465cMyThemesArrow = settingsPanel.querySelector("#customThemeArrow");
  let v781fV4198IsHidden = false;
  v4b6aMyThemesToggleBtn.onclick = () => {
    v781fV4198IsHidden = !v781fV4198IsHidden;
    cf1dMyThemesSection.style.display = v781fV4198IsHidden ? "block" : "none";
    v465cMyThemesArrow.textContent = v781fV4198IsHidden ? "▲" : "▼";
  };
  const v4b6aV4b6aMyThemesToggleBtn =
    settingsPanel.querySelector("#myThemesToggleBtn");
  const c0ccMyThemesSection = settingsPanel.querySelector("#myThemesSection");
  const v465cV465cMyThemesArrow = settingsPanel.querySelector("#myThemesArrow");
  let v4198V4198IsHidden = false;
  v4b6aV4b6aMyThemesToggleBtn.onclick = () => {
    v4198V4198IsHidden = !v4198V4198IsHidden;
    c0ccMyThemesSection.style.display = v4198V4198IsHidden ? "block" : "none";
    v465cV465cMyThemesArrow.textContent = v4198V4198IsHidden ? "▲" : "▼";
    if (v4198V4198IsHidden) {
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
  updatePanel.querySelector("#updateMin").onclick = (da88Event) => {
    da88Event.stopPropagation();
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
  const Panel = document.getElementById("deep-tools-panel");
  if (!Panel) {
    return;
  }
  const isMainPanelVisible = Panel.style.display !== "none";
  panelIds.forEach((v7986ElementId) => {
    const v123eTargetElement = document.getElementById(v7986ElementId);
    if (v123eTargetElement) {
      v123eTargetElement.style.display = isMainPanelVisible ? "none" : "block";
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
  togglePanelsVisibility,
};
