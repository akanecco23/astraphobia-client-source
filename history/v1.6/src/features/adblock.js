import { showToast } from "../ui/interaction.js";

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
  const hideElementsAndAdjustSidebar = () => {
    Selectors.forEach((cssSelector) => {
      document.querySelectorAll(cssSelector).forEach((v24f3TargetElement) => {
        v24f3TargetElement.style.display = "none";
        v24f3TargetElement.style.opacity = "0";
        v24f3TargetElement.style.pointerEvents = "none";
        v24f3TargetElement.style.visibility = "hidden";
        v24f3TargetElement.removeAttribute("src");
        v24f3TargetElement.remove();
      });
    });
    const leftSidebar = document.querySelector("div.sidebar.left");
    if (leftSidebar) {
      leftSidebar.style.maxWidth = "30vw";
      leftSidebar.style.width = "21rem";
      leftSidebar.style.overflow = "hidden";
    }
  };
  hideElementsAndAdjustSidebar();
  new MutationObserver(hideElementsAndAdjustSidebar).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });
  setInterval(hideElementsAndAdjustSidebar, 5000);
  showToast("Ad blocker active");
}

export { initAdBlocker };
