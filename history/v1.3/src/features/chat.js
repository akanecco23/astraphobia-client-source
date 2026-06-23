import { hookTextEncoder, radius, coreSharedState } from "../core.js";
import { generateRandomString } from "../utils.js";
import { simulateTyping, showNotification } from "../ui/interaction.js";
import { toggleMouseSimulation } from "./movement.js";

function startScheduledTask(taskData, intervalSeconds) {
  if (coreSharedState.updateInterval) {
    clearInterval(coreSharedState.updateInterval);
  }
  coreSharedState.isProcessing = true;
  coreSharedState.updateInterval = setInterval(() => {
    autoChat(taskData);
  }, intervalSeconds * 1000);
}
function stopInterval() {
  if (coreSharedState.updateInterval) {
    clearInterval(coreSharedState.updateInterval);
    coreSharedState.updateInterval = null;
  }
  coreSharedState.isProcessing = false;
}
function autoChat(textToType) {
  const chatInput =
    document.querySelector(".chat-input input") ||
    document.querySelector('input[placeholder*="chat" i]') ||
    document.querySelector('input[type="text"]');
  if (!chatInput) {
    console.warn("Chat input not found - skipping auto chat");
    return;
  }
  chatInput.focus();
  chatInput.value = "";
  let charIndex = 0;
  const typeCharacter = () => {
    if (charIndex >= textToType.length) {
      const sendButton =
        document.querySelector(".chat-input button") ||
        document.querySelector('button[aria-label*="send" i]') ||
        document.querySelector("button");
      if (sendButton) {
        sendButton.click();
      } else {
        chatInput.dispatchEvent(
          new Event("change", {
            bubbles: true,
          }),
        );
        chatInput.dispatchEvent(
          new Event("input", {
            bubbles: true,
          }),
        );
        setTimeout(() => {
          chatInput.value = "";
          chatInput.blur();
        }, 100);
      }
      return;
    }
    chatInput.value += textToType[charIndex];
    chatInput.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
      }),
    );
    charIndex++;
    setTimeout(typeCharacter, 25);
  };
  typeCharacter();
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

export { startScheduledTask, stopInterval, autoChat, createDeepToolsPanel };
