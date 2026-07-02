import {
  radius,
  gameInstance,
  playerData,
  objConfig,
  initInterceptor,
  boolIsProcessed,
  initializeAntiTamper,
  disableGameRestrictions,
  state,
} from "../core.js";
import {
  startScheduledTask,
  stopInterval,
  autoChat,
} from "../features/chat.js";
import { featuresentitytrailState } from "../features/entitytrail.js";
import { showNotification, simulateTyping } from "./interaction.js";
import { toggleMouseSimulation } from "../features/movement.js";
import { handleAnimalAction } from "../features/autofarm.js";
import { generateRandomString } from "../utils.js";
import { toggleMinimapScale } from "./radar.js";
import { applyThemeColors } from "./theme.js";

let modIsProcessed = false;
function createHalloweenModal(modalConfig) {
  const modalContainer = document.createElement("div");
  modalContainer.id = "halloween-code-modal";
  modalContainer.style.cssText =
    "\n      position: fixed;\n      top: 0; left: 0;\n      width: 100%; height: 100%;\n      background: linear-gradient(135deg, rgba(13, 0, 13, 0.98), rgba(43, 20, 43, 0.98));\n      z-index: 100001;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      opacity: 0;\n      transition: opacity 0.5s ease;\n    ";
  const styleElement = document.createElement("style");
  styleElement.textContent =
    "\n      @keyframes glow-pulse {\n        0%, 100% { text-shadow: 0 0 10px #ff6600, 0 0 20px #ff6600; }\n        50% { text-shadow: 0 0 20px #ff6600, 0 0 40px #ff6600, 0 0 60px #ff6600; }\n      }\n      .halloween-title {\n        animation: glow-pulse 2s ease-in-out infinite;\n      }\n      .halloween-input {\n        background: rgba(43, 20, 43, 0.8);\n        border: 2px solid #ff6600;\n        color: #ffffff;\n        border-radius: 10px;\n        padding: 15px;\n        font-size: 16px;\n        text-align: center;\n        width: 100%;\n        margin: 20px 0;\n        transition: all 0.3s ease;\n      }\n      .halloween-input:focus {\n        outline: none;\n        border-color: #8b00ff;\n        box-shadow: 0 0 20px rgba(255, 102, 0, 0.5), 0 0 40px rgba(139, 0, 255, 0.3);\n      }\n      .halloween-btn {\n        background: linear-gradient(135deg, #ff6600, #ff9933);\n        color: #ffffff;\n        border: none;\n        border-radius: 10px;\n        padding: 15px 30px;\n        font-size: 16px;\n        font-weight: bold;\n        cursor: pointer;\n        transition: all 0.3s ease;\n        margin: 5px;\n        text-transform: uppercase;\n        letter-spacing: 1px;\n      }\n      .halloween-btn:hover {\n        transform: translateY(-3px);\n        box-shadow: 0 8px 20px rgba(255, 102, 0, 0.6);\n        background: linear-gradient(135deg, #ff9933, #ff6600);\n      }\n      .halloween-close {\n        position: absolute;\n        top: 20px;\n        right: 30px;\n        font-size: 40px;\n        color: #ff6600;\n        cursor: pointer;\n        transition: all 0.3s ease;\n        z-index: 10;\n      }\n      .halloween-close:hover {\n        color: #8b00ff;\n        transform: rotate(90deg) scale(1.2);\n      }\n      @keyframes shake {\n        0%, 100% { transform: translateX(0); }\n        25% { transform: translateX(-10px); }\n        75% { transform: translateX(10px); }\n      }\n    ";
  document.head.appendChild(styleElement);
  modalContainer.innerHTML =
    '\n      <span class="halloween-close">&times;</span>\n      <div style="background: rgba(0,0,0,0.7); padding: 40px; border-radius: 20px; text-align: center; max-width: 500px; border: 3px solid #ff6600; box-shadow: 0 0 50px rgba(255, 102, 0, 0.5);">\n        <h2 class="halloween-title" style="color: #ff6600; margin: 0 0 10px 0; font-size: 32px;">HALLOWEEN ACCESS CODE</h2>\n        <p style="color: #ffcc99; margin: 10px 0 20px 0; font-size: 14px;">Enter the secret code given from Astraphobia to unlock the spooky Halloween theme!</p>\n        <input class="halloween-input" id="halloweenCodeInput" type="text" placeholder="Enter code here...">\n        <div style="margin-top: 20px;">\n          <button class="halloween-btn" id="submitHalloweenCode">Redeem Code</button>\n        </div>\n      </div>\n    ';
  document.body.appendChild(modalContainer);
  setTimeout(() => {
    modalContainer.style.opacity = "1";
  }, 10);
  const halloweenCodeInput = modalContainer.querySelector(
    "#halloweenCodeInput",
  );
  const submitHalloweenCodeButton = modalContainer.querySelector(
    "#submitHalloweenCode",
  );
  const halloweenCloseButton = modalContainer.querySelector(".halloween-close");
  const removeHalloweenModal = () => {
    modalContainer.style.opacity = "0";
    setTimeout(() => {
      modalContainer.remove();
      styleElement.remove();
    }, 500);
  };
  submitHalloweenCodeButton.onclick = () => {
    const inputCode = halloweenCodeInput.value.trim();
    if (inputCode === "HappyHalloween9" || inputCode === "TrickOrTreat9") {
      localStorage.setItem("halloweenUnlocked", "true");
      showNotification("🎃 Halloween theme unlocked! Congrats!");
      removeHalloweenModal();
      modalConfig(true);
    } else {
      halloweenCodeInput.style.animation = "shake 0.3s";
      halloweenCodeInput.style.borderColor = "#ff0000";
      setTimeout(() => {
        halloweenCodeInput.style.animation = "";
        halloweenCodeInput.style.borderColor = "#ff6600";
      }, 300);
      showNotification("❌ Invalid code! Try again...");
    }
  };
  halloweenCloseButton.onclick = () => {
    showNotification("❌ Halloween theme cancelled. Returning to Blue theme.");
    removeHalloweenModal();
    modalConfig(false);
  };
  halloweenCodeInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      submitHalloweenCodeButton.click();
    }
  });
  halloweenCodeInput.focus();
}
const initControlOverlay = () => {
  if (modIsProcessed) {
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
      .addEventListener("contextmenu", (v4fb5Event) =>
        v4fb5Event.preventDefault(),
      );
  }
  createControlOverlay();
  window.addEventListener(
    "click",
    (processAnimals) => {
      try {
        if (!playerData?.myAnimals?.[0]) {
          return;
        }
        const visibleFishLevel = playerData.myAnimals[0].visibleFishLevel;
        const mergedFishConfig = {
          ...objConfig.default,
          ...objConfig[visibleFishLevel],
        };
        if (processAnimals.ctrlKey) {
          if (processAnimals.shiftKey && visibleFishLevel === 107) {
            sendActionSequence();
            return;
          } else if (
            processAnimals.shiftKey &&
            visibleFishLevel !== 101 &&
            playerData.myAnimals[0]._standing
          ) {
            handleAnimalAction(
              Math.floor(Math.random() * 1647483648) + 500000000,
            );
            return;
          } else {
            let propertyMap = Object.getOwnPropertyNames(gameInstance)
              .map((serviceKey) => gameInstance[serviceKey])
              .find((keyMap) => keyMap.keys instanceof Array);
            if (propertyMap) {
              propertyMap.pointerDown = true;
              propertyMap.pressElapsed = Infinity;
              propertyMap.setPointerDown(false);
            }
          }
        } else if (processAnimals.altKey) {
          handleAnimalAction(
            playerData?.myAnimals?.[0]?._standing
              ? 41
              : Math.floor(mergedFishConfig.secLoadTime / 2),
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
  modIsProcessed = true;
};
function createUpdateHistoryStyles() {
  const v4226StyleElement = document.createElement("style");
  v4226StyleElement.textContent =
    "\n      #update-history {\n        position: fixed;\n        bottom: 20px;\n        left: 20px;\n        background: var(--bg-primary);\n        color: var(--text-primary);\n        padding: 16px;\n        border-radius: 16px;\n        font-size: 13px;\n        z-index: 9999;\n        max-width: 240px;\n        max-height: 280px;\n        overflow-y: auto;\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        cursor: move;\n        box-shadow: var(--shadow);\n        border: 1px solid var(--border);\n        transition: all 0.3s ease;\n        backdrop-filter: blur(20px);\n      }\n      #update-history:hover {\n        box-shadow: var(--shadow-hover);\n        transform: translateY(-2px);\n      }\n      #update-history ul {\n        margin: 0;\n        padding-left: 18px;\n      }\n      #update-history li {\n        margin-bottom: 6px;\n        line-height: 1.4;\n        color: var(--text-primary);\n      }\n      #update-history h3 {\n        margin: 0 0 12px 0;\n        font-size: 15px;\n        color: var(--accent);\n        position: relative;\n        padding-right: 28px;\n        font-weight: 600;\n      }\n      #update-history button.min-btn {\n        background: none;\n        border: none;\n        color: var(--accent);\n        font-size: 20px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 8px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: all 0.2s ease;\n        width: 24px;\n        height: 24px;\n        line-height: 24px;\n        border-radius: 50%;\n      }\n      #update-history button.min-btn:hover {\n        color: var(--accent-hover);\n        background: rgba(var(--accent-rgb), 0.2);\n      }\n      #update-history.themestarwars::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        z-index: -1;\n        border-radius: 16px;\n        background: radial-gradient(circle at center, rgba(255,255,255,0.1) 1px, transparent 1px);\n        background-size: 20px 20px;\n        animation: twinkle-stars 20s linear infinite;\n      }\n      #update-history.themekfc::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        z-index: -1;\n        border-radius: 16px;\n        background: radial-gradient(circle at 20% 30%, rgba(244,0,0,0.1) 2px, transparent 2px),\n                    radial-gradient(circle at 80% 70%, rgba(255,204,0,0.05) 1px, transparent 1px);\n        background-size: 40px 40px;\n      }\n      #update-history.themehalloween::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        z-index: -1;\n        border-radius: 16px;\n        background: radial-gradient(circle at 30% 20%, rgba(255, 102, 0, 0.1) 1px, transparent 1px),\n                    radial-gradient(circle at 70% 80%, rgba(139, 0, 255, 0.05) 2px, transparent 2px);\n        background-size: 30px 30px;\n        animation: halloween-glow 15s ease-in-out infinite alternate;\n      }\n      #update-history.themehalloween .bat {\n        position: absolute;\n        font-size: 20px;\n        animation: fly-bat 10s linear infinite;\n        pointer-events: none;\n        opacity: 0.7;\n      }\n      #update-history.themehalloween .bat:nth-child(1) { top: 10%; left: -10%; animation-delay: 0s; }\n      #update-history.themehalloween .bat:nth-child(2) { top: 50%; right: -10%; animation-delay: 3s; animation-direction: reverse; }\n      #update-history.themehalloween .bat:nth-child(3) { top: 80%; left: -10%; animation-delay: 6s; }\n      @keyframes fly-bat {\n        0% { transform: translateX(0) rotate(0deg); }\n        100% { transform: translateX(120%) rotate(360deg); }\n      }\n      @keyframes twinkle-stars {\n        0% { background-position: 0 0; }\n        100% { background-position: 20px 20px; }\n      }\n      @keyframes halloween-glow {\n        0% { opacity: 0.8; }\n        100% { opacity: 1; }\n      }\n    ";
  document.head.appendChild(v4226StyleElement);
  const draggableElement = document.createElement("div");
  draggableElement.id = "update-history";
  draggableElement.innerHTML =
    '\n      <h3>Update History <button class="min-btn" id="minHist">−</button></h3>\n      <div id="historyContent">\n        <ul>\n          <li>v1.5 - Added Star Wars theme, Pink theme, KFC theme (More Glow in KFC Theme), new Halloween theme + Mini-Game, new Astraphobia Client Halloween Icon and updated Halloween Astraphobia Client Website.</li>\n          <li>v1.4 - New Themes Selection (NO MORE PLAIN RED UI MORE MODERN COLORS).</li>\n          <li>v1.3 - New Blue Themed UI with new UI animations and Client Logo! No more minimize or maximize for everything but Update History because of toogle client tool. Updated Astraphobia Client Website and Discord! Also, added new small minimap feature.</li>\n          <li>v1.2 - Astra-Vision added - no ink flash or deep darkness effects + no-zoom limit, added new client ui rework, and custom-background feature (images and gif\'s).</li>\n          <li>v1.1 - Added built-in ad blocker, removed boost trail, spoofing for username, keybind selector for auto spin, added settings GUI, added shift keybind to toogle all panels.</li>\n          <li>v1.0 - Initial release with auto chat, auto-spin, special character bypass, and thresher super boost, no-zoom limit is automatically enabled.</li>\n        </ul>\n      </div>\n    ';
  document.body.appendChild(draggableElement);
  const minHistElement = draggableElement.querySelector("#minHist");
  const historyContentElement =
    draggableElement.querySelector("#historyContent");
  let isHidden = false;
  minHistElement.onclick = (v16e7Event) => {
    v16e7Event.stopPropagation();
    isHidden = !isHidden;
    historyContentElement.style.display = isHidden ? "none" : "block";
    draggableElement.style.height = isHidden ? "60px" : "auto";
    minHistElement.textContent = isHidden ? "+" : "−";
  };
  let offsetX;
  let offsetY;
  let isMoving = false;
  let isDragging = false;
  draggableElement.addEventListener("mousedown", (clickEvent) => {
    if (
      ["BUTTON", "INPUT", "TEXTAREA", "A"].includes(clickEvent.target.tagName)
    ) {
      return;
    }
    isMoving = true;
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
  draggableElement.addEventListener("click", (inputEvent) => {
    if (isDragging) {
      inputEvent.stopImmediatePropagation();
    }
  });
  if (localStorage.getItem("theme") === "halloween") {
    for (let cfecI = 0; cfecI < 3; cfecI++) {
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
  const spoofButton = deepToolsPanel.querySelector("#patchBtn");
  spoofButton.onclick = () => initInterceptor(spoofButton);
  const v2413SpoofButton = deepToolsPanel.querySelector("#spoofBtn");
  v2413SpoofButton.onclick = () => {
    const inputLimit = generateRandomString(8);
    if (simulateTyping(".play-game .el-input__inner", inputLimit)) {
      showNotification("Spoofed name!");
    } else if (simulateTyping(".new-tribe .el-input__inner", inputLimit)) {
      showNotification("Spoofed tribe name!");
    } else {
      showNotification("No name input found! Enable special characters first.");
    }
  };
  const autoChatButton = deepToolsPanel.querySelector("#spinBtn");
  autoChatButton.onclick = () => {
    toggleMouseSimulation();
    if (featuresentitytrailState.appEntityTrailInterval) {
      autoChatButton.textContent = "Disable Auto Spin";
      autoChatButton.style.color = "var(--accent)";
      autoChatButton.style.opacity = "0.6";
    } else {
      autoChatButton.textContent = "Enable Auto Spin";
      autoChatButton.style.color = "var(--accent)";
      autoChatButton.style.opacity = "1";
    }
  };
  const spinKeyInput = deepToolsPanel.querySelector("#spinKeyInput");
  let lastPressedKey = null;
  spinKeyInput.addEventListener("keydown", (v1d76Event) => {
    v1d76Event.preventDefault();
    lastPressedKey = v1d76Event.code || v1d76Event.key;
    spinKeyInput.value = lastPressedKey.replace("Key", "").toLowerCase();
  });
  document.addEventListener("keydown", (b92fEvent) => {
    if (
      lastPressedKey &&
      b92fEvent.code === lastPressedKey &&
      !b92fEvent.target.matches("input, textarea, button")
    ) {
      b92fEvent.preventDefault();
      toggleMouseSimulation();
      if (featuresentitytrailState.appEntityTrailInterval) {
        autoChatButton.textContent = "Disable Auto Spin";
        autoChatButton.style.color = "var(--accent)";
        autoChatButton.style.opacity = "0.6";
      } else {
        autoChatButton.textContent = "Enable Auto Spin";
        autoChatButton.style.color = "var(--accent)";
        autoChatButton.style.opacity = "1";
      }
    }
  });
  const v4da6AutoChatButton = deepToolsPanel.querySelector("#autoChatBtn");
  v4da6AutoChatButton.onclick = () => {
    const chatMessageValue = deepToolsPanel.querySelector("#chatMsg").value;
    const delayInput = deepToolsPanel.querySelector("#delayInput");
    const delayValue = parseInt(delayInput.value) || 10;
    if (!chatMessageValue) {
      showNotification("⚠️ Enter a message first!");
      return;
    }
    if (state.IsToggled) {
      stopInterval();
      v4da6AutoChatButton.textContent = "Enable Auto Chat";
      v4da6AutoChatButton.style.color = "var(--accent)";
      v4da6AutoChatButton.style.opacity = "1";
    } else {
      startScheduledTask(chatMessageValue, delayValue);
      v4da6AutoChatButton.textContent = "Disable Auto Chat";
      v4da6AutoChatButton.style.color = "var(--accent)";
      v4da6AutoChatButton.style.opacity = "0.6";
    }
  };
  let deepToolsOffsetX;
  let deepToolsOffsetY;
  let deepToolsDragActive = false;
  let deepToolsIsDragging = false;
  deepToolsPanel.addEventListener("mousedown", (bd3eEvent) => {
    if (
      bd3eEvent.target.tagName === "BUTTON" ||
      bd3eEvent.target.tagName === "TEXTAREA" ||
      bd3eEvent.target.tagName === "INPUT" ||
      bd3eEvent.target.classList.contains("credits")
    ) {
      return;
    }
    deepToolsDragActive = true;
    deepToolsIsDragging = false;
    deepToolsOffsetX =
      bd3eEvent.clientX - deepToolsPanel.getBoundingClientRect().left;
    deepToolsOffsetY =
      bd3eEvent.clientY - deepToolsPanel.getBoundingClientRect().top;
    deepToolsPanel.style.transition = "none";
    const v5a97HandleMouseMove = (v5217MouseEvent) => {
      const v16fbDeltaX = v5217MouseEvent.clientX - bd3eEvent.clientX;
      const v575bDeltaY = v5217MouseEvent.clientY - bd3eEvent.clientY;
      if (
        !deepToolsIsDragging &&
        (Math.abs(v16fbDeltaX) > 5 || Math.abs(v575bDeltaY) > 5)
      ) {
        deepToolsIsDragging = true;
      }
      if (deepToolsDragActive) {
        deepToolsPanel.style.left =
          v5217MouseEvent.clientX - deepToolsOffsetX + "px";
        deepToolsPanel.style.top =
          v5217MouseEvent.clientY - deepToolsOffsetY + "px";
        deepToolsPanel.style.bottom = "auto";
        deepToolsPanel.style.right = "auto";
      }
    };
    const v4224HandleMouseUp = () => {
      deepToolsDragActive = false;
      deepToolsPanel.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", v5a97HandleMouseMove);
      document.removeEventListener("mouseup", v4224HandleMouseUp);
    };
    document.addEventListener("mousemove", v5a97HandleMouseMove);
    document.addEventListener("mouseup", v4224HandleMouseUp);
  });
  deepToolsPanel.addEventListener("click", (v4a4cEvent) => {
    if (deepToolsIsDragging) {
      v4a4cEvent.stopImmediatePropagation();
    }
  });
  if (localStorage.getItem("theme") === "halloween") {
    for (let v21d6I = 0; v21d6I < 3; v21d6I++) {
      const v4543SpanElement = document.createElement("span");
      v4543SpanElement.className = "bat";
      v4543SpanElement.textContent = "🦇";
      deepToolsPanel.appendChild(v4543SpanElement);
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
  const astraVisionButton = plusPanel.querySelector("#thresherBtn");
  astraVisionButton.onclick = () => {
    if (modIsProcessed) {
      showNotification("Thresher Super Boost is already active!");
      return;
    }
    initializeAntiTamper();
    astraVisionButton.textContent = "Thresher Super Boost Active";
    astraVisionButton.style.color = "var(--accent)";
    astraVisionButton.style.opacity = "0.6";
    astraVisionButton.disabled = true;
  };
  const v2414AstraVisionButton = plusPanel.querySelector("#astraVisionBtn");
  v2414AstraVisionButton.onclick = () => {
    if (boolIsProcessed) {
      showNotification("Astra-Vision already enabled!");
      return;
    }
    initializeAntiTamper();
    disableGameRestrictions();
    v2414AstraVisionButton.textContent = "Astra-Vision Active";
    v2414AstraVisionButton.style.color = "var(--accent)";
    v2414AstraVisionButton.style.opacity = "0.6";
    v2414AstraVisionButton.disabled = true;
    showNotification(
      "👁️ Astra-Vision enabled! (zoom-limit unlocked, no ink-flash or deep darkness effects)",
    );
  };
  const smallMinimapButton = plusPanel.querySelector("#smallMinimapBtn");
  smallMinimapButton.onclick = () => {
    initializeAntiTamper();
    toggleMinimapScale();
    if (state.boolIsToggled) {
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
  plusPanel.addEventListener("mousedown", (v6c59Event) => {
    if (
      v6c59Event.target.tagName === "BUTTON" ||
      v6c59Event.target.tagName === "TEXTAREA" ||
      v6c59Event.target.tagName === "INPUT" ||
      v6c59Event.target.classList.contains("credits")
    ) {
      return;
    }
    plusPanelDragActive = true;
    plusPanelIsDragging = false;
    plusPanelOffsetX =
      v6c59Event.clientX - plusPanel.getBoundingClientRect().left;
    plusPanelOffsetY =
      v6c59Event.clientY - plusPanel.getBoundingClientRect().top;
    plusPanel.style.transition = "none";
    const v23ccHandleMouseMove = (v5270MouseEvent) => {
      const v25d9DeltaX = v5270MouseEvent.clientX - v6c59Event.clientX;
      const v3000DeltaY = v5270MouseEvent.clientY - v6c59Event.clientY;
      if (
        !plusPanelIsDragging &&
        (Math.abs(v25d9DeltaX) > 5 || Math.abs(v3000DeltaY) > 5)
      ) {
        plusPanelIsDragging = true;
      }
      if (plusPanelDragActive) {
        plusPanel.style.left =
          v5270MouseEvent.clientX - plusPanelOffsetX + "px";
        plusPanel.style.top = v5270MouseEvent.clientY - plusPanelOffsetY + "px";
        plusPanel.style.bottom = "auto";
        plusPanel.style.right = "auto";
      }
    };
    const v1f41HandleMouseUp = () => {
      plusPanelDragActive = false;
      plusPanel.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", v23ccHandleMouseMove);
      document.removeEventListener("mouseup", v1f41HandleMouseUp);
    };
    document.addEventListener("mousemove", v23ccHandleMouseMove);
    document.addEventListener("mouseup", v1f41HandleMouseUp);
  });
  plusPanel.addEventListener("click", (v18d4Event) => {
    if (plusPanelIsDragging) {
      v18d4Event.stopImmediatePropagation();
    }
  });
  if (localStorage.getItem("theme") === "halloween") {
    for (let v1218I = 0; v1218I < 3; v1218I++) {
      const ecd4SpanElement = document.createElement("span");
      ecd4SpanElement.className = "bat";
      ecd4SpanElement.textContent = "🦇";
      plusPanel.appendChild(ecd4SpanElement);
    }
  }
  return plusPanel;
}
function injectSettingsPanelStyles() {
  const v13abStyleElement = document.createElement("style");
  v13abStyleElement.textContent =
    "\n      #settings-panel {\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: var(--shadow);\n        border: 1px solid var(--border);\n        background: var(--bg-primary);\n        backdrop-filter: blur(20px);\n        border-radius: 16px;\n        position: fixed;\n        top: 20px;\n        left: 20px;\n        color: var(--text-primary);\n        padding: 16px;\n        font-size: 14px;\n        z-index: 99999;\n        user-select: none;\n        width: 240px;\n        text-align: center;\n        cursor: move;\n        overflow: hidden;\n        position: relative;\n      }\n      #settings-panel:hover {\n        box-shadow: var(--shadow-hover);\n        transform: translateY(-2px);\n      }\n      #settings-panel button {\n        background: var(--bg-secondary);\n        color: var(--accent);\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        padding: 10px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        width: 100%;\n        margin-bottom: 10px;\n        position: relative;\n        overflow: hidden;\n      }\n      #settings-panel button::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: -100%;\n        width: 100%;\n        height: 100%;\n        background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.2), transparent);\n        transition: left 0.5s;\n      }\n      #settings-panel button:hover:not(:disabled)::before {\n        left: 100%;\n      }\n      #settings-panel button:hover:not(:disabled) {\n        background: var(--hover-bg);\n        border-color: var(--accent);\n        transform: translateY(-1px);\n        box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.2);\n        color: var(--accent-hover);\n      }\n      #settings-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);\n      }\n      #settings-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #settings-panel .keybind-set, #settings-panel .bg-set {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        margin-bottom: 10px;\n        font-size: 12px;\n      }\n      #settings-panel .keybind-set label, #settings-panel .bg-set label {\n        color: var(--text-primary);\n      }\n      #settings-panel #toggleKeyInput, #settings-panel #bgUrl {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        text-align: center;\n        transition: all 0.2s ease;\n      }\n      #settings-panel #toggleKeyInput {\n        width: 80px;\n      }\n      #settings-panel #bgUrl {\n        width: 120px;\n      }\n      #settings-panel .section-header {\n        font-weight: bold;\n        color: var(--accent);\n        margin: 12px 0 6px 0;\n        font-size: 13px;\n      }\n      #settings-panel select {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        width: 100%;\n        margin-bottom: 10px;\n        transition: all 0.2s ease;\n      }\n      #settings-panel select:focus {\n        outline: none;\n        border-color: var(--accent);\n        box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.2);\n      }\n      #settings-panel .limited-edition {\n        font-size: 11px;\n        color: #ff6600;\n        font-style: italic;\n        margin-top: 4px;\n      }\n      /* Theme-specific panel animations */\n      #settings-panel.themestarwars::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        background: radial-gradient(circle at center, rgba(255,255,255,0.1) 1px, transparent 1px);\n        background-size: 20px 20px;\n        animation: twinkle-stars 20s linear infinite;\n        z-index: -1;\n        border-radius: 16px;\n      }\n      #settings-panel.themekfc::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        z-index: -1;\n        border-radius: 16px;\n        background: radial-gradient(circle at 20% 30%, rgba(244,0,0,0.1) 2px, transparent 2px),\n                    radial-gradient(circle at 80% 70%, rgba(255,204,0,0.05) 1px, transparent 1px);\n        background-size: 40px 40px;\n      }\n      #settings-panel.themehalloween::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: 0;\n        right: 0;\n        bottom: 0;\n        z-index: -1;\n        border-radius: 16px;\n        background: radial-gradient(circle at 30% 20%, rgba(255, 102, 0, 0.1) 1px, transparent 1px),\n                    radial-gradient(circle at 70% 80%, rgba(139, 0, 255, 0.05) 2px, transparent 2px);\n        background-size: 30px 30px;\n        animation: halloween-glow 15s ease-in-out infinite alternate;\n      }\n      #settings-panel.themehalloween .bat {\n        position: absolute;\n        font-size: 20px;\n        animation: fly-bat 10s linear infinite;\n        pointer-events: none;\n        opacity: 0.7;\n      }\n      #settings-panel.themehalloween .bat:nth-child(1) { top: 10%; left: -10%; animation-delay: 0s; }\n      #settings-panel.themehalloween .bat:nth-child(2) { top: 50%; right: -10%; animation-delay: 3s; animation-direction: reverse; }\n      #settings-panel.themehalloween .bat:nth-child(3) { top: 80%; left: -10%; animation-delay: 6s; }\n      @keyframes fly-bat {\n        0% { transform: translateX(0) rotate(0deg); }\n        100% { transform: translateX(120%) rotate(360deg); }\n      }\n      @keyframes twinkle-stars {\n        0% { background-position: 0 0; }\n        100% { background-position: 20px 20px; }\n      }\n      @keyframes halloween-glow {\n        0% { opacity: 0.8; }\n        100% { opacity: 1; }\n      }\n    ";
  document.head.appendChild(v13abStyleElement);
  const v5893DraggableElement = document.createElement("div");
  v5893DraggableElement.id = "settings-panel";
  v5893DraggableElement.innerHTML =
    '\n      <div style="font-weight:600; margin-bottom:12px; color:var(--accent); height: 40px; line-height: 40px;">\n        SETTINGS\n      </div>\n      <div id="settingsContent">\n        <div class="keybind-set">\n          <label for="toggleKeyInput">Toggle Client:</label>\n          <input type="text" id="toggleKeyInput" placeholder="PRESS" readonly>\n        </div>\n        <div class="section-header">Custom Background</div>\n        <div class="bg-set">\n          <label for="bgUrl">BG URL:</label>\n          <input type="text" id="bgUrl" placeholder="Image/GIF URL">\n        </div>\n        <button id="applyBg">Apply Custom Background</button>\n        <div class="section-header">Themes</div>\n        <select id="themeSelect">\n          <option value="blue">Blue (Default)</option>\n          <option value="red">Red</option>\n          <option value="green">Green</option>\n          <option value="pink">Pink</option>\n          <option value="starwars">Star Wars</option>\n          <option value="kfc">KFC🍗</option>\n          <option value="halloween">Halloween 🎃</option>\n        </select>\n        <div id="limitedEdition" class="limited-edition" style="display:none;">Limited Edition</div>\n      </div>\n    ';
  document.body.appendChild(v5893DraggableElement);
  const bgUrlInput = v5893DraggableElement.querySelector("#bgUrl");
  bgUrlInput.value = localStorage.getItem("bgUrl") || "";
  const applyBgButton = v5893DraggableElement.querySelector("#applyBg");
  applyBgButton.onclick = () => {
    const bgUrl = bgUrlInput.value.trim();
    if (bgUrl === "") {
      showNotification("Enter a URL first!");
      return;
    }
    localStorage.setItem("bgUrl", bgUrl);
    let v1331HomeBgElement = document.querySelector(".home-bg");
    const updateHomeBackgroundImage = () => {
      v1331HomeBgElement = document.querySelector(".home-bg");
      if (v1331HomeBgElement) {
        v1331HomeBgElement.style.setProperty(
          "background-image",
          'url("' + bgUrl + '")',
          "important",
        );
      }
    };
    if (v1331HomeBgElement == null) {
      const pollInterval = setInterval(() => {
        v1331HomeBgElement = document.querySelector(".home-bg");
        if (v1331HomeBgElement != null) {
          clearInterval(pollInterval);
          updateHomeBackgroundImage();
        }
      }, 100);
    } else {
      updateHomeBackgroundImage();
    }
    showNotification("Custom Background applied!");
  };
  const themeSelect = v5893DraggableElement.querySelector("#themeSelect");
  const angle = localStorage.getItem("theme") || "blue";
  themeSelect.value = angle;
  applyThemeColors(angle);
  themeSelect.onchange = (themeChangeEvent) => {
    const v1263MyY = themeChangeEvent.target.value;
    if (v1263MyY === "halloween") {
      createHalloweenModal((isHalloween) => {
        if (isHalloween) {
          applyThemeColors("halloween");
        } else {
          themeChangeEvent.target.value = "blue";
          applyThemeColors("blue");
        }
      });
    } else {
      applyThemeColors(v1263MyY);
      showNotification("Theme changed to " + v1263MyY);
    }
  };
  const toggleKeyInput = v5893DraggableElement.querySelector("#toggleKeyInput");
  toggleKeyInput.value = state.activeKey;
  toggleKeyInput.addEventListener("keydown", (v55b9KeyboardEvent) => {
    v55b9KeyboardEvent.preventDefault();
    state.activeKey = v55b9KeyboardEvent.key;
    toggleKeyInput.value = state.activeKey;
  });
  let v76deOffsetX;
  let v1330OffsetY;
  let isDraggingActive = false;
  let v30f1IsDragging = false;
  v5893DraggableElement.addEventListener("mousedown", (v1442ClickEvent) => {
    if (
      v1442ClickEvent.target.tagName === "BUTTON" ||
      v1442ClickEvent.target.tagName === "INPUT" ||
      v1442ClickEvent.target.classList.contains("credits")
    ) {
      return;
    }
    isDraggingActive = true;
    v30f1IsDragging = false;
    v76deOffsetX =
      v1442ClickEvent.clientX -
      v5893DraggableElement.getBoundingClientRect().left;
    v1330OffsetY =
      v1442ClickEvent.clientY -
      v5893DraggableElement.getBoundingClientRect().top;
    v5893DraggableElement.style.transition = "none";
    const v18d0HandleMouseMove = (v59a0MouseEvent) => {
      const v3520DeltaX = v59a0MouseEvent.clientX - v1442ClickEvent.clientX;
      const v182dDeltaY = v59a0MouseEvent.clientY - v1442ClickEvent.clientY;
      if (
        !v30f1IsDragging &&
        (Math.abs(v3520DeltaX) > 5 || Math.abs(v182dDeltaY) > 5)
      ) {
        v30f1IsDragging = true;
      }
      if (isDraggingActive) {
        v5893DraggableElement.style.left =
          v59a0MouseEvent.clientX - v76deOffsetX + "px";
        v5893DraggableElement.style.top =
          v59a0MouseEvent.clientY - v1330OffsetY + "px";
        v5893DraggableElement.style.bottom = "auto";
        v5893DraggableElement.style.right = "auto";
      }
    };
    const v1dd5HandleMouseUp = () => {
      isDraggingActive = false;
      v5893DraggableElement.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", v18d0HandleMouseMove);
      document.removeEventListener("mouseup", v1dd5HandleMouseUp);
    };
    document.addEventListener("mousemove", v18d0HandleMouseMove);
    document.addEventListener("mouseup", v1dd5HandleMouseUp);
  });
  v5893DraggableElement.addEventListener("click", (propagationEvent) => {
    if (v30f1IsDragging) {
      propagationEvent.stopImmediatePropagation();
    }
  });
  if (localStorage.getItem("theme") === "halloween") {
    for (let v8b93I = 0; v8b93I < 3; v8b93I++) {
      const ab2fSpanElement = document.createElement("span");
      ab2fSpanElement.className = "bat";
      ab2fSpanElement.textContent = "🦇";
      v5893DraggableElement.appendChild(ab2fSpanElement);
    }
  }
  return v5893DraggableElement;
}
function togglePanels() {
  const v2267DeepToolsPanel = document.getElementById("deep-tools-panel");
  const updateHistoryPanel = document.getElementById("update-history");
  const settingsPanel = document.getElementById("settings-panel");
  const v1194PlusPanel = document.getElementById("plus-panel");
  const currentDisplay = v2267DeepToolsPanel.style.display;
  const newDisplay = currentDisplay === "none" ? "block" : "none";
  v2267DeepToolsPanel.style.display = newDisplay;
  updateHistoryPanel.style.display = newDisplay;
  settingsPanel.style.display = newDisplay;
  v1194PlusPanel.style.display = newDisplay;
}

export {
  createHalloweenModal,
  initControlOverlay,
  createUpdateHistoryStyles,
  injectDeepToolsStyles,
  injectPlusPanelStyles,
  injectSettingsPanelStyles,
  togglePanels,
};
