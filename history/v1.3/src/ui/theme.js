import { showNotification } from "./interaction.js";
import { initHooks } from "../features/entitytrail.js";
import {
  radius,
  isActive,
  disableGameRestrictions,
  coreSharedState,
} from "../core.js";
import { toggleMinimapSize } from "../features/esp.js";

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
    const elementCheckInterval = setInterval(() => {
      homeBgElement = document.querySelector(".home-bg");
      if (homeBgElement != null) {
        clearInterval(elementCheckInterval);
        applyBackgroundImage();
      }
    }, 100);
  } else {
    applyBackgroundImage();
  }
}

export { injectPlusPanelStyles, initBackgroundImage };
