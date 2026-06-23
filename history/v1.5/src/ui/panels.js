import { showNotification } from "./interaction.js";
import { handleAnimalAction } from "../features/autofarm.js";
import { radius, securityConfigs, coreSharedState } from "../core.js";

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
    (processAnimals) => {
      try {
        if (!coreSharedState.playerData?.myAnimals?.[0]) {
          return;
        }
        const visibleFishLevel =
          coreSharedState.playerData.myAnimals[0].visibleFishLevel;
        const mergedFishConfig = {
          ...securityConfigs.default,
          ...securityConfigs[visibleFishLevel],
        };
        if (processAnimals.ctrlKey) {
          if (processAnimals.shiftKey && visibleFishLevel === 107) {
            sendActionSequence();
            return;
          } else if (
            processAnimals.shiftKey &&
            visibleFishLevel !== 101 &&
            coreSharedState.playerData.myAnimals[0]._standing
          ) {
            handleAnimalAction(
              Math.floor(Math.random() * 1647483648) + 500000000,
            );
            return;
          } else {
            let propertyMap = Object.getOwnPropertyNames(
              coreSharedState.gameInstance,
            )
              .map((serviceKey) => coreSharedState.gameInstance[serviceKey])
              .find((keyMap) => keyMap.keys instanceof Array);
            if (propertyMap) {
              propertyMap.pointerDown = true;
              propertyMap.pressElapsed = Infinity;
              propertyMap.setPointerDown(false);
            }
          }
        } else if (processAnimals.altKey) {
          handleAnimalAction(
            coreSharedState.playerData?.myAnimals?.[0]?._standing
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
  coreSharedState.isInitialized_2 = true;
};
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

export { createHalloweenModal, initControlOverlay };
