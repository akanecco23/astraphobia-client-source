import {
  createUpdateHistoryStyles,
  injectDeepToolsStyles,
  injectPlusPanelStyles,
  injectSettingsPanelStyles,
} from "./panels.js";
import { initAdBlocker } from "../features/adblock.js";

function applyHomeBackground() {
  const storedBgUrl = localStorage.getItem("bgUrl") || "";
  if (storedBgUrl === "") {
    return;
  }
  let homeBgElement = document.querySelector(".home-bg");
  const setHomeBackgroundImage = () => {
    homeBgElement = document.querySelector(".home-bg");
    if (homeBgElement) {
      homeBgElement.style.setProperty(
        "background-image",
        'url("' + storedBgUrl + '")',
        "important",
      );
    }
  };
  if (!homeBgElement) {
    const bgCheckInterval = setInterval(() => {
      homeBgElement = document.querySelector(".home-bg");
      if (homeBgElement != null) {
        clearInterval(bgCheckInterval);
        setHomeBackgroundImage();
      }
    }, 100);
  } else {
    setHomeBackgroundImage();
  }
}
function applyThemeColors(themeName) {
  const rootElement = document.documentElement;
  const themeConfig = {
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
    pink: {
      "--bg-primary": "rgba(35, 15, 35, 0.95)",
      "--bg-secondary": "rgba(65, 45, 65, 0.8)",
      "--text-primary": "#ffffff",
      "--text-secondary": "#ffb3d9",
      "--accent": "#ff69b4",
      "--accent-hover": "#ffffff",
      "--border": "rgba(255, 105, 180, 0.2)",
      "--accent-rgb": "255, 105, 180",
      "--hover-bg": "rgba(85, 65, 85, 1)",
      "--shadow": "0 8px 32px rgba(0, 0, 0, 0.3)",
      "--shadow-hover": "0 12px 40px rgba(0, 0, 0, 0.4)",
    },
    starwars: {
      "--bg-primary": "rgba(0, 0, 0, 0.95)",
      "--bg-secondary": "rgba(50, 50, 50, 0.8)",
      "--text-primary": "#FFFF00",
      "--text-secondary": "#CCCC00",
      "--accent": "#FFD700",
      "--accent-hover": "#FFFFFF",
      "--border": "rgba(255, 215, 0, 0.2)",
      "--accent-rgb": "255, 215, 0",
      "--hover-bg": "rgba(80, 80, 80, 1)",
      "--shadow": "0 8px 32px rgba(0, 0, 0, 0.3)",
      "--shadow-hover": "0 12px 40px rgba(0, 0, 0, 0.4)",
    },
    kfc: {
      "--bg-primary": "rgba(0, 0, 0, 0.92)",
      "--bg-secondary": "rgba(30, 30, 30, 0.85)",
      "--text-primary": "#ffffff",
      "--text-secondary": "#ffcc00",
      "--accent": "#f40000",
      "--accent-hover": "#ffffff",
      "--border": "rgba(244, 0, 0, 0.3)",
      "--accent-rgb": "244, 0, 0",
      "--hover-bg": "rgba(50, 0, 0, 1)",
      "--shadow": "0 8px 32px rgba(0, 0, 0, 0.4)",
      "--shadow-hover": "0 12px 40px rgba(244, 0, 0, 0.3)",
    },
    halloween: {
      "--bg-primary": "rgba(13, 0, 13, 0.95)",
      "--bg-secondary": "rgba(43, 20, 43, 0.8)",
      "--text-primary": "#ffffff",
      "--text-secondary": "#ffcc99",
      "--accent": "#ff6600",
      "--accent-hover": "#ffffff",
      "--border": "rgba(255, 102, 0, 0.2)",
      "--accent-rgb": "255, 102, 0",
      "--hover-bg": "rgba(63, 40, 63, 1)",
      "--shadow": "0 8px 32px rgba(0, 0, 0, 0.3)",
      "--shadow-hover": "0 12px 40px rgba(0, 0, 0, 0.4)",
    },
  };
  const myY = themeConfig[themeName] || themeConfig.blue;
  Object.entries(myY).forEach(([cssProperty, cssValue]) => {
    rootElement.style.setProperty(cssProperty, cssValue);
  });
  localStorage.setItem("theme", themeName);
  const toolPanels = document.querySelectorAll(
    "#deep-tools-panel, #plus-panel, #settings-panel, #update-history",
  );
  toolPanels.forEach((themeElement) => {
    themeElement.className =
      themeElement.className.replace(/theme\w+/, "") + (" theme" + themeName);
  });
  const limitedEditionElement = document.getElementById("limitedEdition");
  if (limitedEditionElement) {
    limitedEditionElement.style.display =
      themeName === "halloween" ? "block" : "none";
  }
  if (themeName === "halloween") {
    toolPanels.forEach((containerElement) => {
      containerElement
        .querySelectorAll(".bat")
        .forEach((element) => element.remove());
      for (let i = 0; i < 3; i++) {
        const spanElement = document.createElement("span");
        spanElement.className = "bat";
        spanElement.textContent = "🦇";
        containerElement.appendChild(spanElement);
      }
    });
  } else {
    document
      .querySelectorAll(".bat")
      .forEach((elementToRemove) => elementToRemove.remove());
  }
}
function setBlueTheme() {
  setTimeout(() => {
    localStorage.setItem("theme", "blue");
    const initialValue = injectDeepToolsStyles();
    const sessionData = createUpdateHistoryStyles();
    const configSettings = injectSettingsPanelStyles();
    const appContext = injectPlusPanelStyles();
    applyThemeColors("blue");
    applyHomeBackground();
    initAdBlocker();
  }, 1000);
  return {
    mainPanel: null,
    historyPanel: null,
    settingsPanel: null,
    plusPanel: null,
  };
}

export { applyHomeBackground, applyThemeColors, setBlueTheme };
