import { simulateTextInput, showNotification, initAutofillName, typeChatMessage, initializeTextInterceptor, makeElementDraggable, showHalloweenCodeModal } from './interaction.js';
import { startRepeatingTask, stopChatTimer } from '../features/chat.js';
import { generateRandomString } from '../utils.js';
import { toggleAutoPointerMovement } from '../features/movement.js';
import { initAntiDetection } from '../features/antidetection.js';
import { initializeAstraVision } from '../features/xray.js';
import { toggleMinimapSize, setupPatrolRoute, startAutoFarm, stopAutoFarm } from '../features/autofarm.js';
import { toggleEsp } from '../features/esp.js';
import { trackNearestPlayer, clearTracking, toggleLock, enableAutoDodge, disableAutoDodge } from '../features/aimbot.js';
import { applyTheme, initBackgroundImage } from './theme.js';
import { audioPlayer, musicPlaylist, youtubePlayer, pausePlayback, resumePlayback, resetPlayback, isPlaying, playNextOrRandom, playPrevious, updateMusicPanel, uiaudioState } from './audio.js';
import { addTrackToPlaylist } from '../storage.js';
import { state } from '../core.js';

window.lockKey = "t";


let pressedKeyQ = "q";
let pressedKeyE = "e";
function createToolsPanel() {
  const toolsPanel = document.createElement("div");
  toolsPanel.id = "deep-tools-panel";
  toolsPanel.className = "ast-panel";
  toolsPanel.style.cssText = "bottom:20px;right:20px;width:230px;";
  toolsPanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Astraphobia Client</span><button class=\"ast-header-min\" id=\"mainMin\">−</button></div>\n      <div class=\"ast-body\" id=\"mainBody\">\n                    <span class=\"ast-section-label\">Autofill Name</span>\n        <div class=\"ast-row\" style=\"margin-bottom:6px;\">\n          <input class=\"ast-input\" type=\"text\" id=\"savedNameDisplay\" placeholder=\"Enter name...\" style=\"flex:1;\">\n          <button class=\"ast-btn\" id=\"setNameBtn\" style=\"width:40px;padding:6px 5px;margin:0;flex-shrink:0;text-align:center;\">Set</button>\n          <button class=\"ast-btn\" id=\"clearNameBtn\" style=\"width:30px;padding:6px 5px;margin:0;flex-shrink:0;text-align:center;\">✕</button>\n        </div>\n        <span class=\"ast-section-label\">Chat</span>\n        <textarea class=\"ast-textarea\" id=\"chatMsg\" placeholder=\"Message...\" rows=\"2\"></textarea>\n        <button class=\"ast-btn\" id=\"sendBtn\">Send Chat</button>\n        <div class=\"ast-row\" style=\"margin-top:4px;\">\n          <input class=\"ast-input\" type=\"number\" id=\"delayInput\" min=\"1\" max=\"300\" value=\"10\" style=\"width:50px;text-align:center;\">\n          <span style=\"font-size:11px;color:#888;\">sec</span>\n          <button class=\"ast-btn\" id=\"autoChatBtn\" style=\"flex:1;margin-bottom:0;\">Auto Chat</button>\n        </div>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Tools</span>\n        <button class=\"ast-btn\" id=\"patchBtn\">Special Characters</button>\n        <button class=\"ast-btn\" id=\"spoofBtn\">Spoof Username</button>\n        <button class=\"ast-btn\" id=\"spinBtn\">Auto Spin</button>\n        <div class=\"ast-key-row\"><span>Spin key</span><input class=\"ast-key-capture\" id=\"spinKeyInput\" type=\"text\" placeholder=\"...\" readonly></div>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Turn Controls</span>\n        <div class=\"ast-key-row\">\n          <span>Turn Left</span>\n          <input class=\"ast-key-capture\" id=\"turnLeftKeyInput\" type=\"text\" value=\"Q\" readonly>\n        </div>\n        <div class=\"ast-key-row\">\n          <span>Turn Right</span>\n          <input class=\"ast-key-capture\" id=\"turnRightKeyInput\" type=\"text\" value=\"E\" readonly>\n        </div>\n        <div class=\"ast-credits\">Made by Astraphobia</div>\n      </div>";
  document.body.appendChild(toolsPanel);
  const mainBodyElement = toolsPanel.querySelector("#mainBody");
  let isVisible = false;
  toolsPanel.querySelector("#mainMin").onclick = event => {
    event.stopPropagation();
    isVisible = !isVisible;
    mainBodyElement.style.display = isVisible ? "none" : "block";
    toolsPanel.querySelector("#mainMin").textContent = isVisible ? "+" : "−";
  };
  toolsPanel.querySelector("#sendBtn").onclick = () => {
    const chatMessage = toolsPanel.querySelector("#chatMsg").value;
    if (chatMessage) {
      typeChatMessage(chatMessage);
    }
  };
  const autoChatButton = toolsPanel.querySelector("#autoChatBtn");
  autoChatButton.onclick = () => {
    const messageText = toolsPanel.querySelector("#chatMsg").value;
    const delayValue = parseInt(toolsPanel.querySelector("#delayInput").value) || 10;
    if (!messageText) {
      showNotification("Enter a message first");
      return;
    }
    if (state.isLooping) {
      stopChatTimer();
      autoChatButton.textContent = "Auto Chat";
      autoChatButton.classList.remove("toggle-on");
    } else {
      startRepeatingTask(messageText, delayValue);
      autoChatButton.textContent = "Stop Chat";
      autoChatButton.classList.add("toggle-on");
    }
  };
  const patchButton = toolsPanel.querySelector("#patchBtn");
  patchButton.onclick = () => {
    initializeTextInterceptor();
    patchButton.textContent = "Special Chars Active";
    patchButton.disabled = true;
    patchButton.classList.add("toggle-on");
  };
  toolsPanel.querySelector("#spoofBtn").onclick = () => {
    const randomString = generateRandomString(8);
    if (simulateTextInput(".play-game .el-input__inner", randomString)) {
      showNotification("Name spoofed");
    } else if (simulateTextInput(".new-tribe .el-input__inner", randomString)) {
      showNotification("Tribe name spoofed");
    } else {
      showNotification("No name input found");
    }
  };
  const spinButton = toolsPanel.querySelector("#spinBtn");
  spinButton.onclick = () => {
    toggleAutoPointerMovement();
    spinButton.textContent = state.animationIntervalId ? "Stop Spin" : "Auto Spin";
    spinButton.classList.toggle("toggle-on", !!state.animationIntervalId);
  };
  const spinKeyInput = toolsPanel.querySelector("#spinKeyInput");
  let lastPressedKey = null;
  spinKeyInput.addEventListener("keydown", keydownEvent => {
    keydownEvent.preventDefault();
    lastPressedKey = keydownEvent.code || keydownEvent.key;
    spinKeyInput.value = lastPressedKey.replace("Key", "").toUpperCase();
  });
  document.addEventListener("keydown", keyupEvent => {
    if (lastPressedKey && keyupEvent.code === lastPressedKey && !keyupEvent.target.matches("input,textarea,button,select")) {
      keyupEvent.preventDefault();
      toggleAutoPointerMovement();
      spinButton.textContent = state.animationIntervalId ? "Stop Spin" : "Auto Spin";
      spinButton.classList.toggle("toggle-on", !!state.animationIntervalId);
    }
  });
  const turnLeftInput = toolsPanel.querySelector("#turnLeftKeyInput");
  const turnRightInput = toolsPanel.querySelector("#turnRightKeyInput");
  turnLeftInput.value = pressedKeyQ.toUpperCase();
  turnRightInput.value = pressedKeyE.toUpperCase();
  turnLeftInput.addEventListener("keydown", clickEvent => {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    pressedKeyQ = clickEvent.key;
    turnLeftInput.value = clickEvent.key.length === 1 ? clickEvent.key.toUpperCase() : clickEvent.key;
  });
  turnRightInput.addEventListener("keydown", contextMenuEvent => {
    contextMenuEvent.preventDefault();
    contextMenuEvent.stopPropagation();
    pressedKeyE = contextMenuEvent.key;
    turnRightInput.value = contextMenuEvent.key.length === 1 ? contextMenuEvent.key.toUpperCase() : contextMenuEvent.key;
  });
  const savedNameDisplay = toolsPanel.querySelector("#savedNameDisplay");
  const setNameButton = toolsPanel.querySelector("#setNameBtn");
  const clearNameButton = toolsPanel.querySelector("#clearNameBtn");
  if (savedNameDisplay) {
    savedNameDisplay.value = localStorage.getItem("autofill_name") || "";
  }
  if (setNameButton) {
    setNameButton.onclick = () => {
      const userName = savedNameDisplay.value.trim();
      if (userName) {
        localStorage.setItem("autofill_name", userName);
        uiaudioState.isMuted = false;
        initAutofillName();
        showNotification("Name saved: " + userName);
      }
    };
  }
  if (clearNameButton) {
    clearNameButton.onclick = () => {
      localStorage.removeItem("autofill_name");
      uiaudioState.isMuted = false;
      if (savedNameDisplay) {
        savedNameDisplay.value = "";
      }
      showNotification("Autofill cleared");
    };
  }
  makeElementDraggable(toolsPanel);
  return toolsPanel;
}
function createVisionPanel() {
  const visionPanel = document.createElement("div");
  visionPanel.id = "vision-panel";
  visionPanel.className = "ast-panel";
  visionPanel.style.cssText = "top:20px;right:20px;width:230px;";
  visionPanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Astraphobia Client</span><button class=\"ast-header-min\" id=\"visionMin\">−</button></div>\n      <div class=\"ast-body\" id=\"visionBody\">\n        <span class=\"ast-section-label\">Vision</span>\n        <button class=\"ast-btn patched\" id=\"thresherBtn\" disabled>Thresher Boost (Patched)</button>\n        <button class=\"ast-btn\" id=\"astraVisionBtn\">Astra-Vision</button>\n        <button class=\"ast-btn\" id=\"smallMinimapBtn\">Small Minimap</button>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">ESP</span>\n        <button class=\"ast-btn\" id=\"espBtn\">ESP</button>\n        <select class=\"ast-select\" id=\"espModeSelect\"><option value=\"players\">Players</option><option value=\"food\">Food</option></select>\n        <button class=\"ast-btn\" id=\"trackNearestBtn\">Track Nearest (F3)</button>\n        <button class=\"ast-btn\" id=\"untrackBtn\">Untrack (F4)</button>\n        <div class=\"ast-sep\"></div>\n        <button class=\"ast-btn\" id=\"espColorsToggleBtn\" style=\"display:flex;align-items:center;justify-content:space-between;\">\n          <span style=\"font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-sec,#888);\">ESP Colors</span>\n          <span id=\"espColorsArrow\" style=\"color:var(--text-sec,#888);font-size:12px;\">▼</span>\n        </button>\n        <div id=\"espColorsSection\" style=\"display:none;\">\n          <div class=\"ast-key-row\"><span>Close (&lt;500)</span><input type=\"color\" id=\"espColorClose\" value=\"#ff0000\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Medium (&lt;1500)</span><input type=\"color\" id=\"espColorMedium\" value=\"#ffff00\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Far (&lt;3000)</span><input type=\"color\" id=\"espColorFar\" value=\"#00ffff\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Very Far</span><input type=\"color\" id=\"espColorVeryFar\" value=\"#00ff00\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Tracked</span><input type=\"color\" id=\"espColorTracked\" value=\"#ff00ff\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Food Close</span><input type=\"color\" id=\"espColorFoodClose\" value=\"#00ff00\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Food Medium</span><input type=\"color\" id=\"espColorFoodMedium\" value=\"#88ff88\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Food Far</span><input type=\"color\" id=\"espColorFoodFar\" value=\"#44cc44\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n        </div>\n      </div>";
  document.body.appendChild(visionPanel);
  const visionBodyElement = visionPanel.querySelector("#visionBody");
  let isVisionHidden = false;
  visionPanel.querySelector("#visionMin").onclick = event => {
    event.stopPropagation();
    isVisionHidden = !isVisionHidden;
    visionBodyElement.style.display = isVisionHidden ? "none" : "block";
    visionPanel.querySelector("#visionMin").textContent = isVisionHidden ? "+" : "−";
  };
  visionPanel.querySelector("#thresherBtn").onclick = clickEvent => {
    clickEvent.preventDefault();
    showNotification("Thresher boost has been patched");
  };
  const astraVisionButton = visionPanel.querySelector("#astraVisionBtn");
  astraVisionButton.onclick = () => {
    if (state.isActive) {
      showNotification("Already active");
      return;
    }
    initAntiDetection();
    if (!state.animalData) {
      showNotification("Loading... click again in 2s");
      setTimeout(() => {
        initializeAstraVision();
        astraVisionButton.textContent = "Astra-Vision ✓";
        astraVisionButton.classList.add("toggle-on");
        astraVisionButton.disabled = true;
      }, 2000);
      return;
    }
    initializeAstraVision();
    astraVisionButton.textContent = "Astra-Vision ✓";
    astraVisionButton.classList.add("toggle-on");
    astraVisionButton.disabled = true;
  };
  const smallMinimapButton = visionPanel.querySelector("#smallMinimapBtn");
  smallMinimapButton.onclick = () => {
    initAntiDetection();
    if (!state.animalData) {
      showNotification("Not in game yet");
      return;
    }
    if (!state.animalData.minimap) {
      showNotification("Minimap not available");
      return;
    }
    toggleMinimapSize();
    smallMinimapButton.textContent = state.isMinimapSmall ? "Minimap: Small" : "Small Minimap";
    smallMinimapButton.classList.toggle("toggle-on", state.isMinimapSmall);
  };
  const espButton = visionPanel.querySelector("#espBtn");
  espButton.onclick = () => {
    toggleEsp();
    espButton.textContent = window.espEnabled ? "ESP ✓" : "ESP";
    espButton.classList.toggle("toggle-on", window.espEnabled);
  };
  const espModeSelect = visionPanel.querySelector("#espModeSelect");
  espModeSelect.value = window.espMode || "players";
  espModeSelect.onchange = changeEvent => {
    window.espMode = changeEvent.target.value;
    showNotification("ESP: " + changeEvent.target.value);
  };
  visionPanel.querySelector("#trackNearestBtn").onclick = () => trackNearestPlayer();
  visionPanel.querySelector("#untrackBtn").onclick = () => clearTracking();
  const espColorsToggleButton = visionPanel.querySelector("#espColorsToggleBtn");
  const espColorsSection = visionPanel.querySelector("#espColorsSection");
  const espColorsArrow = visionPanel.querySelector("#espColorsArrow");
  let isEspColorsExpanded = false;
  espColorsToggleButton.onclick = () => {
    isEspColorsExpanded = !isEspColorsExpanded;
    espColorsSection.style.display = isEspColorsExpanded ? "block" : "none";
    espColorsArrow.textContent = isEspColorsExpanded ? "▲" : "▼";
  };
  const espColorSettings = {
    espColorClose: "close",
    espColorMedium: "medium",
    espColorFar: "far",
    espColorVeryFar: "veryFar",
    espColorTracked: "tracked",
    espColorFoodClose: "foodClose",
    espColorFoodMedium: "foodMedium",
    espColorFoodFar: "foodFar"
  };
  Object.entries(espColorSettings).forEach(([elementId, colorKey]) => {
    const targetElement = visionPanel.querySelector("#" + elementId);
    if (targetElement) {
      targetElement.addEventListener("input", colorInputEvent => {
        window.espColors[colorKey] = colorInputEvent.target.value;
      });
    }
  });
  makeElementDraggable(visionPanel);
  return visionPanel;
}
function createCombatPanel() {
  const combatPanel = document.createElement("div");
  combatPanel.id = "combat-panel";
  combatPanel.className = "ast-panel";
  combatPanel.style.cssText = "top:20px;left:260px;width:230px;";
  combatPanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Astraphobia Client</span><button class=\"ast-header-min\" id=\"combatMin\">−</button></div>\n      <div class=\"ast-body\" id=\"combatBody\">\n        <span class=\"ast-section-label\">Combat</span>\n        <button class=\"ast-btn\" id=\"lockBtn\">Lock Nearest</button>\n        <div class=\"ast-key-row\"><span>Lock Key</span><input class=\"ast-key-capture\" id=\"lockKeyInput\" type=\"text\" value=\"T\" readonly></div>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Tracking</span>\n        <div class=\"ast-key-row\" style=\"margin-top:4px;\">\n          <span>Trail Color</span>\n          <input type=\"color\" id=\"trailColorPicker\" value=\"#ff9600\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;background:var(--bg2,#242424);cursor:pointer;padding:0;\">\n        </div>\n        <div class=\"ast-key-row\"><span>Trace Key (re-targets)</span><input class=\"ast-key-capture\" id=\"traceKeyInput\" type=\"text\" value=\"H\" readonly></div>\n      </div>";
  document.body.appendChild(combatPanel);
  const combatBody = combatPanel.querySelector("#combatBody");
  let isCombatPanelMinimized = false;
  combatPanel.querySelector("#combatMin").onclick = toggleEvent => {
    toggleEvent.stopPropagation();
    isCombatPanelMinimized = !isCombatPanelMinimized;
    combatBody.style.display = isCombatPanelMinimized ? "none" : "block";
    combatPanel.querySelector("#combatMin").textContent = isCombatPanelMinimized ? "+" : "−";
  };
  const lockButton = combatPanel.querySelector("#lockBtn");
  lockButton.onclick = () => toggleLock();
  const lockKeyInput = combatPanel.querySelector("#lockKeyInput");
  lockKeyInput.value = window.lockKey.toUpperCase();
  lockKeyInput.addEventListener("keydown", lockKeyEvent => {
    lockKeyEvent.preventDefault();
    lockKeyEvent.stopPropagation();
    window.lockKey = lockKeyEvent.key;
    lockKeyInput.value = lockKeyEvent.key.length === 1 ? lockKeyEvent.key.toUpperCase() : lockKeyEvent.key;
  });
  const trailColorPicker = combatPanel.querySelector("#trailColorPicker");
  trailColorPicker.addEventListener("input", colorPickerEvent => {
    const colorValue = colorPickerEvent.target.value;
    window.entityTrailColor = {
      r: parseInt(colorValue.slice(1, 3), 16),
      g: parseInt(colorValue.slice(3, 5), 16),
      b: parseInt(colorValue.slice(5, 7), 16)
    };
  });
  const traceKeyInput = combatPanel.querySelector("#traceKeyInput");
  traceKeyInput.value = window.entityTraceKey.toUpperCase();
  traceKeyInput.addEventListener("keydown", traceKeyEvent => {
    traceKeyEvent.preventDefault();
    traceKeyEvent.stopPropagation();
    window.entityTraceKey = traceKeyEvent.key.toLowerCase();
    traceKeyInput.value = traceKeyEvent.key.length === 1 ? traceKeyEvent.key.toUpperCase() : traceKeyEvent.key;
  });
  makeElementDraggable(combatPanel);
  return combatPanel;
}
function createAutomationPanel() {
  const automationPanel = document.createElement("div");
  automationPanel.id = "automation-panel";
  automationPanel.className = "ast-panel";
  automationPanel.style.cssText = "bottom:20px;left:260px;width:230px;";
  automationPanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Astraphobia Client</span><button class=\"ast-header-min\" id=\"autoMin\">−</button></div>\n      <div class=\"ast-body\" id=\"autoBody\">\n        <span class=\"ast-section-label\">Automation</span>\n        <button class=\"ast-btn\" id=\"autoDodgeBtn\">Auto Dodge</button>\n        <button class=\"ast-btn\" id=\"autoFarmBtn\">Auto Farm (F5)</button>\n        <select class=\"ast-select\" id=\"farmModeSelect\" style=\"margin-top:4px;\">\n          <option value=\"nearest\">Nearest Food</option>\n          <option value=\"cluster\">Food Clusters</option>\n          <option value=\"patrol\">Patrol Route</option>\n        </select>\n        <div class=\"ast-toggle-row\"><span>Boost</span><div class=\"ast-switch\"><input type=\"checkbox\" id=\"farmBoostToggle\" checked><span class=\"slider\"></span></div></div>\n        <div class=\"ast-toggle-row\"><span>Auto Evolve</span><div class=\"ast-switch\"><input type=\"checkbox\" id=\"farmEvolveToggle\" checked><span class=\"slider\"></span></div></div>\n        <div class=\"ast-toggle-row\"><span>Avoid Players</span><div class=\"ast-switch\"><input type=\"checkbox\" id=\"farmAvoidToggle\" checked><span class=\"slider\"></span></div></div>\n      </div>";
  document.body.appendChild(automationPanel);
  const automationBody = automationPanel.querySelector("#autoBody");
  let isAutomationPanelMinimized = false;
  automationPanel.querySelector("#autoMin").onclick = event => {
    event.stopPropagation();
    isAutomationPanelMinimized = !isAutomationPanelMinimized;
    automationBody.style.display = isAutomationPanelMinimized ? "none" : "block";
    automationPanel.querySelector("#autoMin").textContent = isAutomationPanelMinimized ? "+" : "−";
  };
  const autoDodgeButton = automationPanel.querySelector("#autoDodgeBtn");
  autoDodgeButton.onclick = () => {
    if (window.autoDodgeEnabled) {
      disableAutoDodge();
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
  farmModeSelect.onchange = farmModeChangeEvent => {
    if (window.autoFarmActive) {
      window.autoFarmMode = farmModeChangeEvent.target.value;
      if (farmModeChangeEvent.target.value === "patrol") {
        setupPatrolRoute();
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
  farmBoostLabel.addEventListener("click", autoFarmToggleEvent => {
    autoFarmToggleEvent.stopPropagation();
    farmBoostToggle.checked = !farmBoostToggle.checked;
    window.autoFarmBoost = farmBoostToggle.checked;
    showNotification(farmBoostToggle.checked ? "Farm boost ON" : "Farm boost OFF");
  });
  const farmEvolveLabel = farmEvolveToggle.nextElementSibling;
  farmEvolveLabel.addEventListener("click", autoCollectToggleEvent => {
    autoCollectToggleEvent.stopPropagation();
    farmEvolveToggle.checked = !farmEvolveToggle.checked;
    window.autoFarmEvolve = farmEvolveToggle.checked;
    showNotification(farmEvolveToggle.checked ? "Auto evolve ON" : "Auto evolve OFF");
  });
  const farmAvoidLabel = farmAvoidToggle.nextElementSibling;
  farmAvoidLabel.addEventListener("click", autoSellToggleEvent => {
    autoSellToggleEvent.stopPropagation();
    farmAvoidToggle.checked = !farmAvoidToggle.checked;
    window.autoFarmAvoidPlayers = farmAvoidToggle.checked;
    showNotification(farmAvoidToggle.checked ? "Avoid players ON" : "Avoid players OFF");
  });
  makeElementDraggable(automationPanel);
  return automationPanel;
}
function createSettingsPanel() {
  const settingsPanel = document.createElement("div");
  settingsPanel.id = "settings-panel";
  settingsPanel.className = "ast-panel";
  settingsPanel.style.cssText = "top:20px;left:20px;width:220px;";
  settingsPanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Settings</span><button class=\"ast-header-min\" id=\"settingsMin\">−</button></div>\n      <div class=\"ast-body\" id=\"settingsBody\">\n        <div class=\"ast-key-row\"><span>Toggle UI</span><input class=\"ast-key-capture\" id=\"toggleKeyInput\" type=\"text\" value=\"SHIFT\" readonly></div>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Background</span>\n        <div class=\"ast-row\"><input class=\"ast-input\" type=\"text\" id=\"bgUrl\" placeholder=\"Image URL...\" style=\"flex:1;\"><button class=\"ast-btn\" id=\"applyBg\" style=\"width:auto;padding:6px 10px;margin:0;\">Set</button></div>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Theme</span>\n        <select class=\"ast-select\" id=\"themeSelect\">\n          <option value=\"grey\">Grey</option><option value=\"blue\">Blue</option><option value=\"red\">Red</option>\n          <option value=\"green\">Green</option><option value=\"pink\">Pink</option><option value=\"starwars\">Star Wars</option>\n          <option value=\"kfc\">KFC</option><option value=\"halloween\">Halloween 🔒</option>\n        </select>\n        <div class=\"ast-sep\"></div>\n        <button class=\"ast-btn\" id=\"customThemeToggleBtn\" style=\"display:flex;align-items:center;justify-content:space-between;\">\n          <span style=\"font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-sec,#888);\">Create Theme</span>\n          <span id=\"customThemeArrow\" style=\"color:var(--text-sec,#888);font-size:12px;\">▼</span>\n        </button>\n        <div id=\"customThemeSection\" style=\"display:none;padding-top:4px;\">\n          <input class=\"ast-input\" type=\"text\" id=\"customThemeName\" placeholder=\"Theme name...\" style=\"width:100%;box-sizing:border-box;margin-bottom:4px;\">\n<div class=\"ast-key-row\"><span>Accent</span><input type=\"color\" id=\"ctAcc\" value=\"#888888\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n<div class=\"ast-key-row\"><span>Background</span><input type=\"color\" id=\"ctBg\" value=\"#1a1a1a\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n<div class=\"ast-key-row\"><span>Panel</span><input type=\"color\" id=\"ctPanel\" value=\"#242424\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n<button class=\"ast-btn\" id=\"saveCustomTheme\" style=\"margin-top:4px;\">Save Theme</button>\n        </div>\n        <div class=\"ast-sep\"></div>\n        <button class=\"ast-btn\" id=\"myThemesToggleBtn\" style=\"display:flex;align-items:center;justify-content:space-between;\">\n          <span style=\"font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-sec,#888);\">My Themes</span>\n          <span id=\"myThemesArrow\" style=\"color:var(--text-sec,#888);font-size:12px;\">▼</span>\n        </button>\n        <div id=\"myThemesSection\" style=\"display:none;padding-top:4px;\">\n          <div id=\"customThemeList\"></div>\n          <div id=\"noThemesMsg\" style=\"font-size:11px;color:#555;text-align:center;padding:8px 0;\">No custom themes yet</div>\n        </div>\n      </div>";
  document.body.appendChild(settingsPanel);
  const settingsBodyElement = settingsPanel.querySelector("#settingsBody");
  let isSettingsCollapsed = false;
  settingsPanel.querySelector("#settingsMin").onclick = clickEvent => {
    clickEvent.stopPropagation();
    isSettingsCollapsed = !isSettingsCollapsed;
    settingsBodyElement.style.display = isSettingsCollapsed ? "none" : "block";
    settingsPanel.querySelector("#settingsMin").textContent = isSettingsCollapsed ? "+" : "−";
  };
  const toggleKeyInput = settingsPanel.querySelector("#toggleKeyInput");
  toggleKeyInput.value = pressedKey.toUpperCase();
  toggleKeyInput.addEventListener("keydown", keyboardEvent => {
    keyboardEvent.preventDefault();
    pressedKey = keyboardEvent.key;
    toggleKeyInput.value = keyboardEvent.key.length === 1 ? keyboardEvent.key.toUpperCase() : keyboardEvent.key;
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
    initBackgroundImage();
    showNotification("Background applied");
  };
  const themeSelectElement = settingsPanel.querySelector("#themeSelect");
  const currentTheme = localStorage.getItem("theme") || "grey";
  const customThemes = JSON.parse(localStorage.getItem("customThemes") || "{}");
  const presetThemes = ["grey", "blue", "red", "green", "pink", "starwars", "kfc", "halloween"];
  themeSelectElement.value = presetThemes.includes(currentTheme) || customThemes[currentTheme] ? currentTheme : "grey";
  themeSelectElement.onchange = themeChangeEvent => {
    const selectedThemeValue = themeChangeEvent.target.value;
    if (selectedThemeValue === "halloween") {
      showHalloweenCodeModal(isHalloweenTheme => {
        if (isHalloweenTheme) {
          applyTheme("halloween");
        } else {
          themeChangeEvent.target.value = localStorage.getItem("theme") || "grey";
        }
      });
    } else {
      applyTheme(selectedThemeValue);
      showNotification("Theme: " + selectedThemeValue);
    }
  };
  const renderCustomThemeList = () => {
    const customThemeListElement = settingsPanel.querySelector("#customThemeList");
    const noThemesMessageElement = settingsPanel.querySelector("#noThemesMsg");
    const customThemesData = JSON.parse(localStorage.getItem("customThemes") || "{}");
    const themeKeys = Object.keys(customThemesData);
    customThemeListElement.innerHTML = "";
    noThemesMessageElement.style.display = themeKeys.length === 0 ? "block" : "none";
    themeKeys.forEach(currentTheme => {
      const themeContainer = document.createElement("div");
      themeContainer.style.cssText = "display:flex;gap:4px;margin-bottom:3px;";
      const isThemeActive = localStorage.getItem("theme") === currentTheme;
      themeContainer.innerHTML = "\n          <button class=\"ast-btn" + (isThemeActive ? " toggle-on" : "") + "\" style=\"flex:1;margin:0;\">" + currentTheme + "</button>\n          <button class=\"ast-btn\" style=\"width:32px;margin:0;text-align:center;color:#f44336;\">✕</button>";
      themeContainer.querySelectorAll("button")[0].onclick = () => {
        applyTheme(currentTheme);
        showNotification("Theme: " + currentTheme);
        renderCustomThemeList();
      };
      themeContainer.querySelectorAll("button")[1].onclick = () => {
        const customThemes = JSON.parse(localStorage.getItem("customThemes") || "{}");
        delete customThemes[currentTheme];
        localStorage.setItem("customThemes", JSON.stringify(customThemes));
        if (localStorage.getItem("theme") === currentTheme) {
          applyTheme("grey");
          themeSelectElement.value = "grey";
          showNotification("Theme reset to Grey");
        } else {
          showNotification("Deleted: " + currentTheme);
        }
        renderCustomThemeList();
      };
      customThemeListElement.appendChild(themeContainer);
    });
  };
  renderCustomThemeList();
  settingsPanel.querySelector("#saveCustomTheme").onclick = () => {
    const themeNameInput = settingsPanel.querySelector("#customThemeName").value.trim();
    if (!themeNameInput) {
      showNotification("Enter a theme name");
      return;
    }
    const availableThemes = ["grey", "blue", "red", "green", "pink", "starwars", "kfc", "halloween"];
    if (availableThemes.includes(themeNameInput.toLowerCase())) {
      showNotification("Cannot use built-in theme name");
      return;
    }
    const accountValue = settingsPanel.querySelector("#ctAcc").value;
    const backgroundColor = settingsPanel.querySelector("#ctBg").value;
    const panelColor = settingsPanel.querySelector("#ctPanel").value;
    const redChannel = parseInt(accountValue.slice(1, 3), 16);
    const greenChannel = parseInt(accountValue.slice(3, 5), 16);
    const blueChannel = parseInt(accountValue.slice(5, 7), 16);
    const adjustHexColor = hexColorCode => {
      const redChannel = parseInt(hexColorCode.slice(1, 3), 16) + 10;
      const greenChannel = parseInt(hexColorCode.slice(3, 5), 16) + 10;
      const blueChannel = parseInt(hexColorCode.slice(5, 7), 16) + 10;
      return "#" + [redChannel, greenChannel, blueChannel].map(colorChannelValue => Math.min(255, colorChannelValue).toString(16).padStart(2, "0")).join("");
    };
    const themeConfig = {
      acc: accountValue,
      accH: adjustHexColor(accountValue),
      accRGB: redChannel + "," + greenChannel + "," + blueChannel,
      text: "#e0e0e0",
      textSec: "#888",
      bg1: backgroundColor,
      bg2: panelColor,
      bg3: adjustHexColor(panelColor),
      border: "#333",
      hover: adjustHexColor(panelColor)
    };
    const customThemes = JSON.parse(localStorage.getItem("customThemes") || "{}");
    customThemes[themeNameInput] = themeConfig;
    localStorage.setItem("customThemes", JSON.stringify(customThemes));
    applyTheme(themeNameInput);
    settingsPanel.querySelector("#customThemeName").value = "";
    renderCustomThemeList();
    showNotification("Theme saved: " + themeNameInput);
  };
  const customThemeToggleBtn = settingsPanel.querySelector("#customThemeToggleBtn");
  const customThemeSection = settingsPanel.querySelector("#customThemeSection");
  const customThemeArrow = settingsPanel.querySelector("#customThemeArrow");
  let isCustomThemeSectionExpanded = false;
  customThemeToggleBtn.onclick = () => {
    isCustomThemeSectionExpanded = !isCustomThemeSectionExpanded;
    customThemeSection.style.display = isCustomThemeSectionExpanded ? "block" : "none";
    customThemeArrow.textContent = isCustomThemeSectionExpanded ? "▲" : "▼";
  };
  const myThemesToggleBtn = settingsPanel.querySelector("#myThemesToggleBtn");
  const myThemesSection = settingsPanel.querySelector("#myThemesSection");
  const myThemesArrow = settingsPanel.querySelector("#myThemesArrow");
  let isThemesExpanded = false;
  myThemesToggleBtn.onclick = () => {
    isThemesExpanded = !isThemesExpanded;
    myThemesSection.style.display = isThemesExpanded ? "block" : "none";
    myThemesArrow.textContent = isThemesExpanded ? "▲" : "▼";
    if (isThemesExpanded) {
      renderCustomThemeList();
    }
  };
  makeElementDraggable(settingsPanel);
  return settingsPanel;
}
function createMusicPanel() {
  const musicPanel = document.createElement("div");
  musicPanel.id = "music-panel";
  musicPanel.className = "ast-panel";
  musicPanel.style.cssText = "bottom:20px;left:510px;width:240px;";
  musicPanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Music Player</span><button class=\"ast-header-min\" id=\"musicMin\">−</button></div>\n      <div class=\"ast-body\" id=\"musicBody\">\n        <div id=\"musicTrackName\" style=\"font-size:11px;color:var(--acc,#888);text-align:center;padding:4px 2px 8px 2px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;\">No tracks</div>\n\n        <div style=\"display:flex;gap:4px;justify-content:center;margin-bottom:8px;flex-wrap:wrap;\">\n          <button class=\"ast-btn\" id=\"musicPrevBtn\" style=\"width:48px;margin:0;text-align:center;padding:6px 4px;\">Prev</button>\n          <button class=\"ast-btn\" id=\"musicPlayBtn\" style=\"width:48px;margin:0;text-align:center;padding:6px 4px;\">Play</button>\n          <button class=\"ast-btn\" id=\"musicStopBtn\" style=\"width:48px;margin:0;text-align:center;padding:6px 4px;\">Stop</button>\n          <button class=\"ast-btn\" id=\"musicNextBtn\" style=\"width:48px;margin:0;text-align:center;padding:6px 4px;\">Next</button>\n        </div>\n\n        <div style=\"display:flex;gap:4px;justify-content:center;margin-bottom:8px;\">\n          <button class=\"ast-btn\" id=\"musicLoopBtn\" style=\"width:70px;margin:0;text-align:center;padding:6px 4px;\">Loop</button>\n          <button class=\"ast-btn\" id=\"musicShuffleBtn\" style=\"width:70px;margin:0;text-align:center;padding:6px 4px;\">Shuffle</button>\n        </div>\n\n        <div class=\"ast-key-row\" style=\"margin-bottom:6px;\">\n          <span>Volume</span>\n          <input type=\"range\" id=\"musicVolume\" min=\"0\" max=\"1\" step=\"0.05\" value=\"0.5\" style=\"width:120px;accent-color:var(--acc,#888);\">\n        </div>\n\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Add Track</span>\n        <input class=\"ast-input\" type=\"text\" id=\"musicUrlInput\" placeholder=\"Audio or YouTube URL...\" style=\"width:100%;box-sizing:border-box;margin-bottom:4px;\">\n        <input class=\"ast-input\" type=\"text\" id=\"musicNameInput\" placeholder=\"Track name (optional)\" style=\"width:100%;box-sizing:border-box;margin-bottom:4px;\">\n        <button class=\"ast-btn\" id=\"musicAddBtn\">Add Track</button>\n\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Playlist</span>\n        <div id=\"musicTrackList\" style=\"max-height:150px;overflow-y:auto;\"></div>\n      </div>";
  document.body.appendChild(musicPanel);
  const musicBodyElement = musicPanel.querySelector("#musicBody");
  let isMusicHidden = false;
  musicPanel.querySelector("#musicMin").onclick = event => {
    event.stopPropagation();
    isMusicHidden = !isMusicHidden;
    musicBodyElement.style.display = isMusicHidden ? "none" : "block";
    musicPanel.querySelector("#musicMin").textContent = isMusicHidden ? "+" : "−";
  };
  musicPanel.querySelector("#musicPrevBtn").onclick = () => playPrevious();
  musicPanel.querySelector("#musicStopBtn").onclick = () => resetPlayback();
  musicPanel.querySelector("#musicNextBtn").onclick = () => playNextOrRandom();
  const musicPlayButton = musicPanel.querySelector("#musicPlayBtn");
  musicPlayButton.onclick = () => {
    if (!musicPlaylist.length) {
      showNotification("Add a track first");
      return;
    }
    if (isPlaying()) {
      pausePlayback();
    } else {
      resumePlayback();
    }
  };
  const musicLoopButton = musicPanel.querySelector("#musicLoopBtn");
  musicLoopButton.classList.toggle("toggle-on", uiaudioState.isMusicLoopEnabled);
  musicLoopButton.onclick = () => {
    uiaudioState.isMusicLoopEnabled = !uiaudioState.isMusicLoopEnabled;
    localStorage.setItem("musicLoop", uiaudioState.isMusicLoopEnabled);
    musicLoopButton.classList.toggle("toggle-on", uiaudioState.isMusicLoopEnabled);
    showNotification(uiaudioState.isMusicLoopEnabled ? "Loop ON" : "Loop OFF");
  };
  const musicShuffleButton = musicPanel.querySelector("#musicShuffleBtn");
  musicShuffleButton.classList.toggle("toggle-on", uiaudioState.isMusicShuffleEnabled);
  musicShuffleButton.onclick = () => {
    uiaudioState.isMusicShuffleEnabled = !uiaudioState.isMusicShuffleEnabled;
    localStorage.setItem("musicShuffle", uiaudioState.isMusicShuffleEnabled);
    musicShuffleButton.classList.toggle("toggle-on", uiaudioState.isMusicShuffleEnabled);
    showNotification(uiaudioState.isMusicShuffleEnabled ? "Shuffle ON" : "Shuffle OFF");
  };
  const musicVolumeControl = musicPanel.querySelector("#musicVolume");
  musicVolumeControl.value = uiaudioState.musicVolume;
  musicVolumeControl.oninput = volumeChangeEvent => {
    uiaudioState.musicVolume = parseFloat(volumeChangeEvent.target.value);
    localStorage.setItem("musicVolume", uiaudioState.musicVolume);
    if (audioPlayer) {
      audioPlayer.volume = uiaudioState.musicVolume;
    }
    if (youtubePlayer) {
      try {
        youtubePlayer.setVolume(Math.round(uiaudioState.musicVolume * 100));
      } catch (unusedVariable) {}
    }
  };
  musicPanel.querySelector("#musicAddBtn").onclick = () => {
    const musicUrl = musicPanel.querySelector("#musicUrlInput").value.trim();
    const musicName = musicPanel.querySelector("#musicNameInput").value.trim();
    if (!musicUrl) {
      showNotification("Enter a URL");
      return;
    }
    musicPanel.querySelector("#musicUrlInput").value = "";
    musicPanel.querySelector("#musicNameInput").value = "";
    addTrackToPlaylist(musicUrl, musicName);
  };
  updateMusicPanel();
  makeElementDraggable(musicPanel);
  return musicPanel;
}
function createUpdateHistoryPanel() {
  const updatePanel = document.createElement("div");
  updatePanel.id = "update-history";
  updatePanel.className = "ast-panel";
  updatePanel.style.cssText = "bottom:20px;left:20px;width:230px;max-height:280px;";
  updatePanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Updates</span><button class=\"ast-header-min\" id=\"updateMin\">−</button></div>\n      <div class=\"ast-body\" id=\"updateBody\" style=\"overflow-y:auto;max-height:220px;\">\n        <ul class=\"ast-update-list\">\n        <li><strong>v1.9</strong> — Fixed ESP not fully working, added music player, and added auto-name (saves locally).</li>\n         <li><strong>v1.8</strong> — Fixed Astra-Vision (Shadows not being Removed), added Custom Themes Feature, fixed enable/disable for sliders, fixed ESP not working properly/gltiched.</li>\n          <li><strong>v1.7</strong> — New Features and Organization.</li>\n        </ul>\n      </div>";
  document.body.appendChild(updatePanel);
  const updateBody = updatePanel.querySelector("#updateBody");
  let isMinimized = false;
  updatePanel.querySelector("#updateMin").onclick = event => {
    event.stopPropagation();
    isMinimized = !isMinimized;
    updateBody.style.display = isMinimized ? "none" : "block";
    updatePanel.querySelector("#updateMin").textContent = isMinimized ? "+" : "−";
  };
  makeElementDraggable(updatePanel);
  return updatePanel;
}
let pressedKey = "Shift";
function togglePanelsVisibility() {
  const panelIds = ["deep-tools-panel", "vision-panel", "combat-panel", "automation-panel", "update-history", "settings-panel", "music-panel"];
  const deepToolsPanelElement = document.getElementById("deep-tools-panel");
  if (!deepToolsPanelElement) {
    return;
  }
  const isPanelVisible = deepToolsPanelElement.style.display !== "none";
  panelIds.forEach(elementId => {
    const targetElement = document.getElementById(elementId);
    if (targetElement) {
      targetElement.style.display = isPanelVisible ? "none" : "block";
    }
  });
}

export { createToolsPanel, createVisionPanel, createCombatPanel, createAutomationPanel, createSettingsPanel, createMusicPanel, createUpdateHistoryPanel };
