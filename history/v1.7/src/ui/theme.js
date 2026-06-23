import { radius, state } from "../core.js";

function setTheme(themeName) {
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
  Object.entries({
    "--acc": themeColor.acc,
    "--acc-h": themeColor.accH,
    "--acc-rgb": themeColor.accRGB,
    "--text": themeColor.text,
    "--text-sec": themeColor.textSec,
    "--bg1": themeColor.bg1,
    "--bg2": themeColor.bg2,
    "--bg3": themeColor.bg3,
    "--bdr": themeColor.border,
    "--hvr": themeColor.hover,
  }).forEach(([stylePropertyName, stylePropertyValue]) =>
    rootElement.style.setProperty(stylePropertyName, stylePropertyValue),
  );
  localStorage.setItem("theme", themeName);
}
function initHomeBackground() {
  const backgroundUrl = localStorage.getItem("bgUrl") || "";
  if (!backgroundUrl) {
    return;
  }
  const applyBackground = () => {
    const homeBackground = document.querySelector(".home-bg");
    if (homeBackground) {
      homeBackground.style.setProperty(
        "background-image",
        'url("' + backgroundUrl + '")',
        "important",
      );
    }
  };
  if (!document.querySelector(".home-bg")) {
    const bgCheckInterval = setInterval(() => {
      if (document.querySelector(".home-bg")) {
        clearInterval(bgCheckInterval);
        applyBackground();
      }
    }, 100);
  } else {
    applyBackground();
  }
}
function injectStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent =
    "\n      .ast-panel{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg1,#1a1a1a);color:var(--text,#e0e0e0);border-radius:6px;position:fixed;z-index:99999;user-select:none;cursor:move;font-size:13px;min-width:220px;overflow:hidden;}\n      .ast-header{background:var(--bg2,#242424);padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--bdr,#333);}\n      .ast-header-title{font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--acc,#888);}\n      .ast-header-min{background:none;border:none;color:var(--text-sec,#888);font-size:16px;cursor:pointer;padding:0 4px;line-height:1;}\n      .ast-header-min:hover{color:var(--text,#e0e0e0);}\n      .ast-body{padding:8px 12px 12px 12px;}\n      .ast-section-label{font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-sec,#888);padding:8px 0 4px 2px;display:block;}\n      .ast-btn{display:block;width:100%;background:var(--bg2,#242424);color:var(--text,#e0e0e0);border:none;border-radius:4px;padding:8px 10px;font-size:12px;font-weight:500;cursor:pointer;text-align:left;transition:background .12s;margin-bottom:3px;font-family:inherit;position:relative;}\n      .ast-btn:hover:not(:disabled){background:var(--hvr,#2e2e2e);}\n      .ast-btn:disabled{opacity:.35;cursor:not-allowed;}\n      .ast-btn.toggle-on{color:var(--acc,#888);}\n      .ast-btn.toggle-on::before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:2px;background:var(--acc,#888);border-radius:1px;}\n      .ast-btn.patched{opacity:.25;text-decoration:line-through;cursor:not-allowed;}\n      .ast-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:5px 2px;font-size:12px;}\n      .ast-toggle-row label{color:var(--text,#e0e0e0);cursor:pointer;}\n      .ast-switch{position:relative;width:32px;height:18px;flex-shrink:0;}\n      .ast-switch input{opacity:0;width:0;height:0;position:absolute;}\n      .ast-switch .slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#333;border-radius:9px;transition:background .2s;}\n      .ast-switch .slider::before{content:'';position:absolute;height:14px;width:14px;left:2px;bottom:2px;background:#888;border-radius:50%;transition:transform .2s,background .2s;}\n      .ast-switch input:checked+.slider{background:rgba(var(--acc-rgb,136,136,136),.3);}\n      .ast-switch input:checked+.slider::before{transform:translateX(14px);background:var(--acc,#888);}\n      .ast-select{width:100%;background:var(--bg2,#242424);color:var(--text,#e0e0e0);border:1px solid var(--bdr,#333);border-radius:4px;padding:6px 8px;font-size:12px;cursor:pointer;outline:none;font-family:inherit;margin-bottom:3px;appearance:none;}\n      .ast-select:focus{border-color:var(--acc,#888);}\n      .ast-input{background:var(--bg2,#242424);color:var(--text,#e0e0e0);border:1px solid var(--bdr,#333);border-radius:4px;padding:6px 8px;font-size:12px;outline:none;font-family:inherit;}\n      .ast-input:focus{border-color:var(--acc,#888);}\n      .ast-input::placeholder{color:#555;}\n      .ast-textarea{background:var(--bg2,#242424);color:var(--text,#e0e0e0);border:1px solid var(--bdr,#333);border-radius:4px;padding:8px;font-size:12px;outline:none;font-family:inherit;resize:none;width:100%;box-sizing:border-box;}\n      .ast-textarea:focus{border-color:var(--acc,#888);}\n      .ast-textarea::placeholder{color:#555;}\n      .ast-key-row{display:flex;align-items:center;justify-content:space-between;padding:4px 2px;font-size:12px;margin-bottom:3px;}\n      .ast-key-row span{color:var(--text,#e0e0e0);}\n      .ast-key-capture{background:var(--bg2,#242424);border:1px solid var(--bdr,#333);color:var(--acc,#888);border-radius:4px;padding:4px 10px;font-size:11px;text-align:center;min-width:50px;cursor:pointer;outline:none;font-family:'Consolas',monospace;font-weight:600;}\n      .ast-key-capture:focus{border-color:var(--acc,#888);}\n      .ast-row{display:flex;align-items:center;gap:6px;margin-bottom:4px;}\n      .ast-row .ast-input{flex:1;}\n      .ast-credits{padding-top:8px;font-size:10px;color:#555;line-height:1.5;text-align:center;}\n      .ast-sep{height:1px;background:var(--bdr,#333);margin:6px 0;}\n      .ast-update-list{margin:0;padding-left:16px;font-size:11px;color:var(--text-sec,#888);line-height:1.6;}\n      .ast-update-list li{margin-bottom:4px;}\n      div.sidebar.left>div.ad-block{opacity:0!important;pointer-events:none!important;display:none!important;}\n      div.sidebar.left>a{display:none!important;}\n      div.sidebar.left{max-width:30vw;width:21rem;bottom:0!important;}\n    ";
  document.head.appendChild(styleElement);
}

export { setTheme, initHomeBackground, injectStyles };
