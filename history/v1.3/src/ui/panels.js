import {
  gameInstance,
  playerData,
  Config,
  radius,
  hookTextEncoder,
  boolIsProcessed,
  initHooks,
  disableGameRestrictions,
  state,
} from "../core.js";
import {
  startScheduledTask,
  stopInterval,
  autoChat,
} from "../features/chat.js";
import { featuresentitytrailState } from "../features/entitytrail.js";
import { simulateTyping, showNotification } from "./interaction.js";
import { toggleMouseSimulation } from "../features/movement.js";
import { handleAnimalAction } from "../features/autofarm.js";
import { toggleMinimapSize } from "../features/esp.js";
import { generateRandomString } from "../utils.js";

let appIsProcessed = false;
const initControlOverlay = () => {
  if (appIsProcessed) {
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
        if (!playerData?.myAnimals?.[0]) {
          return;
        }
        const visibleFishLevel = playerData.myAnimals[0].visibleFishLevel;
        const fishSettings = {
          ...Config.default,
          ...Config[visibleFishLevel],
        };
        if (myAnimalsHandler.ctrlKey) {
          if (myAnimalsHandler.shiftKey && visibleFishLevel === 107) {
            sendActionSequence();
            return;
          } else if (
            myAnimalsHandler.shiftKey &&
            visibleFishLevel !== 101 &&
            playerData.myAnimals[0]._standing
          ) {
            handleAnimalAction(
              Math.floor(Math.random() * 1647483648) + 500000000,
            );
            return;
          } else {
            let keyMap = Object.getOwnPropertyNames(gameInstance)
              .map((clientKey) => gameInstance[clientKey])
              .find((inputMap) => inputMap.keys instanceof Array);
            if (keyMap) {
              keyMap.pointerDown = true;
              keyMap.pressElapsed = Infinity;
              keyMap.setPointerDown(false);
            }
          }
        } else if (myAnimalsHandler.altKey) {
          handleAnimalAction(
            playerData?.myAnimals?.[0]?._standing
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
  appIsProcessed = true;
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
  let isHidden = false;
  minHistElement.onclick = (toggleEvent) => {
    toggleEvent.stopPropagation();
    isHidden = !isHidden;
    historyContentElement.style.display = isHidden ? "none" : "block";
    historyPanel.style.height = isHidden ? "60px" : "auto";
    minHistElement.textContent = isHidden ? "+" : "−";
  };
  let offsetX;
  let offsetY;
  let v7b3eIsActive = false;
  let v7b3eV7b3eIsActive = false;
  historyPanel.addEventListener("mousedown", (clickEvent) => {
    if (
      ["BUTTON", "INPUT", "TEXTAREA", "A"].includes(clickEvent.target.tagName)
    ) {
      return;
    }
    v7b3eIsActive = true;
    v7b3eV7b3eIsActive = false;
    offsetX = clickEvent.clientX - historyPanel.getBoundingClientRect().left;
    offsetY = clickEvent.clientY - historyPanel.getBoundingClientRect().top;
    historyPanel.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - clickEvent.clientX;
      const deltaY = mouseEvent.clientY - clickEvent.clientY;
      if (
        !v7b3eV7b3eIsActive &&
        (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)
      ) {
        v7b3eV7b3eIsActive = true;
      }
      if (v7b3eIsActive) {
        historyPanel.style.left = mouseEvent.clientX - offsetX + "px";
        historyPanel.style.top = mouseEvent.clientY - offsetY + "px";
        historyPanel.style.bottom = "auto";
        historyPanel.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      v7b3eIsActive = false;
      historyPanel.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
  historyPanel.addEventListener("click", (interceptEvent) => {
    if (v7b3eV7b3eIsActive) {
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
  const v239eSpoofButton = container.querySelector("#patchBtn");
  v239eSpoofButton.onclick = () => hookTextEncoder(v239eSpoofButton);
  const v239eV239eSpoofButton = container.querySelector("#spoofBtn");
  v239eV239eSpoofButton.onclick = () => {
    const maxLength = generateRandomString(8);
    if (simulateTyping(".play-game .el-input__inner", maxLength)) {
      showNotification("Spoofed name!");
    } else if (simulateTyping(".new-tribe .el-input__inner", maxLength)) {
      showNotification("Spoofed tribe name!");
    } else {
      showNotification("No name input found! Enable special characters first.");
    }
  };
  const v3b40AutoChatButton = container.querySelector("#spinBtn");
  v3b40AutoChatButton.onclick = () => {
    toggleMouseSimulation();
    if (featuresentitytrailState.modEntityTrailInterval) {
      v3b40AutoChatButton.textContent = "Disable Auto Spin";
      v3b40AutoChatButton.style.color = "#27ae60";
    } else {
      v3b40AutoChatButton.textContent = "Enable Auto Spin";
      v3b40AutoChatButton.style.color = "var(--accent)";
    }
  };
  const spinKeyInput = container.querySelector("#spinKeyInput");
  let lastPressedKey = null;
  spinKeyInput.addEventListener("keydown", (v20e9Event) => {
    v20e9Event.preventDefault();
    lastPressedKey = v20e9Event.code || v20e9Event.key;
    spinKeyInput.value = lastPressedKey.replace("Key", "").toLowerCase();
  });
  document.addEventListener("keydown", (keyEvent) => {
    if (
      lastPressedKey &&
      keyEvent.code === lastPressedKey &&
      !keyEvent.target.matches("input, textarea, button")
    ) {
      keyEvent.preventDefault();
      toggleMouseSimulation();
      if (featuresentitytrailState.modEntityTrailInterval) {
        v3b40AutoChatButton.textContent = "Disable Auto Spin";
        v3b40AutoChatButton.style.color = "#27ae60";
      } else {
        v3b40AutoChatButton.textContent = "Enable Auto Spin";
        v3b40AutoChatButton.style.color = "var(--accent)";
      }
    }
  });
  const v3b40V3b40AutoChatButton = container.querySelector("#autoChatBtn");
  v3b40V3b40AutoChatButton.onclick = () => {
    const chatMessageValue = container.querySelector("#chatMsg").value;
    const delayInput = container.querySelector("#delayInput");
    const delayValue = parseInt(delayInput.value) || 10;
    if (!chatMessageValue) {
      showNotification("⚠️ Enter a message first!");
      return;
    }
    if (state.IsToggled) {
      stopInterval();
      v3b40V3b40AutoChatButton.textContent = "Enable Auto Chat";
      v3b40V3b40AutoChatButton.style.color = "var(--accent)";
    } else {
      startScheduledTask(chatMessageValue, delayValue);
      v3b40V3b40AutoChatButton.textContent = "Disable Auto Chat";
      v3b40V3b40AutoChatButton.style.color = "#27ae60";
    }
  };
  let v3ad6OffsetX;
  let v1f8aOffsetY;
  let v5dbcIsActive = false;
  let v5dbcV5dbcIsActive = false;
  container.addEventListener("mousedown", (v1dcbClickEvent) => {
    if (
      v1dcbClickEvent.target.tagName === "BUTTON" ||
      v1dcbClickEvent.target.tagName === "TEXTAREA" ||
      v1dcbClickEvent.target.tagName === "INPUT" ||
      v1dcbClickEvent.target.classList.contains("credits")
    ) {
      return;
    }
    v5dbcIsActive = true;
    v5dbcV5dbcIsActive = false;
    v3ad6OffsetX =
      v1dcbClickEvent.clientX - container.getBoundingClientRect().left;
    v1f8aOffsetY =
      v1dcbClickEvent.clientY - container.getBoundingClientRect().top;
    container.style.transition = "none";
    const v1d4fHandleMouseMove = (v44a7MouseEvent) => {
      const v58d0DeltaX = v44a7MouseEvent.clientX - v1dcbClickEvent.clientX;
      const v4af6DeltaY = v44a7MouseEvent.clientY - v1dcbClickEvent.clientY;
      if (
        !v5dbcV5dbcIsActive &&
        (Math.abs(v58d0DeltaX) > 5 || Math.abs(v4af6DeltaY) > 5)
      ) {
        v5dbcV5dbcIsActive = true;
      }
      if (v5dbcIsActive) {
        container.style.left = v44a7MouseEvent.clientX - v3ad6OffsetX + "px";
        container.style.top = v44a7MouseEvent.clientY - v1f8aOffsetY + "px";
        container.style.bottom = "auto";
        container.style.right = "auto";
      }
    };
    const v1606HandleMouseUp = () => {
      v5dbcIsActive = false;
      container.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", v1d4fHandleMouseMove);
      document.removeEventListener("mouseup", v1606HandleMouseUp);
    };
    document.addEventListener("mousemove", v1d4fHandleMouseMove);
    document.addEventListener("mouseup", v1606HandleMouseUp);
  });
  container.addEventListener("click", (eventToStop) => {
    if (v5dbcV5dbcIsActive) {
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
  const Container = document.createElement("div");
  Container.id = "plus-panel";
  Container.style.position = "fixed";
  Container.style.top = "20px";
  Container.style.right = "20px";
  Container.style.color = "var(--text-primary)";
  Container.style.padding = "16px";
  Container.style.borderRadius = "16px";
  Container.style.fontSize = "14px";
  Container.style.zIndex = "99999";
  Container.style.userSelect = "none";
  Container.style.width = "240px";
  Container.style.textAlign = "center";
  Container.style.cursor = "move";
  Container.style.overflow = "hidden";
  Container.innerHTML =
    '\n      <div style="font-weight:600; margin-bottom:12px; color:var(--accent); height: 40px; line-height: 40px;">\n        ASTRAPHOBIA CLIENT+\n      </div>\n      <div id="plusContent">\n        <button id="thresherBtn">Enable Thresher Super Boost(ctrl + shift and click)(minumum required 2 boost)</button>\n        <button id="astraVisionBtn">Enable Astra-Vision (no-zoom limit, no ink flash or deep darkness)</button>\n        <button id="smallMinimapBtn">Enable Small Minimap</button>\n      </div>\n    ';
  document.body.appendChild(Container);
  const v44a0AstraVisionButton = Container.querySelector("#thresherBtn");
  v44a0AstraVisionButton.onclick = () => {
    if (appIsProcessed) {
      showNotification("Thresher Super Boost is already active!");
      return;
    }
    initHooks();
    v44a0AstraVisionButton.textContent = "Thresher Super Boost Active";
    v44a0AstraVisionButton.style.color = "#27ae60";
    v44a0AstraVisionButton.disabled = true;
  };
  const v44a0V44a0AstraVisionButton =
    Container.querySelector("#astraVisionBtn");
  v44a0V44a0AstraVisionButton.onclick = () => {
    if (boolIsProcessed) {
      showNotification("Astra-Vision already enabled!");
      return;
    }
    initHooks();
    disableGameRestrictions();
    v44a0V44a0AstraVisionButton.textContent = "Astra-Vision Active";
    v44a0V44a0AstraVisionButton.style.color = "#27ae60";
    v44a0V44a0AstraVisionButton.disabled = true;
    showNotification(
      "👁️ Astra-Vision enabled! (zoom-limit unlocked, no ink-flash or deep darkness effects)",
    );
  };
  const smallMinimapButton = Container.querySelector("#smallMinimapBtn");
  smallMinimapButton.onclick = () => {
    initHooks();
    toggleMinimapSize();
    if (state.boolIsToggled) {
      smallMinimapButton.textContent = "Disable Small Minimap";
      smallMinimapButton.style.color = "#27ae60";
    } else {
      smallMinimapButton.textContent = "Enable Small Minimap";
      smallMinimapButton.style.color = "var(--accent)";
    }
  };
  let v3a60OffsetX;
  let v4035OffsetY;
  let v5154IsActive = false;
  let v5154V5154IsActive = false;
  Container.addEventListener("mousedown", (v57f7Event) => {
    if (
      v57f7Event.target.tagName === "BUTTON" ||
      v57f7Event.target.tagName === "TEXTAREA" ||
      v57f7Event.target.tagName === "INPUT" ||
      v57f7Event.target.classList.contains("credits")
    ) {
      return;
    }
    v5154IsActive = true;
    v5154V5154IsActive = false;
    v3a60OffsetX = v57f7Event.clientX - Container.getBoundingClientRect().left;
    v4035OffsetY = v57f7Event.clientY - Container.getBoundingClientRect().top;
    Container.style.transition = "none";
    const v3f1bHandleMouseMove = (v3ce0MouseEvent) => {
      const v1f2dDeltaX = v3ce0MouseEvent.clientX - v57f7Event.clientX;
      const v10dcDeltaY = v3ce0MouseEvent.clientY - v57f7Event.clientY;
      if (
        !v5154V5154IsActive &&
        (Math.abs(v1f2dDeltaX) > 5 || Math.abs(v10dcDeltaY) > 5)
      ) {
        v5154V5154IsActive = true;
      }
      if (v5154IsActive) {
        Container.style.left = v3ce0MouseEvent.clientX - v3a60OffsetX + "px";
        Container.style.top = v3ce0MouseEvent.clientY - v4035OffsetY + "px";
        Container.style.bottom = "auto";
        Container.style.right = "auto";
      }
    };
    const v1d35HandleMouseUp = () => {
      v5154IsActive = false;
      Container.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", v3f1bHandleMouseMove);
      document.removeEventListener("mouseup", v1d35HandleMouseUp);
    };
    document.addEventListener("mousemove", v3f1bHandleMouseMove);
    document.addEventListener("mouseup", v1d35HandleMouseUp);
  });
  Container.addEventListener("click", (v2109Event) => {
    if (v5154V5154IsActive) {
      v2109Event.stopImmediatePropagation();
    }
  });
  return Container;
}
function injectSettingsStyles() {
  const v6e7dStyleElement = document.createElement("style");
  v6e7dStyleElement.textContent =
    "\n      #settings-panel {\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: var(--shadow);\n        border: 1px solid var(--border);\n        background: var(--bg-primary);\n        backdrop-filter: blur(20px);\n        border-radius: 16px;\n        position: fixed;\n        top: 20px;\n        left: 20px;\n        color: var(--text-primary);\n        padding: 16px;\n        font-size: 14px;\n        z-index: 99999;\n        user-select: none;\n        width: 240px;\n        text-align: center;\n        cursor: move;\n        overflow: hidden;\n      }\n      #settings-panel:hover {\n        box-shadow: var(--shadow-hover);\n        transform: translateY(-2px);\n      }\n      #settings-panel button {\n        background: var(--bg-secondary);\n        color: var(--accent);\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        padding: 10px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        width: 100%;\n        margin-bottom: 10px;\n        position: relative;\n        overflow: hidden;\n      }\n      #settings-panel button::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: -100%;\n        width: 100%;\n        height: 100%;\n        background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.2), transparent);\n        transition: left 0.5s;\n      }\n      #settings-panel button:hover:not(:disabled)::before {\n        left: 100%;\n      }\n      #settings-panel button:hover:not(:disabled) {\n        background: rgba(45, 45, 75, 1);\n        border-color: var(--accent);\n        transform: translateY(-1px);\n        box-shadow: 0 4px 12px rgba(0, 212, 255, 0.2);\n        color: var(--accent-hover);\n      }\n      #settings-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);\n      }\n      #settings-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #settings-panel .keybind-set, #settings-panel .bg-set {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        margin-bottom: 10px;\n        font-size: 12px;\n      }\n      #settings-panel .keybind-set label, #settings-panel .bg-set label {\n        color: var(--text-primary);\n      }\n      #settings-panel #toggleKeyInput, #settings-panel #bgUrl {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        text-align: center;\n        transition: all 0.2s ease;\n      }\n      #settings-panel #toggleKeyInput {\n        width: 80px;\n      }\n      #settings-panel #bgUrl {\n        width: 120px;\n      }\n      #settings-panel .section-header {\n        font-weight: bold;\n        color: var(--accent);\n        margin: 12px 0 6px 0;\n        font-size: 13px;\n      }\n    ";
  document.head.appendChild(v6e7dStyleElement);
  const e13cContainer = document.createElement("div");
  e13cContainer.id = "settings-panel";
  e13cContainer.innerHTML =
    '\n      <div style="font-weight:600; margin-bottom:12px; color:var(--accent); height: 40px; line-height: 40px;">\n        SETTINGS\n      </div>\n      <div id="settingsContent">\n        <div class="keybind-set">\n          <label for="toggleKeyInput">Toggle Client:</label>\n          <input type="text" id="toggleKeyInput" placeholder="PRESS" readonly>\n        </div>\n        <div class="section-header">Custom Background</div>\n        <div class="bg-set">\n          <label for="bgUrl">BG URL:</label>\n          <input type="text" id="bgUrl" placeholder="Image/GIF URL">\n        </div>\n        <button id="applyBg">Apply Custom Background</button>\n      </div>\n    ';
  document.body.appendChild(e13cContainer);
  const bgUrlInput = e13cContainer.querySelector("#bgUrl");
  bgUrlInput.value = localStorage.getItem("bgUrl") || "";
  const applyBgButton = e13cContainer.querySelector("#applyBg");
  applyBgButton.onclick = () => {
    const bgUrl = bgUrlInput.value.trim();
    if (bgUrl === "") {
      showNotification("Enter a URL first!");
      return;
    }
    localStorage.setItem("bgUrl", bgUrl);
    let v3242HomeBgElement = document.querySelector(".home-bg");
    const updateBackgroundImage = () => {
      v3242HomeBgElement.style.setProperty(
        "background-image",
        'url("' + bgUrl + '")',
        "important",
      );
    };
    if (v3242HomeBgElement == null) {
      const pollInterval = setInterval(() => {
        v3242HomeBgElement = document.querySelector(".home-bg");
        if (v3242HomeBgElement != null) {
          clearInterval(pollInterval);
        }
        updateBackgroundImage();
      }, 100);
    } else {
      updateBackgroundImage();
    }
    showNotification("Custom Background applied!");
  };
  const toggleKeyInputButton = e13cContainer.querySelector("#toggleKeyInput");
  toggleKeyInputButton.value = state.activeKey;
  toggleKeyInputButton.addEventListener("keydown", (v3589Event) => {
    v3589Event.preventDefault();
    state.activeKey = v3589Event.key;
    toggleKeyInputButton.value = state.activeKey;
  });
  let v35bcOffsetX;
  let v9b1bOffsetY;
  let v4bb6IsActive = false;
  let v4bb6V4bb6IsActive = false;
  e13cContainer.addEventListener("mousedown", (v36c8Event) => {
    if (
      v36c8Event.target.tagName === "BUTTON" ||
      v36c8Event.target.tagName === "INPUT" ||
      v36c8Event.target.classList.contains("credits")
    ) {
      return;
    }
    v4bb6IsActive = true;
    v4bb6V4bb6IsActive = false;
    v35bcOffsetX =
      v36c8Event.clientX - e13cContainer.getBoundingClientRect().left;
    v9b1bOffsetY =
      v36c8Event.clientY - e13cContainer.getBoundingClientRect().top;
    e13cContainer.style.transition = "none";
    const v3bd4HandleMouseMove = (v11e6MouseEvent) => {
      const v2573DeltaX = v11e6MouseEvent.clientX - v36c8Event.clientX;
      const v7802DeltaY = v11e6MouseEvent.clientY - v36c8Event.clientY;
      if (
        !v4bb6V4bb6IsActive &&
        (Math.abs(v2573DeltaX) > 5 || Math.abs(v7802DeltaY) > 5)
      ) {
        v4bb6V4bb6IsActive = true;
      }
      if (v4bb6IsActive) {
        e13cContainer.style.left =
          v11e6MouseEvent.clientX - v35bcOffsetX + "px";
        e13cContainer.style.top = v11e6MouseEvent.clientY - v9b1bOffsetY + "px";
        e13cContainer.style.bottom = "auto";
        e13cContainer.style.right = "auto";
      }
    };
    const v3872HandleMouseUp = () => {
      v4bb6IsActive = false;
      e13cContainer.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", v3bd4HandleMouseMove);
      document.removeEventListener("mouseup", v3872HandleMouseUp);
    };
    document.addEventListener("mousemove", v3bd4HandleMouseMove);
    document.addEventListener("mouseup", v3872HandleMouseUp);
  });
  e13cContainer.addEventListener("click", (v5564Event) => {
    if (v4bb6V4bb6IsActive) {
      v5564Event.stopImmediatePropagation();
    }
  });
  return e13cContainer;
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
