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

export { initBackgroundImage, setTheme };
