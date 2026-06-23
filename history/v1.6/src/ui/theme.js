import { radius, coreSharedState } from "../core.js";

function applyTheme(themeName) {
  const rootElement = document.documentElement;
  const themeColors = {
    grey: {
      acc: "#888888",
      accH: "#aaaaaa",
      accRGB: "136,136,136",
      text: "#e0e0e0",
      textSec: "#888",
      bg1: "#1a1a1a",
      bg2: "#242424",
      bg3: "#2a2a2a",
      border: "#333",
      hover: "#2e2e2e",
    },
    blue: {
      acc: "#4fc3f7",
      accH: "#81d4fa",
      accRGB: "79,195,247",
      text: "#e0e0e0",
      textSec: "#888",
      bg1: "#1a1a1a",
      bg2: "#242424",
      bg3: "#2a2a2a",
      border: "#333",
      hover: "#2e2e2e",
    },
    red: {
      acc: "#ef5350",
      accH: "#e57373",
      accRGB: "239,83,80",
      text: "#e0e0e0",
      textSec: "#888",
      bg1: "#1a1a1a",
      bg2: "#242424",
      bg3: "#2a2a2a",
      border: "#333",
      hover: "#2e2e2e",
    },
    green: {
      acc: "#66bb6a",
      accH: "#81c784",
      accRGB: "102,187,106",
      text: "#e0e0e0",
      textSec: "#888",
      bg1: "#1a1a1a",
      bg2: "#242424",
      bg3: "#2a2a2a",
      border: "#333",
      hover: "#2e2e2e",
    },
    pink: {
      acc: "#f06292",
      accH: "#f48fb1",
      accRGB: "240,98,146",
      text: "#e0e0e0",
      textSec: "#888",
      bg1: "#1a1a1a",
      bg2: "#242424",
      bg3: "#2a2a2a",
      border: "#333",
      hover: "#2e2e2e",
    },
    starwars: {
      acc: "#ffd740",
      accH: "#ffe082",
      accRGB: "255,215,64",
      text: "#e0e0e0",
      textSec: "#888",
      bg1: "#1a1a1a",
      bg2: "#242424",
      bg3: "#2a2a2a",
      border: "#333",
      hover: "#2e2e2e",
    },
    kfc: {
      acc: "#f44336",
      accH: "#e57373",
      accRGB: "244,67,54",
      text: "#e0e0e0",
      textSec: "#888",
      bg1: "#1a1a1a",
      bg2: "#242424",
      bg3: "#2a2a2a",
      border: "#333",
      hover: "#2e2e2e",
    },
    halloween: {
      acc: "#ff6600",
      accH: "#ff8833",
      accRGB: "255,102,0",
      text: "#e0e0e0",
      textSec: "#888",
      bg1: "#1a1a1a",
      bg2: "#242424",
      bg3: "#2a2a2a",
      border: "#333",
      hover: "#2e2e2e",
    },
  };
  const themeColor = themeColors[themeName] || themeColors.grey;
  rootElement.style.setProperty("--acc", themeColor.acc);
  rootElement.style.setProperty("--acc-h", themeColor.accH);
  rootElement.style.setProperty("--acc-rgb", themeColor.accRGB);
  rootElement.style.setProperty("--text", themeColor.text);
  rootElement.style.setProperty("--text-sec", themeColor.textSec);
  rootElement.style.setProperty("--bg1", themeColor.bg1);
  rootElement.style.setProperty("--bg2", themeColor.bg2);
  rootElement.style.setProperty("--bg3", themeColor.bg3);
  rootElement.style.setProperty("--bdr", themeColor.border);
  rootElement.style.setProperty("--hvr", themeColor.hover);
  localStorage.setItem("theme", themeName);
}
function initBackground() {
  const bgUrl = localStorage.getItem("bgUrl") || "";
  if (!bgUrl) {
    return;
  }
  const setBackgroundImage = () => {
    const homeBackground = document.querySelector(".home-bg");
    if (homeBackground) {
      homeBackground.style.setProperty(
        "background-image",
        'url("' + bgUrl + '")',
        "important",
      );
    }
  };
  if (!document.querySelector(".home-bg")) {
    const bgCheckInterval = setInterval(() => {
      if (document.querySelector(".home-bg")) {
        clearInterval(bgCheckInterval);
        setBackgroundImage();
      }
    }, 100);
  } else {
    setBackgroundImage();
  }
}
function injectStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent =
    "\n      /* ===== PANEL BASE ===== */\n      .ast-panel {\n        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;\n        background: var(--bg1, #1a1a1a);\n        color: var(--text, #e0e0e0);\n        border-radius: 6px;\n        position: fixed;\n        z-index: 99999;\n        user-select: none;\n        cursor: move;\n        font-size: 13px;\n        min-width: 220px;\n        overflow: hidden;\n      }\n\n      /* ===== PANEL HEADER ===== */\n      .ast-header {\n        background: var(--bg2, #242424);\n        padding: 10px 14px;\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        border-bottom: 1px solid var(--bdr, #333);\n      }\n      .ast-header-title {\n        font-size: 12px;\n        font-weight: 700;\n        letter-spacing: 1.5px;\n        text-transform: uppercase;\n        color: var(--acc, #888);\n      }\n      .ast-header-min {\n        background: none;\n        border: none;\n        color: var(--text-sec, #888);\n        font-size: 16px;\n        cursor: pointer;\n        padding: 0 4px;\n        line-height: 1;\n        transition: color 0.15s;\n      }\n      .ast-header-min:hover { color: var(--text, #e0e0e0); }\n\n      /* ===== PANEL BODY ===== */\n      .ast-body {\n        padding: 8px 12px 12px 12px;\n      }\n\n      /* ===== SECTION ===== */\n      .ast-section {\n        margin-bottom: 6px;\n      }\n      .ast-section-label {\n        font-size: 10px;\n        font-weight: 600;\n        letter-spacing: 1px;\n        text-transform: uppercase;\n        color: var(--text-sec, #888);\n        padding: 8px 0 4px 2px;\n        display: block;\n      }\n\n      /* ===== BUTTONS ===== */\n      .ast-btn {\n        display: block;\n        width: 100%;\n        background: var(--bg2, #242424);\n        color: var(--text, #e0e0e0);\n        border: none;\n        border-radius: 4px;\n        padding: 8px 10px;\n        font-size: 12px;\n        font-weight: 500;\n        cursor: pointer;\n        text-align: left;\n        transition: background 0.12s;\n        margin-bottom: 3px;\n        font-family: inherit;\n        position: relative;\n      }\n      .ast-btn:hover:not(:disabled) {\n        background: var(--hvr, #2e2e2e);\n      }\n      .ast-btn:active:not(:disabled) {\n        background: var(--bg3, #2a2a2a);\n      }\n      .ast-btn:disabled {\n        opacity: 0.35;\n        cursor: not-allowed;\n      }\n      .ast-btn.toggle-on {\n        color: var(--acc, #888);\n      }\n      .ast-btn.toggle-on::before {\n        content: '';\n        position: absolute;\n        left: 0;\n        top: 4px;\n        bottom: 4px;\n        width: 2px;\n        background: var(--acc, #888);\n        border-radius: 1px;\n      }\n      .ast-btn.patched {\n        opacity: 0.25;\n        text-decoration: line-through;\n        cursor: not-allowed;\n      }\n\n      /* ===== TOGGLE ROW ===== */\n      .ast-toggle-row {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        padding: 5px 2px;\n        font-size: 12px;\n      }\n      .ast-toggle-row label {\n        color: var(--text, #e0e0e0);\n        font-weight: 400;\n        cursor: pointer;\n      }\n\n      /* Toggle switch */\n      .ast-switch {\n        position: relative;\n        width: 32px;\n        height: 18px;\n        flex-shrink: 0;\n      }\n      .ast-switch input {\n        opacity: 0;\n        width: 0;\n        height: 0;\n        position: absolute;\n      }\n      .ast-switch .slider {\n        position: absolute;\n        cursor: pointer;\n        top: 0; left: 0; right: 0; bottom: 0;\n        background: #333;\n        border-radius: 9px;\n        transition: background 0.2s;\n      }\n      .ast-switch .slider::before {\n        content: '';\n        position: absolute;\n        height: 14px;\n        width: 14px;\n        left: 2px;\n        bottom: 2px;\n        background: #888;\n        border-radius: 50%;\n        transition: transform 0.2s, background 0.2s;\n      }\n      .ast-switch input:checked + .slider {\n        background: rgba(var(--acc-rgb, 136,136,136), 0.3);\n      }\n      .ast-switch input:checked + .slider::before {\n        transform: translateX(14px);\n        background: var(--acc, #888);\n      }\n\n      /* ===== SELECT ===== */\n      .ast-select {\n        width: 100%;\n        background: var(--bg2, #242424);\n        color: var(--text, #e0e0e0);\n        border: 1px solid var(--bdr, #333);\n        border-radius: 4px;\n        padding: 6px 8px;\n        font-size: 12px;\n        cursor: pointer;\n        outline: none;\n        font-family: inherit;\n        margin-bottom: 3px;\n        -webkit-appearance: none;\n        appearance: none;\n      }\n      .ast-select:focus {\n        border-color: var(--acc, #888);\n      }\n\n      /* ===== INPUTS ===== */\n      .ast-input {\n        background: var(--bg2, #242424);\n        color: var(--text, #e0e0e0);\n        border: 1px solid var(--bdr, #333);\n        border-radius: 4px;\n        padding: 6px 8px;\n        font-size: 12px;\n        outline: none;\n        font-family: inherit;\n        transition: border-color 0.15s;\n      }\n      .ast-input:focus {\n        border-color: var(--acc, #888);\n      }\n      .ast-input::placeholder {\n        color: #555;\n      }\n\n      .ast-textarea {\n        background: var(--bg2, #242424);\n        color: var(--text, #e0e0e0);\n        border: 1px solid var(--bdr, #333);\n        border-radius: 4px;\n        padding: 8px;\n        font-size: 12px;\n        outline: none;\n        font-family: inherit;\n        resize: none;\n        width: 100%;\n        box-sizing: border-box;\n        transition: border-color 0.15s;\n      }\n      .ast-textarea:focus {\n        border-color: var(--acc, #888);\n      }\n      .ast-textarea::placeholder {\n        color: #555;\n      }\n\n      /* ===== KEY CAPTURE ===== */\n      .ast-key-row {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        padding: 4px 2px;\n        font-size: 12px;\n        margin-bottom: 3px;\n      }\n      .ast-key-row span {\n        color: var(--text, #e0e0e0);\n      }\n      .ast-key-capture {\n        background: var(--bg2, #242424);\n        border: 1px solid var(--bdr, #333);\n        color: var(--acc, #888);\n        border-radius: 4px;\n        padding: 4px 10px;\n        font-size: 11px;\n        text-align: center;\n        min-width: 50px;\n        cursor: pointer;\n        outline: none;\n        font-family: 'Consolas', 'Courier New', monospace;\n        font-weight: 600;\n        transition: border-color 0.15s;\n      }\n      .ast-key-capture:focus {\n        border-color: var(--acc, #888);\n      }\n\n      /* ===== INLINE ROW ===== */\n      .ast-row {\n        display: flex;\n        align-items: center;\n        gap: 6px;\n        margin-bottom: 4px;\n      }\n      .ast-row .ast-input {\n        flex: 1;\n      }\n\n      /* ===== CREDITS ===== */\n      .ast-credits {\n        padding-top: 8px;\n        font-size: 10px;\n        color: #555;\n        line-height: 1.5;\n        text-align: center;\n      }\n\n      /* ===== SEPARATOR ===== */\n      .ast-sep {\n        height: 1px;\n        background: var(--bdr, #333);\n        margin: 6px 0;\n      }\n\n      /* ===== UPDATE LIST ===== */\n      .ast-update-list {\n        margin: 0;\n        padding-left: 16px;\n        font-size: 11px;\n        color: var(--text-sec, #888);\n        line-height: 1.6;\n      }\n      .ast-update-list li {\n        margin-bottom: 4px;\n      }\n\n      /* ===== HIDE ADS ===== */\n      div.sidebar.left > div.ad-block { opacity:0!important; pointer-events:none!important; display:none!important; }\n      div.sidebar.left > a { display:none!important; }\n      div.sidebar.left { max-width:30vw; width:21rem; bottom:0!important; }\n    ";
  document.head.appendChild(styleElement);
}

export { applyTheme, initBackground, injectStyles };
