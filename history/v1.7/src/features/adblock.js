import { showNotification } from "../ui/interaction.js";

let IsProcessed = false;
function initAdBlocker() {
  if (IsProcessed) {
    return;
  }
  IsProcessed = true;
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
    'div.sidebar.left > div:has(> a[href*="doubleclick"])',
  ];
  const cleanupUI = () => {
    Selectors.forEach((targetSelector) => {
      document
        .querySelectorAll(targetSelector)
        .forEach((v332bTargetElement) => {
          v332bTargetElement.style.display = "none";
          v332bTargetElement.style.opacity = "0";
          v332bTargetElement.style.pointerEvents = "none";
          v332bTargetElement.style.visibility = "hidden";
          v332bTargetElement.removeAttribute("src");
          v332bTargetElement.remove();
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
