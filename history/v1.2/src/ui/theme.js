import { showNotification } from "./interaction.js";
import { radius, state } from "../core.js";

function applyCustomBackground() {
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
    const checkBgInterval = setInterval(() => {
      homeBgElement = document.querySelector(".home-bg");
      if (homeBgElement != null) {
        clearInterval(checkBgInterval);
        applyBackgroundImage();
      }
    }, 100);
  } else {
    applyBackgroundImage();
  }
}
function createSettingsStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent =
    "\n      #settings-panel {\n        font-family: 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);\n        border: 1px solid #333;\n        background: #1e1e1e;\n        position: fixed;\n        top: 20px;\n        left: 20px;\n        color: #e0e0e0;\n        padding: 14px;\n        border-radius: 8px;\n        font-size: 14px;\n        z-index: 99999;\n        user-select: none;\n        width: 220px;\n        text-align: center;\n        cursor: move;\n        overflow: hidden;\n      }\n      #settings-panel:hover {\n        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);\n      }\n      #settings-panel button {\n        background: #2d2d2d;\n        color: #e74c3c;\n        border: 1px solid #444;\n        border-radius: 6px;\n        padding: 8px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        width: 100%;\n        margin-bottom: 8px;\n      }\n      #settings-panel button:hover:not(:disabled) {\n        background: #3d3d3d;\n        border-color: #e74c3c;\n        transform: translateY(-1px);\n        box-shadow: 0 2px 6px rgba(231, 76, 60, 0.2);\n      }\n      #settings-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);\n      }\n      #settings-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #settings-panel button.min-btn {\n        background: none;\n        border: none;\n        color: #e74c3c;\n        font-size: 18px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 5px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: color 0.2s ease;\n        width: 20px;\n        height: 20px;\n        line-height: 20px;\n      }\n      #settings-panel button.min-btn:hover {\n        color: #f39c12;\n      }\n      #settings-panel .keybind-set, #settings-panel .bg-set {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        margin-bottom: 8px;\n        font-size: 12px;\n      }\n      #settings-panel .keybind-set label, #settings-panel .bg-set label {\n        color: #e0e0e0;\n      }\n      #settings-panel #toggleKeyInput, #settings-panel #bgUrl {\n        background: #2d2d2d;\n        border: 1px solid #444;\n        color: #e0e0e0;\n        border-radius: 4px;\n        padding: 4px;\n        text-align: center;\n      }\n      #settings-panel #toggleKeyInput {\n        width: 80px;\n      }\n      #settings-panel #bgUrl {\n        width: 120px;\n      }\n      #settings-panel .section-header {\n        font-weight: bold;\n        color: #e74c3c;\n        margin: 10px 0 5px 0;\n        font-size: 13px;\n      }\n    ";
  document.head.appendChild(styleElement);
  const v4420Container = document.createElement("div");
  v4420Container.id = "settings-panel";
  v4420Container.innerHTML =
    '\n      <div style="font-weight:600; margin-bottom:10px; color:#e74c3c; position: relative; height: 40px; line-height: 40px; padding-right: 25px;">\n        SETTINGS\n        <button class="min-btn" id="minSettings">−</button>\n      </div>\n      <div id="settingsContent">\n        <div class="keybind-set">\n          <label for="toggleKeyInput">Toggle Client:</label>\n          <input type="text" id="toggleKeyInput" placeholder="Press key..." readonly>\n        </div>\n        <div class="section-header">Custom Background</div>\n        <div class="bg-set">\n          <label for="bgUrl">BG URL:</label>\n          <input type="text" id="bgUrl" placeholder="Image/GIF URL">\n        </div>\n        <button id="applyBg">Apply Custom Background</button>\n      </div>\n    ';
  document.body.appendChild(v4420Container);
  const bgUrlInput = v4420Container.querySelector("#bgUrl");
  bgUrlInput.value = localStorage.getItem("bgUrl") || "";
  const applyBgButton = v4420Container.querySelector("#applyBg");
  applyBgButton.onclick = () => {
    const bgUrl = bgUrlInput.value.trim();
    if (bgUrl === "") {
      showNotification("Enter a URL first!");
      return;
    }
    localStorage.setItem("bgUrl", bgUrl);
    let v562fHomeBgElement = document.querySelector(".home-bg");
    const applyBackgroundImageSecondary = () => {
      v562fHomeBgElement.style.setProperty(
        "background-image",
        'url("' + bgUrl + '")',
        "important",
      );
    };
    if (v562fHomeBgElement == null) {
      const pollInterval = setInterval(() => {
        v562fHomeBgElement = document.querySelector(".home-bg");
        if (v562fHomeBgElement != null) {
          clearInterval(pollInterval);
        }
        applyBackgroundImageSecondary();
      }, 100);
    } else {
      applyBackgroundImageSecondary();
    }
    showNotification("Custom Background applied!");
  };
  const minimizeSettingsButton = v4420Container.querySelector("#minSettings");
  const settingsContent = v4420Container.querySelector("#settingsContent");
  let v1683IsHidden = false;
  minimizeSettingsButton.onclick = (v5c3cEvent) => {
    v5c3cEvent.stopPropagation();
    v1683IsHidden = !v1683IsHidden;
    settingsContent.style.display = v1683IsHidden ? "none" : "block";
    v4420Container.style.height = v1683IsHidden ? "50px" : "auto";
    minimizeSettingsButton.textContent = v1683IsHidden ? "+" : "−";
  };
  const toggleKeyInput = v4420Container.querySelector("#toggleKeyInput");
  toggleKeyInput.value = state.activeKey;
  toggleKeyInput.addEventListener("keydown", (v5322KeyEvent) => {
    v5322KeyEvent.preventDefault();
    state.activeKey = v5322KeyEvent.key;
    toggleKeyInput.value = state.activeKey;
  });
  let v1e01OffsetX;
  let v392aOffsetY;
  let v1cb5IsActive = false;
  let v46f1IsActive = false;
  v4420Container.addEventListener("mousedown", (v314eClickEvent) => {
    if (
      v314eClickEvent.target.tagName === "BUTTON" ||
      v314eClickEvent.target.tagName === "INPUT" ||
      v314eClickEvent.target.classList.contains("credits")
    ) {
      return;
    }
    v1cb5IsActive = true;
    v46f1IsActive = false;
    v1e01OffsetX =
      v314eClickEvent.clientX - v4420Container.getBoundingClientRect().left;
    v392aOffsetY =
      v314eClickEvent.clientY - v4420Container.getBoundingClientRect().top;
    v4420Container.style.transition = "none";
    const v15dcHandleMouseMove = (v2ba8MouseEvent) => {
      const v90eeDeltaX = v2ba8MouseEvent.clientX - v314eClickEvent.clientX;
      const v433eDeltaY = v2ba8MouseEvent.clientY - v314eClickEvent.clientY;
      if (
        !v46f1IsActive &&
        (Math.abs(v90eeDeltaX) > 5 || Math.abs(v433eDeltaY) > 5)
      ) {
        v46f1IsActive = true;
      }
      if (v1cb5IsActive) {
        v4420Container.style.left =
          v2ba8MouseEvent.clientX - v1e01OffsetX + "px";
        v4420Container.style.top =
          v2ba8MouseEvent.clientY - v392aOffsetY + "px";
        v4420Container.style.bottom = "auto";
        v4420Container.style.right = "auto";
      }
    };
    const ea22HandleMouseUp = () => {
      v1cb5IsActive = false;
      v4420Container.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", v15dcHandleMouseMove);
      document.removeEventListener("mouseup", ea22HandleMouseUp);
    };
    document.addEventListener("mousemove", v15dcHandleMouseMove);
    document.addEventListener("mouseup", ea22HandleMouseUp);
  });
  v4420Container.addEventListener("click", (propagationEvent) => {
    if (v46f1IsActive) {
      propagationEvent.stopImmediatePropagation();
    }
  });
  return v4420Container;
}

export { applyCustomBackground, createSettingsStyles };
