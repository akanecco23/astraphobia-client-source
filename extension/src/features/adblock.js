import { showNotification } from "../ui/interaction.js";

let isVideoPlaying = false;
function initAdBlocker() {
  if (isVideoPlaying) {
    return;
  }
  isVideoPlaying = true;
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
  const removeAds = () => {
    adSelectors.forEach((elementSelector) => {
      document.querySelectorAll(elementSelector).forEach((targetElement) => {
        targetElement.style.display = "none";
        targetElement.style.opacity = "0";
        targetElement.style.pointerEvents = "none";
        targetElement.style.visibility = "hidden";
        targetElement.removeAttribute("src");
        targetElement.remove();
      });
    });
    const leftSidebarElement = document.querySelector("div.sidebar.left");
    if (leftSidebarElement) {
      leftSidebarElement.style.maxWidth = "30vw";
      leftSidebarElement.style.width = "21rem";
      leftSidebarElement.style.overflow = "hidden";
    }
  };
  removeAds();
  new MutationObserver(removeAds).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });
  setInterval(removeAds, 5000);
  showNotification("Ad blocker active");
}

export { initAdBlocker };
