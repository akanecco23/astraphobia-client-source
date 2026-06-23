import {
  startScheduledTask,
  stopInterval,
  autoChat,
} from "../features/chat.js";
import {
  radius,
  initInterceptor,
  isReady,
  disableGameRestrictions,
  coreSharedState,
} from "../core.js";
import { generateRandomString } from "../utils.js";
import { simulateTyping, showNotification } from "./interaction.js";
import { toggleMouseSimulation } from "../features/movement.js";
import { initializeAntiTamper } from "../features/antidetection.js";
import { toggleMinimapScale } from "./radar.js";
import { createHalloweenModal } from "./panels.js";
import { initAdBlocker } from "../features/adblock.js";

function createUpdateHistoryStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent =
    "\n      #update-history {\n        position: fixed;\n        bottom: 20px;\n        left: 20px;\n        background: var(--bg-primary);\n        color: var(--text-primary);\n        padding: 16px;\n        border-radius: 16px;\n        font-size: 13px;\n        z-index: 9999;\n        max-width: 240px;\n        max-height: 280px;\n        overflow-y: auto;\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        cursor: move;\n        box-shadow: var(--shadow);\n        border: 1px solid var(--border);\n        transition: all 0.3s ease;\n        backdrop-filter: blur(20px);\n      }\n      #update-history:hover {\n        box-shadow: var(--shadow-hover);\n        transform: translateY(-2px);\n      }\n      #update-history ul {\n        margin: 0;\n        padding-left: 18px;\n      }\n      #update-history li {\n        margin-bottom: 6px;\n        line-height: 1.4;\n        color: var(--text-primary);\n      }\n      #update-history h3 {\n        margin: 0 0 12px 0;\n        font-size: 15px;\n        color: var(--accent);\n        position: relative;\n        padding-right: 28px;\n        font-weight: 600;\n      }\n      #update-history button.min-btn {\n        background: none;\n        border: none;\n        color: var(--accent);\n        font-size: 20px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 8px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: all 0.2s ease;\n        width: 24px;\n        height: 24px;\n        line-height: 24px;\n        border-radius: 50%;\n      }\n      #update-history button.min-btn:hover {\n        color: var(--accent-hover);\n        background: rgba(var(--accent-rgb), 0.2);\n      }\n      #update-history.themestarwars::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        z-index: -1;\n        border-radius: 16px;\n        background: radial-gradient(circle at center, rgba(255,255,255,0.1) 1px, transparent 1px);\n        background-size: 20px 20px;\n        animation: twinkle-stars 20s linear infinite;\n      }\n      #update-history.themekfc::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        z-index: -1;\n        border-radius: 16px;\n        background: radial-gradient(circle at 20% 30%, rgba(244,0,0,0.1) 2px, transparent 2px),\n                    radial-gradient(circle at 80% 70%, rgba(255,204,0,0.05) 1px, transparent 1px);\n        background-size: 40px 40px;\n      }\n      #update-history.themehalloween::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        z-index: -1;\n        border-radius: 16px;\n        background: radial-gradient(circle at 30% 20%, rgba(255, 102, 0, 0.1) 1px, transparent 1px),\n                    radial-gradient(circle at 70% 80%, rgba(139, 0, 255, 0.05) 2px, transparent 2px);\n        background-size: 30px 30px;\n        animation: halloween-glow 15s ease-in-out infinite alternate;\n      }\n      #update-history.themehalloween .bat {\n        position: absolute;\n        font-size: 20px;\n        animation: fly-bat 10s linear infinite;\n        pointer-events: none;\n        opacity: 0.7;\n      }\n      #update-history.themehalloween .bat:nth-child(1) { top: 10%; left: -10%; animation-delay: 0s; }\n      #update-history.themehalloween .bat:nth-child(2) { top: 50%; right: -10%; animation-delay: 3s; animation-direction: reverse; }\n      #update-history.themehalloween .bat:nth-child(3) { top: 80%; left: -10%; animation-delay: 6s; }\n      @keyframes fly-bat {\n        0% { transform: translateX(0) rotate(0deg); }\n        100% { transform: translateX(120%) rotate(360deg); }\n      }\n      @keyframes twinkle-stars {\n        0% { background-position: 0 0; }\n        100% { background-position: 20px 20px; }\n      }\n      @keyframes halloween-glow {\n        0% { opacity: 0.8; }\n        100% { opacity: 1; }\n      }\n    ";
  document.head.appendChild(styleElement);
  const draggableElement = document.createElement("div");
  draggableElement.id = "update-history";
  draggableElement.innerHTML =
    '\n      <h3>Update History <button class="min-btn" id="minHist">−</button></h3>\n      <div id="historyContent">\n        <ul>\n          <li>v1.5 - Added Star Wars theme, Pink theme, KFC theme (More Glow in KFC Theme), new Halloween theme + Mini-Game, new Astraphobia Client Halloween Icon and updated Halloween Astraphobia Client Website.</li>\n          <li>v1.4 - New Themes Selection (NO MORE PLAIN RED UI MORE MODERN COLORS).</li>\n          <li>v1.3 - New Blue Themed UI with new UI animations and Client Logo! No more minimize or maximize for everything but Update History because of toogle client tool. Updated Astraphobia Client Website and Discord! Also, added new small minimap feature.</li>\n          <li>v1.2 - Astra-Vision added - no ink flash or deep darkness effects + no-zoom limit, added new client ui rework, and custom-background feature (images and gif\'s).</li>\n          <li>v1.1 - Added built-in ad blocker, removed boost trail, spoofing for username, keybind selector for auto spin, added settings GUI, added shift keybind to toogle all panels.</li>\n          <li>v1.0 - Initial release with auto chat, auto-spin, special character bypass, and thresher super boost, no-zoom limit is automatically enabled.</li>\n        </ul>\n      </div>\n    ';
  document.body.appendChild(draggableElement);
  const minHistElement = draggableElement.querySelector("#minHist");
  const historyContentElement =
    draggableElement.querySelector("#historyContent");
  let isHistoryHidden = false;
  minHistElement.onclick = (arg_b829) => {
    arg_b829.stopPropagation();
    isHistoryHidden = !isHistoryHidden;
    historyContentElement.style.display = isHistoryHidden ? "none" : "block";
    draggableElement.style.height = isHistoryHidden ? "60px" : "auto";
    minHistElement.textContent = isHistoryHidden ? "+" : "−";
  };
  let offsetX;
  let offsetY;
  let isMoving = false;
  let isDragging = false;
  draggableElement.addEventListener("mousedown", (arg_5759) => {
    if (
      ["BUTTON", "INPUT", "TEXTAREA", "A"].includes(arg_5759.target.tagName)
    ) {
      return;
    }
    isMoving = true;
    isDragging = false;
    offsetX = arg_5759.clientX - draggableElement.getBoundingClientRect().left;
    offsetY = arg_5759.clientY - draggableElement.getBoundingClientRect().top;
    draggableElement.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - arg_5759.clientX;
      const deltaY = mouseEvent.clientY - arg_5759.clientY;
      if (!isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isDragging = true;
      }
      if (isMoving) {
        draggableElement.style.left = mouseEvent.clientX - offsetX + "px";
        draggableElement.style.top = mouseEvent.clientY - offsetY + "px";
        draggableElement.style.bottom = "auto";
        draggableElement.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      isMoving = false;
      draggableElement.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
  draggableElement.addEventListener("click", (arg_98a2) => {
    if (isDragging) {
      arg_98a2.stopImmediatePropagation();
    }
  });
  if (localStorage.getItem("theme") === "halloween") {
    for (let loopIndex = 0; loopIndex < 3; loopIndex++) {
      const spanElement = document.createElement("span");
      spanElement.className = "bat";
      spanElement.textContent = "🦇";
      draggableElement.appendChild(spanElement);
    }
  }
  return draggableElement;
}
function injectDeepToolsStyles() {
  const deepToolsStyleElement = document.createElement("style");
  deepToolsStyleElement.textContent =
    "\n      :root {\n        --shadow: 0 8px 32px rgba(0, 0, 0, 0.3);\n        --shadow-hover: 0 12px 40px rgba(0, 0, 0, 0.4);\n      }\n      #deep-tools-panel {\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: var(--shadow);\n        border: 1px solid var(--border);\n        background: var(--bg-primary);\n        backdrop-filter: blur(20px);\n        border-radius: 16px;\n        position: relative;\n      }\n      #deep-tools-panel:hover {\n        box-shadow: var(--shadow-hover);\n        transform: translateY(-2px);\n      }\n      #deep-tools-panel textarea {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 8px;\n        padding: 10px;\n        transition: all 0.2s ease;\n        font-size: 13px;\n      }\n      #deep-tools-panel textarea:focus {\n        outline: none;\n        border-color: var(--accent);\n        box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.2);\n      }\n      #deep-tools-panel input[type=\"number\"] {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        width: 60px;\n        text-align: center;\n        transition: all 0.2s ease;\n      }\n      #deep-tools-panel button {\n        background: var(--bg-secondary);\n        color: var(--accent);\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        padding: 10px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        position: relative;\n        overflow: hidden;\n      }\n      #deep-tools-panel button::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: -100%;\n        width: 100%;\n        height: 100%;\n        background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.2), transparent);\n        transition: left 0.5s;\n      }\n      #deep-tools-panel button:hover:not(:disabled)::before {\n        left: 100%;\n      }\n      #deep-tools-panel button:hover:not(:disabled) {\n        background: var(--hover-bg);\n        border-color: var(--accent);\n        transform: translateY(-1px);\n        box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.2);\n        color: var(--accent-hover);\n      }\n      #deep-tools-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);\n      }\n      #deep-tools-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #deep-tools-panel .credits {\n        margin-top: 12px;\n        font-size: 11px;\n        color: var(--text-secondary);\n        line-height: 1.4;\n      }\n      #deep-tools-panel .auto-chat-controls {\n        display: flex;\n        gap: 8px;\n        margin-bottom: 10px;\n        align-items: center;\n        justify-content: center;\n      }\n      #deep-tools-panel .spin-keybind {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        margin-bottom: 10px;\n        font-size: 12px;\n      }\n      #deep-tools-panel .spin-keybind label {\n        color: var(--text-primary);\n      }\n      #deep-tools-panel #spinKeyInput {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        width: 50px;\n        text-align: center;\n        transition: all 0.2s ease;\n      }\n      #aim-overlay, #ctrl-overlay {\n        z-index: 10000 !important;\n      }\n      div.game {\n        position: relative;\n      }\n      /* Ad Removal */\n      div.sidebar.left > div.ad-block {\n        opacity: 0 !important;\n        pointer-events: none !important;\n        display: none !important;\n      }\n      div.sidebar.left > a {\n        display: none !important;\n      }\n      div.sidebar.left {\n        max-width: 30vw;\n        width: 21rem;\n        bottom: 0 !important;\n      }\n      /* Theme-specific panel animations */\n      #deep-tools-panel.themestarwars::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        background: radial-gradient(circle at center, rgba(255,255,255,0.1) 1px, transparent 1px);\n        background-size: 20px 20px;\n        animation: twinkle-stars 20s linear infinite;\n        z-index: -1;\n        border-radius: 16px;\n      }\n      #deep-tools-panel.themekfc::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        z-index: -1;\n        border-radius: 16px;\n        background: radial-gradient(circle at 20% 30%, rgba(244,0,0,0.1) 2px, transparent 2px),\n                    radial-gradient(circle at 80% 70%, rgba(255,204,0,0.05) 1px, transparent 1px);\n        background-size: 40px 40px;\n      }\n      #deep-tools-panel.themehalloween::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        z-index: -1;\n        border-radius: 16px;\n        background: radial-gradient(circle at 30% 20%, rgba(255, 102, 0, 0.1) 1px, transparent 1px),\n                    radial-gradient(circle at 70% 80%, rgba(139, 0, 255, 0.05) 2px, transparent 2px);\n        background-size: 30px 30px;\n        animation: halloween-glow 15s ease-in-out infinite alternate;\n      }\n      #deep-tools-panel.themehalloween .bat {\n        position: absolute;\n        font-size: 20px;\n        animation: fly-bat 10s linear infinite;\n        pointer-events: none;\n        opacity: 0.7;\n      }\n      #deep-tools-panel.themehalloween .bat:nth-child(1) { top: 10%; left: -10%; animation-delay: 0s; }\n      #deep-tools-panel.themehalloween .bat:nth-child(2) { top: 50%; right: -10%; animation-delay: 3s; animation-direction: reverse; }\n      #deep-tools-panel.themehalloween .bat:nth-child(3) { top: 80%; left: -10%; animation-delay: 6s; }\n      @keyframes fly-bat {\n        0% { transform: translateX(0) rotate(0deg); }\n        100% { transform: translateX(120%) rotate(360deg); }\n      }\n      @keyframes twinkle-stars {\n        0% { background-position: 0 0; }\n        100% { background-position: 20px 20px; }\n      }\n      @keyframes halloween-glow {\n        0% { opacity: 0.8; }\n        100% { opacity: 1; }\n      }\n    ";
  document.head.appendChild(deepToolsStyleElement);
  const deepToolsPanel = document.createElement("div");
  deepToolsPanel.id = "deep-tools-panel";
  deepToolsPanel.style.position = "fixed";
  deepToolsPanel.style.bottom = "20px";
  deepToolsPanel.style.right = "20px";
  deepToolsPanel.style.color = "var(--text-primary)";
  deepToolsPanel.style.padding = "16px";
  deepToolsPanel.style.borderRadius = "16px";
  deepToolsPanel.style.fontSize = "14px";
  deepToolsPanel.style.zIndex = "99999";
  deepToolsPanel.style.userSelect = "none";
  deepToolsPanel.style.width = "240px";
  deepToolsPanel.style.textAlign = "center";
  deepToolsPanel.style.cursor = "move";
  deepToolsPanel.style.overflow = "hidden";
  deepToolsPanel.innerHTML =
    '\n      <div style="font-weight:600; margin-bottom:12px; color:var(--accent); height: 40px; line-height: 40px;">\n        ASTRAPHOBIA CLIENT\n      </div>\n      <div id="panelContent">\n        <textarea id="chatMsg" placeholder="Type message..." style="width:100%; height:50px; margin-bottom:10px; resize:none;"></textarea>\n        <button id="sendBtn" style="width:100%; margin-bottom:10px;">Send Typed Chat</button>\n        <div class="auto-chat-controls">\n          <input type="number" id="delayInput" min="1" max="300" value="10" style="margin-right:8px;">\n          <span style="font-size:12px;">sec</span>\n        </div>\n        <button id="autoChatBtn" style="width:100%; margin-bottom:10px;">Enable Auto Chat</button>\n        <button id="patchBtn" style="width:100%; margin-bottom:10px;">Enable Special Characters(in chat/clan/name)</button>\n        <button id="spoofBtn" style="width:100%; margin-bottom:10px;">Spoof Username:Random Unicode Name(ban decrease)</button>\n        <button id="spinBtn" style="width:100%; margin-bottom:10px;">Enable Auto Spin</button>\n        <div class="spin-keybind">\n          <label for="spinKeyInput">Keybind:</label>\n          <input type="text" id="spinKeyInput" placeholder="PRESS" readonly>\n        </div>\n        <div class="credits">\n          Coder: Astraphobia<br>\n          Owner/Founder: Astraphobia<br>\n          Designer/Marketer: Astraphobia<br>\n          Tester: Astraphobia\n        </div>\n      </div>\n    ';
  document.body.appendChild(deepToolsPanel);
  deepToolsPanel.querySelector("#sendBtn").onclick = () => {
    const chatMessage = deepToolsPanel.querySelector("#chatMsg").value;
    if (chatMessage) {
      autoChat(chatMessage);
    }
  };
  const patchButton = deepToolsPanel.querySelector("#patchBtn");
  patchButton.onclick = () => initInterceptor(patchButton);
  const spoofButton = deepToolsPanel.querySelector("#spoofBtn");
  spoofButton.onclick = () => {
    const inputLimit = generateRandomString(8);
    if (simulateTyping(".play-game .el-input__inner", inputLimit)) {
      showNotification("Spoofed name!");
    } else if (simulateTyping(".new-tribe .el-input__inner", inputLimit)) {
      showNotification("Spoofed tribe name!");
    } else {
      showNotification("No name input found! Enable special characters first.");
    }
  };
  const spinButton = deepToolsPanel.querySelector("#spinBtn");
  spinButton.onclick = () => {
    toggleMouseSimulation();
    if (coreSharedState.rotationInterval) {
      spinButton.textContent = "Disable Auto Spin";
      spinButton.style.color = "var(--accent)";
      spinButton.style.opacity = "0.6";
    } else {
      spinButton.textContent = "Enable Auto Spin";
      spinButton.style.color = "var(--accent)";
      spinButton.style.opacity = "1";
    }
  };
  const spinKeyInput = deepToolsPanel.querySelector("#spinKeyInput");
  let pressedKey = null;
  spinKeyInput.addEventListener("keydown", (event) => {
    event.preventDefault();
    pressedKey = event.code || event.key;
    spinKeyInput.value = pressedKey.replace("Key", "").toLowerCase();
  });
  document.addEventListener("keydown", (event_2) => {
    if (
      pressedKey &&
      event_2.code === pressedKey &&
      !event_2.target.matches("input, textarea, button")
    ) {
      event_2.preventDefault();
      toggleMouseSimulation();
      if (coreSharedState.rotationInterval) {
        spinButton.textContent = "Disable Auto Spin";
        spinButton.style.color = "var(--accent)";
        spinButton.style.opacity = "0.6";
      } else {
        spinButton.textContent = "Enable Auto Spin";
        spinButton.style.color = "var(--accent)";
        spinButton.style.opacity = "1";
      }
    }
  });
  const autoChatButton = deepToolsPanel.querySelector("#autoChatBtn");
  autoChatButton.onclick = () => {
    const chatMessageValue = deepToolsPanel.querySelector("#chatMsg").value;
    const delayInput = deepToolsPanel.querySelector("#delayInput");
    const delayValue = parseInt(delayInput.value) || 10;
    if (!chatMessageValue) {
      showNotification("⚠️ Enter a message first!");
      return;
    }
    if (coreSharedState.isProcessing) {
      stopInterval();
      autoChatButton.textContent = "Enable Auto Chat";
      autoChatButton.style.color = "var(--accent)";
      autoChatButton.style.opacity = "1";
    } else {
      startScheduledTask(chatMessageValue, delayValue);
      autoChatButton.textContent = "Disable Auto Chat";
      autoChatButton.style.color = "var(--accent)";
      autoChatButton.style.opacity = "0.6";
    }
  };
  let deepToolsOffsetX;
  let deepToolsOffsetY;
  let deepToolsDragActive = false;
  let deepToolsIsDragging = false;
  deepToolsPanel.addEventListener("mousedown", (event_3) => {
    if (
      event_3.target.tagName === "BUTTON" ||
      event_3.target.tagName === "TEXTAREA" ||
      event_3.target.tagName === "INPUT" ||
      event_3.target.classList.contains("credits")
    ) {
      return;
    }
    deepToolsDragActive = true;
    deepToolsIsDragging = false;
    deepToolsOffsetX =
      event_3.clientX - deepToolsPanel.getBoundingClientRect().left;
    deepToolsOffsetY =
      event_3.clientY - deepToolsPanel.getBoundingClientRect().top;
    deepToolsPanel.style.transition = "none";
    const handleDeepToolsDrag = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - event_3.clientX;
      const deltaY = mouseEvent.clientY - event_3.clientY;
      if (
        !deepToolsIsDragging &&
        (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)
      ) {
        deepToolsIsDragging = true;
      }
      if (deepToolsDragActive) {
        deepToolsPanel.style.left =
          mouseEvent.clientX - deepToolsOffsetX + "px";
        deepToolsPanel.style.top = mouseEvent.clientY - deepToolsOffsetY + "px";
        deepToolsPanel.style.bottom = "auto";
        deepToolsPanel.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      deepToolsDragActive = false;
      deepToolsPanel.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", handleDeepToolsDrag);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleDeepToolsDrag);
    document.addEventListener("mouseup", handleMouseUp);
  });
  deepToolsPanel.addEventListener("click", (event_4) => {
    if (deepToolsIsDragging) {
      event_4.stopImmediatePropagation();
    }
  });
  if (localStorage.getItem("theme") === "halloween") {
    for (let loopIndex = 0; loopIndex < 3; loopIndex++) {
      const spanElement = document.createElement("span");
      spanElement.className = "bat";
      spanElement.textContent = "🦇";
      deepToolsPanel.appendChild(spanElement);
    }
  }
  return deepToolsPanel;
}
function injectPlusPanelStyles() {
  const plusPanelStyleElement = document.createElement("style");
  plusPanelStyleElement.textContent =
    "\n      #plus-panel {\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: var(--shadow);\n        border: 1px solid var(--border);\n        background: var(--bg-primary);\n        backdrop-filter: blur(20px);\n        border-radius: 16px;\n        position: relative;\n      }\n      #plus-panel:hover {\n        box-shadow: var(--shadow-hover);\n        transform: translateY(-2px);\n      }\n      #plus-panel textarea {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 8px;\n        padding: 10px;\n        transition: all 0.2s ease;\n        font-size: 13px;\n      }\n      #plus-panel textarea:focus {\n        outline: none;\n        border-color: var(--accent);\n        box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.2);\n      }\n      #plus-panel input[type=\"number\"] {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        width: 60px;\n        text-align: center;\n        transition: all 0.2s ease;\n      }\n      #plus-panel button {\n        background: var(--bg-secondary);\n        color: var(--accent);\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        padding: 10px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        position: relative;\n        overflow: hidden;\n        width: 100%;\n        margin-bottom: 10px;\n      }\n      #plus-panel button::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: -100%;\n        width: 100%;\n        height: 100%;\n        background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.2), transparent);\n        transition: left 0.5s;\n      }\n      #plus-panel button:hover:not(:disabled)::before {\n        left: 100%;\n      }\n      #plus-panel button:hover:not(:disabled) {\n        background: var(--hover-bg);\n        border-color: var(--accent);\n        transform: translateY(-1px);\n        box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.2);\n        color: var(--accent-hover);\n      }\n      #plus-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);\n      }\n      #plus-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      /* Theme-specific panel animations */\n      #plus-panel.themestarwars::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        background: radial-gradient(circle at center, rgba(255,255,255,0.1) 1px, transparent 1px);\n        background-size: 20px 20px;\n        animation: twinkle-stars 20s linear infinite;\n        z-index: -1;\n        border-radius: 16px;\n      }\n      #plus-panel.themekfc::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        z-index: -1;\n        border-radius: 16px;\n        background: radial-gradient(circle at 20% 30%, rgba(244,0,0,0.1) 2px, transparent 2px),\n                    radial-gradient(circle at 80% 70%, rgba(255,204,0,0.05) 1px, transparent 1px);\n        background-size: 40px 40px;\n      }\n      #plus-panel.themehalloween::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        z-index: -1;\n        border-radius: 16px;\n        background: radial-gradient(circle at 30% 20%, rgba(255, 102, 0, 0.1) 1px, transparent 1px),\n                    radial-gradient(circle at 70% 80%, rgba(139, 0, 255, 0.05) 2px, transparent 2px);\n        background-size: 30px 30px;\n        animation: halloween-glow 15s ease-in-out infinite alternate;\n      }\n      #plus-panel.themehalloween .bat {\n        position: absolute;\n        font-size: 20px;\n        animation: fly-bat 10s linear infinite;\n        pointer-events: none;\n        opacity: 0.7;\n      }\n      #plus-panel.themehalloween .bat:nth-child(1) { top: 10%; left: -10%; animation-delay: 0s; }\n      #plus-panel.themehalloween .bat:nth-child(2) { top: 50%; right: -10%; animation-delay: 3s; animation-direction: reverse; }\n      #plus-panel.themehalloween .bat:nth-child(3) { top: 80%; left: -10%; animation-delay: 6s; }\n      @keyframes fly-bat {\n        0% { transform: translateX(0) rotate(0deg); }\n        100% { transform: translateX(120%) rotate(360deg); }\n      }\n      @keyframes twinkle-stars {\n        0% { background-position: 0 0; }\n        100% { background-position: 20px 20px; }\n      }\n      @keyframes halloween-glow {\n        0% { opacity: 0.8; }\n        100% { opacity: 1; }\n      }\n    ";
  document.head.appendChild(plusPanelStyleElement);
  const plusPanel = document.createElement("div");
  plusPanel.id = "plus-panel";
  plusPanel.style.position = "fixed";
  plusPanel.style.top = "20px";
  plusPanel.style.right = "20px";
  plusPanel.style.color = "var(--text-primary)";
  plusPanel.style.padding = "16px";
  plusPanel.style.borderRadius = "16px";
  plusPanel.style.fontSize = "14px";
  plusPanel.style.zIndex = "99999";
  plusPanel.style.userSelect = "none";
  plusPanel.style.width = "240px";
  plusPanel.style.textAlign = "center";
  plusPanel.style.cursor = "move";
  plusPanel.style.overflow = "hidden";
  plusPanel.innerHTML =
    '\n      <div style="font-weight:600; margin-bottom:12px; color:var(--accent); height: 40px; line-height: 40px;">\n        ASTRAPHOBIA CLIENT+\n      </div>\n      <div id="plusContent">\n        <button id="thresherBtn">Enable Thresher Super Boost(ctrl + shift and click)(minumum required 2 boost)</button>\n        <button id="astraVisionBtn">Enable Astra-Vision (no-zoom limit, no ink flash or deep darkness)</button>\n        <button id="smallMinimapBtn">Enable Small Minimap</button>\n      </div>\n    ';
  document.body.appendChild(plusPanel);
  const thresherButton = plusPanel.querySelector("#thresherBtn");
  thresherButton.onclick = () => {
    if (coreSharedState.isInitialized_2) {
      showNotification("Thresher Super Boost is already active!");
      return;
    }
    initializeAntiTamper();
    thresherButton.textContent = "Thresher Super Boost Active";
    thresherButton.style.color = "var(--accent)";
    thresherButton.style.opacity = "0.6";
    thresherButton.disabled = true;
  };
  const astraVisionButton = plusPanel.querySelector("#astraVisionBtn");
  astraVisionButton.onclick = () => {
    if (isReady) {
      showNotification("Astra-Vision already enabled!");
      return;
    }
    initializeAntiTamper();
    disableGameRestrictions();
    astraVisionButton.textContent = "Astra-Vision Active";
    astraVisionButton.style.color = "var(--accent)";
    astraVisionButton.style.opacity = "0.6";
    astraVisionButton.disabled = true;
    showNotification(
      "👁️ Astra-Vision enabled! (zoom-limit unlocked, no ink-flash or deep darkness effects)",
    );
  };
  const smallMinimapButton = plusPanel.querySelector("#smallMinimapBtn");
  smallMinimapButton.onclick = () => {
    initializeAntiTamper();
    toggleMinimapScale();
    if (coreSharedState.isProcessing_2) {
      smallMinimapButton.textContent = "Disable Small Minimap";
      smallMinimapButton.style.color = "var(--accent)";
      smallMinimapButton.style.opacity = "0.6";
    } else {
      smallMinimapButton.textContent = "Enable Small Minimap";
      smallMinimapButton.style.color = "var(--accent)";
      smallMinimapButton.style.opacity = "1";
    }
  };
  let plusPanelOffsetX;
  let plusPanelOffsetY;
  let plusPanelDragActive = false;
  let plusPanelIsDragging = false;
  plusPanel.addEventListener("mousedown", (event) => {
    if (
      event.target.tagName === "BUTTON" ||
      event.target.tagName === "TEXTAREA" ||
      event.target.tagName === "INPUT" ||
      event.target.classList.contains("credits")
    ) {
      return;
    }
    plusPanelDragActive = true;
    plusPanelIsDragging = false;
    plusPanelOffsetX = event.clientX - plusPanel.getBoundingClientRect().left;
    plusPanelOffsetY = event.clientY - plusPanel.getBoundingClientRect().top;
    plusPanel.style.transition = "none";
    const handlePlusPanelDrag = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - event.clientX;
      const deltaY = mouseEvent.clientY - event.clientY;
      if (
        !plusPanelIsDragging &&
        (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)
      ) {
        plusPanelIsDragging = true;
      }
      if (plusPanelDragActive) {
        plusPanel.style.left = mouseEvent.clientX - plusPanelOffsetX + "px";
        plusPanel.style.top = mouseEvent.clientY - plusPanelOffsetY + "px";
        plusPanel.style.bottom = "auto";
        plusPanel.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      plusPanelDragActive = false;
      plusPanel.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", handlePlusPanelDrag);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handlePlusPanelDrag);
    document.addEventListener("mouseup", handleMouseUp);
  });
  plusPanel.addEventListener("click", (event_2) => {
    if (plusPanelIsDragging) {
      event_2.stopImmediatePropagation();
    }
  });
  if (localStorage.getItem("theme") === "halloween") {
    for (let index = 0; index < 3; index++) {
      const spanElement = document.createElement("span");
      spanElement.className = "bat";
      spanElement.textContent = "🦇";
      plusPanel.appendChild(spanElement);
    }
  }
  return plusPanel;
}
function applyHomeBackground() {
  const storedBgUrl = localStorage.getItem("bgUrl") || "";
  if (storedBgUrl === "") {
    return;
  }
  let homeBgElement = document.querySelector(".home-bg");
  const setHomeBackgroundImage = () => {
    homeBgElement = document.querySelector(".home-bg");
    if (homeBgElement) {
      homeBgElement.style.setProperty(
        "background-image",
        'url("' + storedBgUrl + '")',
        "important",
      );
    }
  };
  if (!homeBgElement) {
    const bgCheckInterval = setInterval(() => {
      homeBgElement = document.querySelector(".home-bg");
      if (homeBgElement != null) {
        clearInterval(bgCheckInterval);
        setHomeBackgroundImage();
      }
    }, 100);
  } else {
    setHomeBackgroundImage();
  }
}
function applyThemeColors(themeName) {
  const rootElement = document.documentElement;
  const themeConfig = {
    blue: {
      "--bg-primary": "rgba(15, 15, 35, 0.95)",
      "--bg-secondary": "rgba(45, 45, 75, 0.8)",
      "--text-primary": "#ffffff",
      "--text-secondary": "#b0b0d4",
      "--accent": "#00d4ff",
      "--accent-hover": "#ffffff",
      "--border": "rgba(0, 212, 255, 0.2)",
      "--accent-rgb": "0, 212, 255",
      "--hover-bg": "rgba(45, 45, 75, 1)",
      "--shadow": "0 8px 32px rgba(0, 0, 0, 0.3)",
      "--shadow-hover": "0 12px 40px rgba(0, 0, 0, 0.4)",
    },
    red: {
      "--bg-primary": "rgba(25, 10, 10, 0.95)",
      "--bg-secondary": "rgba(55, 30, 30, 0.8)",
      "--text-primary": "#ffffff",
      "--text-secondary": "#ffcccc",
      "--accent": "#ff4757",
      "--accent-hover": "#ffffff",
      "--border": "rgba(255, 71, 87, 0.2)",
      "--accent-rgb": "255, 71, 87",
      "--hover-bg": "rgba(75, 45, 45, 1)",
      "--shadow": "0 8px 32px rgba(0, 0, 0, 0.3)",
      "--shadow-hover": "0 12px 40px rgba(0, 0, 0, 0.4)",
    },
    green: {
      "--bg-primary": "rgba(10, 25, 10, 0.95)",
      "--bg-secondary": "rgba(30, 55, 30, 0.8)",
      "--text-primary": "#ffffff",
      "--text-secondary": "#ccffcc",
      "--accent": "#2ed573",
      "--accent-hover": "#ffffff",
      "--border": "rgba(46, 213, 115, 0.2)",
      "--accent-rgb": "46, 213, 115",
      "--hover-bg": "rgba(45, 75, 45, 1)",
      "--shadow": "0 8px 32px rgba(0, 0, 0, 0.3)",
      "--shadow-hover": "0 12px 40px rgba(0, 0, 0, 0.4)",
    },
    pink: {
      "--bg-primary": "rgba(35, 15, 35, 0.95)",
      "--bg-secondary": "rgba(65, 45, 65, 0.8)",
      "--text-primary": "#ffffff",
      "--text-secondary": "#ffb3d9",
      "--accent": "#ff69b4",
      "--accent-hover": "#ffffff",
      "--border": "rgba(255, 105, 180, 0.2)",
      "--accent-rgb": "255, 105, 180",
      "--hover-bg": "rgba(85, 65, 85, 1)",
      "--shadow": "0 8px 32px rgba(0, 0, 0, 0.3)",
      "--shadow-hover": "0 12px 40px rgba(0, 0, 0, 0.4)",
    },
    starwars: {
      "--bg-primary": "rgba(0, 0, 0, 0.95)",
      "--bg-secondary": "rgba(50, 50, 50, 0.8)",
      "--text-primary": "#FFFF00",
      "--text-secondary": "#CCCC00",
      "--accent": "#FFD700",
      "--accent-hover": "#FFFFFF",
      "--border": "rgba(255, 215, 0, 0.2)",
      "--accent-rgb": "255, 215, 0",
      "--hover-bg": "rgba(80, 80, 80, 1)",
      "--shadow": "0 8px 32px rgba(0, 0, 0, 0.3)",
      "--shadow-hover": "0 12px 40px rgba(0, 0, 0, 0.4)",
    },
    kfc: {
      "--bg-primary": "rgba(0, 0, 0, 0.92)",
      "--bg-secondary": "rgba(30, 30, 30, 0.85)",
      "--text-primary": "#ffffff",
      "--text-secondary": "#ffcc00",
      "--accent": "#f40000",
      "--accent-hover": "#ffffff",
      "--border": "rgba(244, 0, 0, 0.3)",
      "--accent-rgb": "244, 0, 0",
      "--hover-bg": "rgba(50, 0, 0, 1)",
      "--shadow": "0 8px 32px rgba(0, 0, 0, 0.4)",
      "--shadow-hover": "0 12px 40px rgba(244, 0, 0, 0.3)",
    },
    halloween: {
      "--bg-primary": "rgba(13, 0, 13, 0.95)",
      "--bg-secondary": "rgba(43, 20, 43, 0.8)",
      "--text-primary": "#ffffff",
      "--text-secondary": "#ffcc99",
      "--accent": "#ff6600",
      "--accent-hover": "#ffffff",
      "--border": "rgba(255, 102, 0, 0.2)",
      "--accent-rgb": "255, 102, 0",
      "--hover-bg": "rgba(63, 40, 63, 1)",
      "--shadow": "0 8px 32px rgba(0, 0, 0, 0.3)",
      "--shadow-hover": "0 12px 40px rgba(0, 0, 0, 0.4)",
    },
  };
  const selectedColor = themeConfig[themeName] || themeConfig.blue;
  Object.entries(selectedColor).forEach(([cssProperty, cssValue]) => {
    rootElement.style.setProperty(cssProperty, cssValue);
  });
  localStorage.setItem("theme", themeName);
  const toolPanels = document.querySelectorAll(
    "#deep-tools-panel, #plus-panel, #settings-panel, #update-history",
  );
  toolPanels.forEach((themeElement) => {
    themeElement.className =
      themeElement.className.replace(/theme\w+/, "") + (" theme" + themeName);
  });
  const limitedEditionElement = document.getElementById("limitedEdition");
  if (limitedEditionElement) {
    limitedEditionElement.style.display =
      themeName === "halloween" ? "block" : "none";
  }
  if (themeName === "halloween") {
    toolPanels.forEach((containerElement) => {
      containerElement
        .querySelectorAll(".bat")
        .forEach((element) => element.remove());
      for (let index = 0; index < 3; index++) {
        const spanElement = document.createElement("span");
        spanElement.className = "bat";
        spanElement.textContent = "🦇";
        containerElement.appendChild(spanElement);
      }
    });
  } else {
    document
      .querySelectorAll(".bat")
      .forEach((elementToRemove) => elementToRemove.remove());
  }
}
function injectSettingsPanelStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent =
    "\n      #settings-panel {\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: var(--shadow);\n        border: 1px solid var(--border);\n        background: var(--bg-primary);\n        backdrop-filter: blur(20px);\n        border-radius: 16px;\n        position: fixed;\n        top: 20px;\n        left: 20px;\n        color: var(--text-primary);\n        padding: 16px;\n        font-size: 14px;\n        z-index: 99999;\n        user-select: none;\n        width: 240px;\n        text-align: center;\n        cursor: move;\n        overflow: hidden;\n        position: relative;\n      }\n      #settings-panel:hover {\n        box-shadow: var(--shadow-hover);\n        transform: translateY(-2px);\n      }\n      #settings-panel button {\n        background: var(--bg-secondary);\n        color: var(--accent);\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        padding: 10px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        width: 100%;\n        margin-bottom: 10px;\n        position: relative;\n        overflow: hidden;\n      }\n      #settings-panel button::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: -100%;\n        width: 100%;\n        height: 100%;\n        background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.2), transparent);\n        transition: left 0.5s;\n      }\n      #settings-panel button:hover:not(:disabled)::before {\n        left: 100%;\n      }\n      #settings-panel button:hover:not(:disabled) {\n        background: var(--hover-bg);\n        border-color: var(--accent);\n        transform: translateY(-1px);\n        box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.2);\n        color: var(--accent-hover);\n      }\n      #settings-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);\n      }\n      #settings-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #settings-panel .keybind-set, #settings-panel .bg-set {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        margin-bottom: 10px;\n        font-size: 12px;\n      }\n      #settings-panel .keybind-set label, #settings-panel .bg-set label {\n        color: var(--text-primary);\n      }\n      #settings-panel #toggleKeyInput, #settings-panel #bgUrl {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        text-align: center;\n        transition: all 0.2s ease;\n      }\n      #settings-panel #toggleKeyInput {\n        width: 80px;\n      }\n      #settings-panel #bgUrl {\n        width: 120px;\n      }\n      #settings-panel .section-header {\n        font-weight: bold;\n        color: var(--accent);\n        margin: 12px 0 6px 0;\n        font-size: 13px;\n      }\n      #settings-panel select {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        width: 100%;\n        margin-bottom: 10px;\n        transition: all 0.2s ease;\n      }\n      #settings-panel select:focus {\n        outline: none;\n        border-color: var(--accent);\n        box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.2);\n      }\n      #settings-panel .limited-edition {\n        font-size: 11px;\n        color: #ff6600;\n        font-style: italic;\n        margin-top: 4px;\n      }\n      /* Theme-specific panel animations */\n      #settings-panel.themestarwars::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        background: radial-gradient(circle at center, rgba(255,255,255,0.1) 1px, transparent 1px);\n        background-size: 20px 20px;\n        animation: twinkle-stars 20s linear infinite;\n        z-index: -1;\n        border-radius: 16px;\n      }\n      #settings-panel.themekfc::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        z-index: -1;\n        border-radius: 16px;\n        background: radial-gradient(circle at 20% 30%, rgba(244,0,0,0.1) 2px, transparent 2px),\n                    radial-gradient(circle at 80% 70%, rgba(255,204,0,0.05) 1px, transparent 1px);\n        background-size: 40px 40px;\n      }\n      #settings-panel.themehalloween::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        z-index: -1;\n        border-radius: 16px;\n        background: radial-gradient(circle at 30% 20%, rgba(255, 102, 0, 0.1) 1px, transparent 1px),\n                    radial-gradient(circle at 70% 80%, rgba(139, 0, 255, 0.05) 2px, transparent 2px);\n        background-size: 30px 30px;\n        animation: halloween-glow 15s ease-in-out infinite alternate;\n      }\n      #settings-panel.themehalloween .bat {\n        position: absolute;\n        font-size: 20px;\n        animation: fly-bat 10s linear infinite;\n        pointer-events: none;\n        opacity: 0.7;\n      }\n      #settings-panel.themehalloween .bat:nth-child(1) { top: 10%; left: -10%; animation-delay: 0s; }\n      #settings-panel.themehalloween .bat:nth-child(2) { top: 50%; right: -10%; animation-delay: 3s; animation-direction: reverse; }\n      #settings-panel.themehalloween .bat:nth-child(3) { top: 80%; left: -10%; animation-delay: 6s; }\n      @keyframes fly-bat {\n        0% { transform: translateX(0) rotate(0deg); }\n        100% { transform: translateX(120%) rotate(360deg); }\n      }\n      @keyframes twinkle-stars {\n        0% { background-position: 0 0; }\n        100% { background-position: 20px 20px; }\n      }\n      @keyframes halloween-glow {\n        0% { opacity: 0.8; }\n        100% { opacity: 1; }\n      }\n    ";
  document.head.appendChild(styleElement);
  const draggableElement = document.createElement("div");
  draggableElement.id = "settings-panel";
  draggableElement.innerHTML =
    '\n      <div style="font-weight:600; margin-bottom:12px; color:var(--accent); height: 40px; line-height: 40px;">\n        SETTINGS\n      </div>\n      <div id="settingsContent">\n        <div class="keybind-set">\n          <label for="toggleKeyInput">Toggle Client:</label>\n          <input type="text" id="toggleKeyInput" placeholder="PRESS" readonly>\n        </div>\n        <div class="section-header">Custom Background</div>\n        <div class="bg-set">\n          <label for="bgUrl">BG URL:</label>\n          <input type="text" id="bgUrl" placeholder="Image/GIF URL">\n        </div>\n        <button id="applyBg">Apply Custom Background</button>\n        <div class="section-header">Themes</div>\n        <select id="themeSelect">\n          <option value="blue">Blue (Default)</option>\n          <option value="red">Red</option>\n          <option value="green">Green</option>\n          <option value="pink">Pink</option>\n          <option value="starwars">Star Wars</option>\n          <option value="kfc">KFC🍗</option>\n          <option value="halloween">Halloween 🎃</option>\n        </select>\n        <div id="limitedEdition" class="limited-edition" style="display:none;">Limited Edition</div>\n      </div>\n    ';
  document.body.appendChild(draggableElement);
  const bgUrlInput = draggableElement.querySelector("#bgUrl");
  bgUrlInput.value = localStorage.getItem("bgUrl") || "";
  const applyBgButton = draggableElement.querySelector("#applyBg");
  applyBgButton.onclick = () => {
    const backgroundUrl = bgUrlInput.value.trim();
    if (backgroundUrl === "") {
      showNotification("Enter a URL first!");
      return;
    }
    localStorage.setItem("bgUrl", backgroundUrl);
    let homeBgElement = document.querySelector(".home-bg");
    const updateHomeBackgroundImage = () => {
      homeBgElement = document.querySelector(".home-bg");
      if (homeBgElement) {
        homeBgElement.style.setProperty(
          "background-image",
          'url("' + backgroundUrl + '")',
          "important",
        );
      }
    };
    if (homeBgElement == null) {
      const bgCheckInterval = setInterval(() => {
        homeBgElement = document.querySelector(".home-bg");
        if (homeBgElement != null) {
          clearInterval(bgCheckInterval);
          updateHomeBackgroundImage();
        }
      }, 100);
    } else {
      updateHomeBackgroundImage();
    }
    showNotification("Custom Background applied!");
  };
  const themeSelect = draggableElement.querySelector("#themeSelect");
  const currentTheme = localStorage.getItem("theme") || "blue";
  themeSelect.value = currentTheme;
  applyThemeColors(currentTheme);
  themeSelect.onchange = (themeChangeEvent) => {
    const selectedTheme = themeChangeEvent.target.value;
    if (selectedTheme === "halloween") {
      createHalloweenModal((isHalloween) => {
        if (isHalloween) {
          applyThemeColors("halloween");
        } else {
          themeChangeEvent.target.value = "blue";
          applyThemeColors("blue");
        }
      });
    } else {
      applyThemeColors(selectedTheme);
      showNotification("Theme changed to " + selectedTheme);
    }
  };
  const toggleKeyInput = draggableElement.querySelector("#toggleKeyInput");
  toggleKeyInput.value = coreSharedState.activeKey;
  toggleKeyInput.addEventListener("keydown", (keyboardEvent) => {
    keyboardEvent.preventDefault();
    coreSharedState.activeKey = keyboardEvent.key;
    toggleKeyInput.value = coreSharedState.activeKey;
  });
  let offsetX;
  let offsetY;
  let isDraggingActive = false;
  let isDragging = false;
  draggableElement.addEventListener("mousedown", (clickEvent) => {
    if (
      clickEvent.target.tagName === "BUTTON" ||
      clickEvent.target.tagName === "INPUT" ||
      clickEvent.target.classList.contains("credits")
    ) {
      return;
    }
    isDraggingActive = true;
    isDragging = false;
    offsetX =
      clickEvent.clientX - draggableElement.getBoundingClientRect().left;
    offsetY = clickEvent.clientY - draggableElement.getBoundingClientRect().top;
    draggableElement.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - clickEvent.clientX;
      const deltaY = mouseEvent.clientY - clickEvent.clientY;
      if (!isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isDragging = true;
      }
      if (isDraggingActive) {
        draggableElement.style.left = mouseEvent.clientX - offsetX + "px";
        draggableElement.style.top = mouseEvent.clientY - offsetY + "px";
        draggableElement.style.bottom = "auto";
        draggableElement.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      isDraggingActive = false;
      draggableElement.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
  draggableElement.addEventListener("click", (propagationEvent) => {
    if (isDragging) {
      propagationEvent.stopImmediatePropagation();
    }
  });
  if (localStorage.getItem("theme") === "halloween") {
    for (let i = 0; i < 3; i++) {
      const spanElement = document.createElement("span");
      spanElement.className = "bat";
      spanElement.textContent = "🦇";
      draggableElement.appendChild(spanElement);
    }
  }
  return draggableElement;
}
function setBlueTheme() {
  setTimeout(() => {
    localStorage.setItem("theme", "blue");
    const initialValue = injectDeepToolsStyles();
    const sessionData = createUpdateHistoryStyles();
    const configSettings = injectSettingsPanelStyles();
    const appContext = injectPlusPanelStyles();
    applyThemeColors("blue");
    applyHomeBackground();
    initAdBlocker();
  }, 1000);
  return {
    mainPanel: null,
    historyPanel: null,
    settingsPanel: null,
    plusPanel: null,
  };
}

export {
  createUpdateHistoryStyles,
  injectDeepToolsStyles,
  injectPlusPanelStyles,
  applyHomeBackground,
  applyThemeColors,
  injectSettingsPanelStyles,
  setBlueTheme,
};
