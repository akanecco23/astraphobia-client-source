import {
  game,
  player,
  securitySettings,
  radius,
  hookTextEncoder,
  isActive,
  initHooks,
  disableGameRestrictions,
  coreSharedState,
} from "../core.js";
import {
  startScheduledTask,
  stopInterval,
  autoChat,
} from "../features/chat.js";
import { simulateTyping, showNotification } from "./interaction.js";
import { toggleMouseSimulation } from "../features/movement.js";
import { handleAnimalAction } from "../features/autofarm.js";
import { toggleMinimapSize } from "../features/esp.js";
import { generateRandomString } from "../utils.js";

const initControlOverlay = () => {
  if (coreSharedState.isInitialized_2) {
    return;
  }
  function sendActionSequence() {
    try {
      handleAnimalAction(1);
      setTimeout(() => {
        handleAnimalAction(5000);
      }, 50);
      setTimeout(() => {
        handleAnimalAction(5000);
      }, 100);
      setTimeout(() => {
        handleAnimalAction(5000);
      }, 150);
    } catch {}
  }
  function createControlOverlay() {
    try {
      document.getElementById("ctrl-overlay").remove();
    } catch {}
    const overlayDiv = document.createElement("div");
    const gameContainer = document.querySelector("div.game");
    if (gameContainer) {
      gameContainer.insertBefore(overlayDiv, gameContainer.children[0]);
    }
    overlayDiv.outerHTML =
      '<div id="ctrl-overlay" style="width: 100%;height: 100%;position: absolute;display: block;z-index:10000;pointer-events:none;"></div>';
    document
      .getElementById("ctrl-overlay")
      .addEventListener("contextmenu", (event) => event.preventDefault());
  }
  createControlOverlay();
  window.addEventListener(
    "click",
    (myAnimalsHandler) => {
      try {
        if (!player?.myAnimals?.[0]) {
          return;
        }
        const visibleFishLevel = player.myAnimals[0].visibleFishLevel;
        const fishSettings = {
          ...securitySettings.default,
          ...securitySettings[visibleFishLevel],
        };
        if (myAnimalsHandler.ctrlKey) {
          if (myAnimalsHandler.shiftKey && visibleFishLevel === 107) {
            sendActionSequence();
            return;
          } else if (
            myAnimalsHandler.shiftKey &&
            visibleFishLevel !== 101 &&
            player.myAnimals[0]._standing
          ) {
            handleAnimalAction(
              Math.floor(Math.random() * 1647483648) + 500000000,
            );
            return;
          } else {
            let keyMap = Object.getOwnPropertyNames(game)
              .map((clientKey) => game[clientKey])
              .find((inputMap) => inputMap.keys instanceof Array);
            if (keyMap) {
              keyMap.pointerDown = true;
              keyMap.pressElapsed = Infinity;
              keyMap.setPointerDown(false);
            }
          }
        } else if (myAnimalsHandler.altKey) {
          handleAnimalAction(
            player?.myAnimals?.[0]?._standing
              ? 41
              : Math.floor(fishSettings.secLoadTime / 2),
          );
        }
      } catch {}
    },
    false,
  );
  window.addEventListener(
    "keyup",
    (keyboardEvent) => {
      try {
        if (!keyboardEvent.ctrlKey && !keyboardEvent.altKey) {
          document.getElementById("ctrl-overlay").style.pointerEvents = "none";
        }
      } catch {}
    },
    false,
  );
  window.addEventListener("focus", () => {
    try {
      document.getElementById("ctrl-overlay").style.pointerEvents = "none";
    } catch {}
  });
  coreSharedState.isInitialized_2 = true;
};
function createUpdateHistoryPanel() {
  const historyStyle = document.createElement("style");
  historyStyle.textContent =
    "\n      #update-history {\n        position: fixed;\n        bottom: 20px;\n        left: 20px;\n        background: rgba(15, 15, 35, 0.95);\n        color: #ffffff;\n        padding: 16px;\n        border-radius: 16px;\n        font-size: 13px;\n        z-index: 9999;\n        max-width: 240px;\n        max-height: 280px;\n        overflow-y: auto;\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        cursor: move;\n        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);\n        border: 1px solid rgba(0, 212, 255, 0.2);\n        transition: all 0.3s ease;\n        backdrop-filter: blur(20px);\n      }\n      #update-history:hover {\n        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);\n        transform: translateY(-2px);\n      }\n      #update-history ul {\n        margin: 0;\n        padding-left: 18px;\n      }\n      #update-history li {\n        margin-bottom: 6px;\n        line-height: 1.4;\n      }\n      #update-history h3 {\n        margin: 0 0 12px 0;\n        font-size: 15px;\n        color: #00d4ff;\n        position: relative;\n        padding-right: 28px;\n        font-weight: 600;\n      }\n      #update-history button.min-btn {\n        background: none;\n        border: none;\n        color: #00d4ff;\n        font-size: 20px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 8px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: all 0.2s ease;\n        width: 24px;\n        height: 24px;\n        line-height: 24px;\n        border-radius: 50%;\n      }\n      #update-history button.min-btn:hover {\n        color: #ffffff;\n        background: rgba(0, 212, 255, 0.2);\n      }\n    ";
  document.head.appendChild(historyStyle);
  const historyPanel = document.createElement("div");
  historyPanel.id = "update-history";
  historyPanel.innerHTML =
    '\n      <h3>Update History <button class="min-btn" id="minHist">−</button></h3>\n      <div id="historyContent">\n        <ul>\n          <li>v1.3 - New Blue Themed UI with new UI animations and Client Logo! No more minimize or maximize for everything but Update History because of toogle client tool. Updated Astraphobia Client Website and Discord! Also, added new small minimap feature.</li>\n          <li>v1.2 - Astra-Vision added - no ink flash or deep darkness effects + no-zoom limit, added new client ui rework, and custom-background feature (images and gif\'s).</li>\n          <li>v1.1 - Added built-in ad blocker, removed boost trail, spoofing for username, keybind selector for auto spin, added settings GUI, added shift keybind to toogle all panels.</li>\n          <li>v1.0 - Initial release with auto chat, auto-spin, special character bypass, and thresher super boost, no-zoom limit is automatically enabled.</li>\n        </ul>\n      </div>\n    ';
  document.body.appendChild(historyPanel);
  const minHistElement = historyPanel.querySelector("#minHist");
  const historyContentElement = historyPanel.querySelector("#historyContent");
  let isHistoryHidden = false;
  minHistElement.onclick = (toggleEvent) => {
    toggleEvent.stopPropagation();
    isHistoryHidden = !isHistoryHidden;
    historyContentElement.style.display = isHistoryHidden ? "none" : "block";
    historyPanel.style.height = isHistoryHidden ? "60px" : "auto";
    minHistElement.textContent = isHistoryHidden ? "+" : "−";
  };
  let offsetX;
  let offsetY;
  let isDragging = false;
  let isResizing = false;
  historyPanel.addEventListener("mousedown", (clickEvent) => {
    if (
      ["BUTTON", "INPUT", "TEXTAREA", "A"].includes(clickEvent.target.tagName)
    ) {
      return;
    }
    isDragging = true;
    isResizing = false;
    offsetX = clickEvent.clientX - historyPanel.getBoundingClientRect().left;
    offsetY = clickEvent.clientY - historyPanel.getBoundingClientRect().top;
    historyPanel.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - clickEvent.clientX;
      const deltaY = mouseEvent.clientY - clickEvent.clientY;
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
  historyPanel.addEventListener("click", (interceptEvent) => {
    if (isResizing) {
      interceptEvent.stopImmediatePropagation();
    }
  });
  return historyPanel;
}
function createDeepToolsPanel() {
  const toolsStyle = document.createElement("style");
  toolsStyle.textContent =
    "\n      :root {\n        --bg-primary: rgba(15, 15, 35, 0.95);\n        --bg-secondary: rgba(45, 45, 75, 0.8);\n        --text-primary: #ffffff;\n        --text-secondary: #b0b0d4;\n        --accent: #00d4ff;\n        --accent-hover: #ffffff;\n        --border: rgba(0, 212, 255, 0.2);\n        --shadow: 0 8px 32px rgba(0, 0, 0, 0.3);\n        --shadow-hover: 0 12px 40px rgba(0, 0, 0, 0.4);\n      }\n      #deep-tools-panel {\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: var(--shadow);\n        border: 1px solid var(--border);\n        background: var(--bg-primary);\n        backdrop-filter: blur(20px);\n        border-radius: 16px;\n      }\n      #deep-tools-panel:hover {\n        box-shadow: var(--shadow-hover);\n        transform: translateY(-2px);\n      }\n      #deep-tools-panel textarea {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 8px;\n        padding: 10px;\n        transition: all 0.2s ease;\n        font-size: 13px;\n      }\n      #deep-tools-panel textarea:focus {\n        outline: none;\n        border-color: var(--accent);\n        box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);\n      }\n      #deep-tools-panel input[type=\"number\"] {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        width: 60px;\n        text-align: center;\n        transition: all 0.2s ease;\n      }\n      #deep-tools-panel button {\n        background: var(--bg-secondary);\n        color: var(--accent);\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        padding: 10px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        position: relative;\n        overflow: hidden;\n      }\n      #deep-tools-panel button::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: -100%;\n        width: 100%;\n        height: 100%;\n        background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.2), transparent);\n        transition: left 0.5s;\n      }\n      #deep-tools-panel button:hover:not(:disabled)::before {\n        left: 100%;\n      }\n      #deep-tools-panel button:hover:not(:disabled) {\n        background: rgba(45, 45, 75, 1);\n        border-color: var(--accent);\n        transform: translateY(-1px);\n        box-shadow: 0 4px 12px rgba(0, 212, 255, 0.2);\n        color: var(--accent-hover);\n      }\n      #deep-tools-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);\n      }\n      #deep-tools-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #deep-tools-panel .credits {\n        margin-top: 12px;\n        font-size: 11px;\n        color: var(--text-secondary);\n        line-height: 1.4;\n      }\n      #deep-tools-panel .auto-chat-controls {\n        display: flex;\n        gap: 8px;\n        margin-bottom: 10px;\n        align-items: center;\n        justify-content: center;\n      }\n      #deep-tools-panel .spin-keybind {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        margin-bottom: 10px;\n        font-size: 12px;\n      }\n      #deep-tools-panel .spin-keybind label {\n        color: var(--text-primary);\n      }\n      #deep-tools-panel #spinKeyInput {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        width: 50px;\n        text-align: center;\n        transition: all 0.2s ease;\n      }\n      #aim-overlay, #ctrl-overlay {\n        z-index: 10000 !important;\n      }\n      div.game {\n        position: relative;\n      }\n      /* Ad Removal */\n      div.sidebar.left > div.ad-block {\n        opacity: 0 !important;\n        pointer-events: none !important;\n        display: none !important;\n      }\n      div.sidebar.left > a {\n        display: none !important;\n      }\n      div.sidebar.left {\n        max-width: 30vw;\n        width: 21rem;\n        bottom: 0 !important;\n      }\n    ";
  document.head.appendChild(toolsStyle);
  const container = document.createElement("div");
  container.id = "deep-tools-panel";
  container.style.position = "fixed";
  container.style.bottom = "20px";
  container.style.right = "20px";
  container.style.color = "var(--text-primary)";
  container.style.padding = "16px";
  container.style.borderRadius = "16px";
  container.style.fontSize = "14px";
  container.style.zIndex = "99999";
  container.style.userSelect = "none";
  container.style.width = "240px";
  container.style.textAlign = "center";
  container.style.cursor = "move";
  container.style.overflow = "hidden";
  container.innerHTML =
    '\n      <div style="font-weight:600; margin-bottom:12px; color:var(--accent); height: 40px; line-height: 40px;">\n        ASTRAPHOBIA CLIENT\n      </div>\n      <div id="panelContent">\n        <textarea id="chatMsg" placeholder="Type message..." style="width:100%; height:50px; margin-bottom:10px; resize:none;"></textarea>\n        <button id="sendBtn" style="width:100%; margin-bottom:10px;">Send Typed Chat</button>\n        <div class="auto-chat-controls">\n          <input type="number" id="delayInput" min="1" max="300" value="10" style="margin-right:8px;">\n          <span style="font-size:12px;">sec</span>\n        </div>\n        <button id="autoChatBtn" style="width:100%; margin-bottom:10px;">Enable Auto Chat</button>\n        <button id="patchBtn" style="width:100%; margin-bottom:10px;">Enable Special Characters(in chat/clan/name)</button>\n        <button id="spoofBtn" style="width:100%; margin-bottom:10px;">Spoof Username:Random Unicode Name(ban decrease)</button>\n        <button id="spinBtn" style="width:100%; margin-bottom:10px;">Enable Auto Spin</button>\n        <div class="spin-keybind">\n          <label for="spinKeyInput">Keybind:</label>\n          <input type="text" id="spinKeyInput" placeholder="PRESS" readonly>\n        </div>\n        <div class="credits">\n          Coder: Astraphobia<br>\n          Owner/Founder: Astraphobia<br>\n          Designer/Marketer: Astraphobia<br>\n          Tester: Astraphobia\n        </div>\n      </div>\n    ';
  document.body.appendChild(container);
  container.querySelector("#sendBtn").onclick = () => {
    const chatMessage = container.querySelector("#chatMsg").value;
    if (chatMessage) {
      autoChat(chatMessage);
    }
  };
  const patchButton = container.querySelector("#patchBtn");
  patchButton.onclick = () => hookTextEncoder(patchButton);
  const spoofButton = container.querySelector("#spoofBtn");
  spoofButton.onclick = () => {
    const maxLength = generateRandomString(8);
    if (simulateTyping(".play-game .el-input__inner", maxLength)) {
      showNotification("Spoofed name!");
    } else if (simulateTyping(".new-tribe .el-input__inner", maxLength)) {
      showNotification("Spoofed tribe name!");
    } else {
      showNotification("No name input found! Enable special characters first.");
    }
  };
  const spinButton = container.querySelector("#spinBtn");
  spinButton.onclick = () => {
    toggleMouseSimulation();
    if (coreSharedState.animationInterval) {
      spinButton.textContent = "Disable Auto Spin";
      spinButton.style.color = "#27ae60";
    } else {
      spinButton.textContent = "Enable Auto Spin";
      spinButton.style.color = "var(--accent)";
    }
  };
  const spinKeyInput = container.querySelector("#spinKeyInput");
  let lastKeyCode = null;
  spinKeyInput.addEventListener("keydown", (event) => {
    event.preventDefault();
    lastKeyCode = event.code || event.key;
    spinKeyInput.value = lastKeyCode.replace("Key", "").toLowerCase();
  });
  document.addEventListener("keydown", (keyEvent) => {
    if (
      lastKeyCode &&
      keyEvent.code === lastKeyCode &&
      !keyEvent.target.matches("input, textarea, button")
    ) {
      keyEvent.preventDefault();
      toggleMouseSimulation();
      if (coreSharedState.animationInterval) {
        spinButton.textContent = "Disable Auto Spin";
        spinButton.style.color = "#27ae60";
      } else {
        spinButton.textContent = "Enable Auto Spin";
        spinButton.style.color = "var(--accent)";
      }
    }
  });
  const autoChatButton = container.querySelector("#autoChatBtn");
  autoChatButton.onclick = () => {
    const chatMessageValue = container.querySelector("#chatMsg").value;
    const delayInput = container.querySelector("#delayInput");
    const delayValue = parseInt(delayInput.value) || 10;
    if (!chatMessageValue) {
      showNotification("⚠️ Enter a message first!");
      return;
    }
    if (coreSharedState.isProcessing) {
      stopInterval();
      autoChatButton.textContent = "Enable Auto Chat";
      autoChatButton.style.color = "var(--accent)";
    } else {
      startScheduledTask(chatMessageValue, delayValue);
      autoChatButton.textContent = "Disable Auto Chat";
      autoChatButton.style.color = "#27ae60";
    }
  };
  let offsetX;
  let offsetY;
  let isDragging = false;
  let isEnabled = false;
  container.addEventListener("mousedown", (clickEvent) => {
    if (
      clickEvent.target.tagName === "BUTTON" ||
      clickEvent.target.tagName === "TEXTAREA" ||
      clickEvent.target.tagName === "INPUT" ||
      clickEvent.target.classList.contains("credits")
    ) {
      return;
    }
    isDragging = true;
    isEnabled = false;
    offsetX = clickEvent.clientX - container.getBoundingClientRect().left;
    offsetY = clickEvent.clientY - container.getBoundingClientRect().top;
    container.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - clickEvent.clientX;
      const deltaY = mouseEvent.clientY - clickEvent.clientY;
      if (!isEnabled && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isEnabled = true;
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
  container.addEventListener("click", (eventToStop) => {
    if (isEnabled) {
      eventToStop.stopImmediatePropagation();
    }
  });
  return container;
}
function injectPlusPanelStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent =
    "\n      #plus-panel {\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: var(--shadow);\n        border: 1px solid var(--border);\n        background: var(--bg-primary);\n        backdrop-filter: blur(20px);\n        border-radius: 16px;\n      }\n      #plus-panel:hover {\n        box-shadow: var(--shadow-hover);\n        transform: translateY(-2px);\n      }\n      #plus-panel textarea {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 8px;\n        padding: 10px;\n        transition: all 0.2s ease;\n        font-size: 13px;\n      }\n      #plus-panel textarea:focus {\n        outline: none;\n        border-color: var(--accent);\n        box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);\n      }\n      #plus-panel input[type=\"number\"] {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        width: 60px;\n        text-align: center;\n        transition: all 0.2s ease;\n      }\n      #plus-panel button {\n        background: var(--bg-secondary);\n        color: var(--accent);\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        padding: 10px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        position: relative;\n        overflow: hidden;\n        width: 100%;\n        margin-bottom: 10px;\n      }\n      #plus-panel button::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: -100%;\n        width: 100%;\n        height: 100%;\n        background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.2), transparent);\n        transition: left 0.5s;\n      }\n      #plus-panel button:hover:not(:disabled)::before {\n        left: 100%;\n      }\n      #plus-panel button:hover:not(:disabled) {\n        background: rgba(45, 45, 75, 1);\n        border-color: var(--accent);\n        transform: translateY(-1px);\n        box-shadow: 0 4px 12px rgba(0, 212, 255, 0.2);\n        color: var(--accent-hover);\n      }\n      #plus-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);\n      }\n      #plus-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n    ";
  document.head.appendChild(styleElement);
  const uiContainer = document.createElement("div");
  uiContainer.id = "plus-panel";
  uiContainer.style.position = "fixed";
  uiContainer.style.top = "20px";
  uiContainer.style.right = "20px";
  uiContainer.style.color = "var(--text-primary)";
  uiContainer.style.padding = "16px";
  uiContainer.style.borderRadius = "16px";
  uiContainer.style.fontSize = "14px";
  uiContainer.style.zIndex = "99999";
  uiContainer.style.userSelect = "none";
  uiContainer.style.width = "240px";
  uiContainer.style.textAlign = "center";
  uiContainer.style.cursor = "move";
  uiContainer.style.overflow = "hidden";
  uiContainer.innerHTML =
    '\n      <div style="font-weight:600; margin-bottom:12px; color:var(--accent); height: 40px; line-height: 40px;">\n        ASTRAPHOBIA CLIENT+\n      </div>\n      <div id="plusContent">\n        <button id="thresherBtn">Enable Thresher Super Boost(ctrl + shift and click)(minumum required 2 boost)</button>\n        <button id="astraVisionBtn">Enable Astra-Vision (no-zoom limit, no ink flash or deep darkness)</button>\n        <button id="smallMinimapBtn">Enable Small Minimap</button>\n      </div>\n    ';
  document.body.appendChild(uiContainer);
  const thresherButton = uiContainer.querySelector("#thresherBtn");
  thresherButton.onclick = () => {
    if (coreSharedState.isInitialized_2) {
      showNotification("Thresher Super Boost is already active!");
      return;
    }
    initHooks();
    thresherButton.textContent = "Thresher Super Boost Active";
    thresherButton.style.color = "#27ae60";
    thresherButton.disabled = true;
  };
  const astraVisionButton = uiContainer.querySelector("#astraVisionBtn");
  astraVisionButton.onclick = () => {
    if (isActive) {
      showNotification("Astra-Vision already enabled!");
      return;
    }
    initHooks();
    disableGameRestrictions();
    astraVisionButton.textContent = "Astra-Vision Active";
    astraVisionButton.style.color = "#27ae60";
    astraVisionButton.disabled = true;
    showNotification(
      "👁️ Astra-Vision enabled! (zoom-limit unlocked, no ink-flash or deep darkness effects)",
    );
  };
  const smallMinimapButton = uiContainer.querySelector("#smallMinimapBtn");
  smallMinimapButton.onclick = () => {
    initHooks();
    toggleMinimapSize();
    if (coreSharedState.isActive_2) {
      smallMinimapButton.textContent = "Disable Small Minimap";
      smallMinimapButton.style.color = "#27ae60";
    } else {
      smallMinimapButton.textContent = "Enable Small Minimap";
      smallMinimapButton.style.color = "var(--accent)";
    }
  };
  let offsetX;
  let offsetY;
  let isDragging = false;
  let isActive = false;
  uiContainer.addEventListener("mousedown", (event) => {
    if (
      event.target.tagName === "BUTTON" ||
      event.target.tagName === "TEXTAREA" ||
      event.target.tagName === "INPUT" ||
      event.target.classList.contains("credits")
    ) {
      return;
    }
    isDragging = true;
    isActive = false;
    offsetX = event.clientX - uiContainer.getBoundingClientRect().left;
    offsetY = event.clientY - uiContainer.getBoundingClientRect().top;
    uiContainer.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - event.clientX;
      const deltaY = mouseEvent.clientY - event.clientY;
      if (!isActive && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isActive = true;
      }
      if (isDragging) {
        uiContainer.style.left = mouseEvent.clientX - offsetX + "px";
        uiContainer.style.top = mouseEvent.clientY - offsetY + "px";
        uiContainer.style.bottom = "auto";
        uiContainer.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      isDragging = false;
      uiContainer.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
  uiContainer.addEventListener("click", (event_2) => {
    if (isActive) {
      event_2.stopImmediatePropagation();
    }
  });
  return uiContainer;
}
function injectSettingsStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent =
    "\n      #settings-panel {\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: var(--shadow);\n        border: 1px solid var(--border);\n        background: var(--bg-primary);\n        backdrop-filter: blur(20px);\n        border-radius: 16px;\n        position: fixed;\n        top: 20px;\n        left: 20px;\n        color: var(--text-primary);\n        padding: 16px;\n        font-size: 14px;\n        z-index: 99999;\n        user-select: none;\n        width: 240px;\n        text-align: center;\n        cursor: move;\n        overflow: hidden;\n      }\n      #settings-panel:hover {\n        box-shadow: var(--shadow-hover);\n        transform: translateY(-2px);\n      }\n      #settings-panel button {\n        background: var(--bg-secondary);\n        color: var(--accent);\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        padding: 10px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        width: 100%;\n        margin-bottom: 10px;\n        position: relative;\n        overflow: hidden;\n      }\n      #settings-panel button::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: -100%;\n        width: 100%;\n        height: 100%;\n        background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.2), transparent);\n        transition: left 0.5s;\n      }\n      #settings-panel button:hover:not(:disabled)::before {\n        left: 100%;\n      }\n      #settings-panel button:hover:not(:disabled) {\n        background: rgba(45, 45, 75, 1);\n        border-color: var(--accent);\n        transform: translateY(-1px);\n        box-shadow: 0 4px 12px rgba(0, 212, 255, 0.2);\n        color: var(--accent-hover);\n      }\n      #settings-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);\n      }\n      #settings-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #settings-panel .keybind-set, #settings-panel .bg-set {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        margin-bottom: 10px;\n        font-size: 12px;\n      }\n      #settings-panel .keybind-set label, #settings-panel .bg-set label {\n        color: var(--text-primary);\n      }\n      #settings-panel #toggleKeyInput, #settings-panel #bgUrl {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        text-align: center;\n        transition: all 0.2s ease;\n      }\n      #settings-panel #toggleKeyInput {\n        width: 80px;\n      }\n      #settings-panel #bgUrl {\n        width: 120px;\n      }\n      #settings-panel .section-header {\n        font-weight: bold;\n        color: var(--accent);\n        margin: 12px 0 6px 0;\n        font-size: 13px;\n      }\n    ";
  document.head.appendChild(styleElement);
  const mainContainer = document.createElement("div");
  mainContainer.id = "settings-panel";
  mainContainer.innerHTML =
    '\n      <div style="font-weight:600; margin-bottom:12px; color:var(--accent); height: 40px; line-height: 40px;">\n        SETTINGS\n      </div>\n      <div id="settingsContent">\n        <div class="keybind-set">\n          <label for="toggleKeyInput">Toggle Client:</label>\n          <input type="text" id="toggleKeyInput" placeholder="PRESS" readonly>\n        </div>\n        <div class="section-header">Custom Background</div>\n        <div class="bg-set">\n          <label for="bgUrl">BG URL:</label>\n          <input type="text" id="bgUrl" placeholder="Image/GIF URL">\n        </div>\n        <button id="applyBg">Apply Custom Background</button>\n      </div>\n    ';
  document.body.appendChild(mainContainer);
  const bgUrlInput = mainContainer.querySelector("#bgUrl");
  bgUrlInput.value = localStorage.getItem("bgUrl") || "";
  const applyBgButton = mainContainer.querySelector("#applyBg");
  applyBgButton.onclick = () => {
    const backgroundUrl = bgUrlInput.value.trim();
    if (backgroundUrl === "") {
      showNotification("Enter a URL first!");
      return;
    }
    localStorage.setItem("bgUrl", backgroundUrl);
    let homeBgElement = document.querySelector(".home-bg");
    const updateBackgroundImage = () => {
      homeBgElement.style.setProperty(
        "background-image",
        'url("' + backgroundUrl + '")',
        "important",
      );
    };
    if (homeBgElement == null) {
      const bgCheckInterval = setInterval(() => {
        homeBgElement = document.querySelector(".home-bg");
        if (homeBgElement != null) {
          clearInterval(bgCheckInterval);
        }
        updateBackgroundImage();
      }, 100);
    } else {
      updateBackgroundImage();
    }
    showNotification("Custom Background applied!");
  };
  const toggleKeyInputButton = mainContainer.querySelector("#toggleKeyInput");
  toggleKeyInputButton.value = coreSharedState.currentKey;
  toggleKeyInputButton.addEventListener("keydown", (event) => {
    event.preventDefault();
    coreSharedState.currentKey = event.key;
    toggleKeyInputButton.value = coreSharedState.currentKey;
  });
  let offsetX;
  let offsetY;
  let isDragging = false;
  let isToggled = false;
  mainContainer.addEventListener("mousedown", (event_2) => {
    if (
      event_2.target.tagName === "BUTTON" ||
      event_2.target.tagName === "INPUT" ||
      event_2.target.classList.contains("credits")
    ) {
      return;
    }
    isDragging = true;
    isToggled = false;
    offsetX = event_2.clientX - mainContainer.getBoundingClientRect().left;
    offsetY = event_2.clientY - mainContainer.getBoundingClientRect().top;
    mainContainer.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - event_2.clientX;
      const deltaY = mouseEvent.clientY - event_2.clientY;
      if (!isToggled && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isToggled = true;
      }
      if (isDragging) {
        mainContainer.style.left = mouseEvent.clientX - offsetX + "px";
        mainContainer.style.top = mouseEvent.clientY - offsetY + "px";
        mainContainer.style.bottom = "auto";
        mainContainer.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      isDragging = false;
      mainContainer.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
  mainContainer.addEventListener("click", (event_3) => {
    if (isToggled) {
      event_3.stopImmediatePropagation();
    }
  });
  return mainContainer;
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
  initControlOverlay,
  createUpdateHistoryPanel,
  createDeepToolsPanel,
  injectPlusPanelStyles,
  injectSettingsStyles,
  togglePanels,
};
