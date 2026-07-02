import { showNotification } from "../ui/interaction.js";

function initAdBlocker() {
  const Selectors = [
    "div.ad-block",
    'a[href*="ad"]',
    'iframe[src*="ads"], iframe[src*="googlead"]',
    ".advertisement",
    '[class*="ads"], [class*="ad-"]',
    '[id*="ad"], [id*="banner"]',
    ".sidebar.left > a",
    ".sidebar.left > div:not(.sidebar-content)",
    "div.sidebar.left > div:has(> iframe)",
    'div.sidebar.left > div:has(> a[href*="doubleclick"]',
  ];
  const removeAds = () => {
    Selectors.forEach((cssSelector) => {
      document.querySelectorAll(cssSelector).forEach((targetElement) => {
        targetElement.style.display = "none !important";
        targetElement.style.opacity = "0 !important";
        targetElement.style.pointerEvents = "none !important";
        targetElement.style.visibility = "hidden !important";
        targetElement.removeAttribute("src");
        targetElement.remove();
      });
    });
    const leftSidebar = document.querySelector("div.sidebar.left");
    if (leftSidebar) {
      leftSidebar.style.maxWidth = "30vw";
      leftSidebar.style.width = "21rem";
      leftSidebar.style.bottom = "0 !important";
      leftSidebar.style.overflow = "hidden";
    }
  };
  removeAds();
  const mutationObserver = new MutationObserver(removeAds);
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });
  setInterval(removeAds, 5000);
  showNotification("🛡️ Built-in Ad Blocker activated!");
}

export { initAdBlocker };
