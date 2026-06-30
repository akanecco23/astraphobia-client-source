import { showNotification } from "../ui/interaction.js";
import { state } from "../core.js";

function initAdBlocker() {
  if (state.isProcessed) {
    return;
  }
  state.isProcessed = true;
  const adSelectors = [
    "div.ad-block",
    'a[href*="ad"]',
    'iframe[src*="ads"], iframe[src*="googlead"]',
    ".advertisement",
    '[class*="ads"], [class*="ad-"]',
    '[id*="ad"], [id*="banner"]',
    ".sidebar.left > a",
    ".sidebar.left > div:not(.sidebar-content)",
    "div.sidebar.left > div:has(> iframe)",
    'div.sidebar.left > div:has(> a[href*="doubleclick"])',
  ];
  const cleanupUI = () => {
    adSelectors.forEach((targetSelector) => {
      document.querySelectorAll(targetSelector).forEach((targetElement) => {
        targetElement.style.display = "none";
        targetElement.style.opacity = "0";
        targetElement.style.pointerEvents = "none";
        targetElement.style.visibility = "hidden";
        targetElement.removeAttribute("src");
        targetElement.remove();
      });
    });
    const leftSidebar = document.querySelector("div.sidebar.left");
    if (leftSidebar) {
      leftSidebar.style.maxWidth = "30vw";
      leftSidebar.style.width = "21rem";
      leftSidebar.style.overflow = "hidden";
    }
  };
  cleanupUI();
  new MutationObserver(cleanupUI).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });
  setInterval(cleanupUI, 5000);
  showNotification("Ad blocker active");
}

export { initAdBlocker };
