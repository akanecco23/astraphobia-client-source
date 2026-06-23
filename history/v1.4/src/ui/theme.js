import { showNotification } from "./interaction.js";
import { setupProxyHooks } from "../features/antidetection.js";
import { isReady, disableGameRestrictions, state } from "../core.js";
import { toggleMinimapSize } from "../features/esp.js";

function injectPlusPanelStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent =
    "\n      #plus-panel {\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: var(--shadow);\n        border: 1px solid var(--border);\n        background: var(--bg-primary);\n        backdrop-filter: blur(20px);\n        border-radius: 16px;\n      }\n      #plus-panel:hover {\n        box-shadow: var(--shadow-hover);\n        transform: translateY(-2px);\n      }\n      #plus-panel textarea {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 8px;\n        padding: 10px;\n        transition: all 0.2s ease;\n        font-size: 13px;\n      }\n      #plus-panel textarea:focus {\n        outline: none;\n        border-color: var(--accent);\n        box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.2);\n      }\n      #plus-panel input[type=\"number\"] {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        width: 60px;\n        text-align: center;\n        transition: all 0.2s ease;\n      }\n      #plus-panel button {\n        background: var(--bg-secondary);\n        color: var(--accent);\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        padding: 10px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        position: relative;\n        overflow: hidden;\n        width: 100%;\n        margin-bottom: 10px;\n      }\n      #plus-panel button::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: -100%;\n        width: 100%;\n        height: 100%;\n        background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.2), transparent);\n        transition: left 0.5s;\n      }\n      #plus-panel button:hover:not(:disabled)::before {\n        left: 100%;\n      }\n      #plus-panel button:hover:not(:disabled) {\n        background: var(--hover-bg);\n        border-color: var(--accent);\n        transform: translateY(-1px);\n        box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.2);\n        color: var(--accent-hover);\n      }\n      #plus-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);\n      }\n      #plus-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n    ";
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
    if (state.isInitialized_2) {
      showNotification("Thresher Super Boost is already active!");
      return;
    }
    setupProxyHooks();
    thresherButton.textContent = "Thresher Super Boost Active";
    thresherButton.style.color = "var(--accent)";
    thresherButton.style.opacity = "0.6";
    thresherButton.disabled = true;
  };
  const astraVisionButton = uiContainer.querySelector("#astraVisionBtn");
  astraVisionButton.onclick = () => {
    if (isReady) {
      showNotification("Astra-Vision already enabled!");
      return;
    }
    setupProxyHooks();
    disableGameRestrictions();
    astraVisionButton.textContent = "Astra-Vision Active";
    astraVisionButton.style.color = "var(--accent)";
    astraVisionButton.style.opacity = "0.6";
    astraVisionButton.disabled = true;
    showNotification(
      "👁️ Astra-Vision enabled! (zoom-limit unlocked, no ink-flash or deep darkness effects)",
    );
  };
  const smallMinimapButton = uiContainer.querySelector("#smallMinimapBtn");
  smallMinimapButton.onclick = () => {
    setupProxyHooks();
    toggleMinimapSize();
    if (state.isProcessing_2) {
      smallMinimapButton.textContent = "Disable Small Minimap";
      smallMinimapButton.style.color = "var(--accent)";
      smallMinimapButton.style.opacity = "0.6";
    } else {
      smallMinimapButton.textContent = "Enable Small Minimap";
      smallMinimapButton.style.color = "var(--accent)";
      smallMinimapButton.style.opacity = "1";
    }
  };
  let relativeX;
  let relativeY;
  let isActive = false;
  let isEnabled = false;
  uiContainer.addEventListener("mousedown", (arg_7846) => {
    if (
      arg_7846.target.tagName === "BUTTON" ||
      arg_7846.target.tagName === "TEXTAREA" ||
      arg_7846.target.tagName === "INPUT" ||
      arg_7846.target.classList.contains("credits")
    ) {
      return;
    }
    isActive = true;
    isEnabled = false;
    relativeX = arg_7846.clientX - uiContainer.getBoundingClientRect().left;
    relativeY = arg_7846.clientY - uiContainer.getBoundingClientRect().top;
    uiContainer.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - arg_7846.clientX;
      const deltaY = mouseEvent.clientY - arg_7846.clientY;
      if (!isEnabled && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isEnabled = true;
      }
      if (isActive) {
        uiContainer.style.left = mouseEvent.clientX - relativeX + "px";
        uiContainer.style.top = mouseEvent.clientY - relativeY + "px";
        uiContainer.style.bottom = "auto";
        uiContainer.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      isActive = false;
      uiContainer.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
  uiContainer.addEventListener("click", (arg_eef9) => {
    if (isEnabled) {
      arg_eef9.stopImmediatePropagation();
    }
  });
  return uiContainer;
}
function initBackgroundImage() {
  const backgroundUrl = localStorage.getItem("bgUrl") || "";
  if (backgroundUrl === "") {
    return;
  }
  let homeBgElement = document.querySelector(".home-bg");
  const applyBackgroundImage = () => {
    homeBgElement.style.setProperty(
      "background-image",
      'url("' + backgroundUrl + '")',
      "important",
    );
  };
  if (!homeBgElement) {
    const bgCheckInterval = setInterval(() => {
      homeBgElement = document.querySelector(".home-bg");
      if (homeBgElement != null) {
        clearInterval(bgCheckInterval);
        applyBackgroundImage();
      }
    }, 100);
  } else {
    applyBackgroundImage();
  }
}
function setTheme(themeColor) {
  const rootElement = document.documentElement;
  const themeConfigs = {
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
  };
  const selectedTheme = themeConfigs[themeColor] || themeConfigs.blue;
  Object.entries(selectedTheme).forEach(([styleProperty, styleValue]) => {
    rootElement.style.setProperty(styleProperty, styleValue);
  });
  localStorage.setItem("theme", themeColor);
}

export { injectPlusPanelStyles, initBackgroundImage, setTheme };
