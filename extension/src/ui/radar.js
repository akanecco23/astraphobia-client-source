import { dragState, state } from '../core.js';

function getGameCanvas() {
  return document.querySelector("#gameCanvas") || document.querySelector("canvas") || document.querySelector("#canvas-container canvas");
}
function updateLockButtonUI() {
  const lockButton = document.getElementById("lockBtn");
  if (lockButton) {
    lockButton.textContent = window.lockEnabled && window.lockTargetId ? "Unlock" : "Lock Nearest";
    lockButton.classList.toggle("toggle-on", !!window.lockEnabled && !!window.lockTargetId);
  }
}
function getOrCreateCanvas(canvasId, zIndex) {
  let canvasElement = document.getElementById(canvasId);
  if (!canvasElement) {
    canvasElement = document.createElement("canvas");
    canvasElement.id = canvasId;
    canvasElement.style.cssText = "position:fixed;top:0;left:0;pointer-events:none;z-index:" + zIndex + ";";
    document.body.appendChild(canvasElement);
  }
  const gameViewport = getGameCanvas();
  if (gameViewport) {
    const rect = gameViewport.getBoundingClientRect();
    if (canvasElement.width !== rect.width || canvasElement.height !== rect.height) {
      canvasElement.width = rect.width;
      canvasElement.height = rect.height;
    }
    canvasElement.style.left = rect.left + "px";
    canvasElement.style.top = rect.top + "px";
    canvasElement.style.width = rect.width + "px";
    canvasElement.style.height = rect.height + "px";
  } else if (canvasElement.width !== window.innerWidth || canvasElement.height !== window.innerHeight) {
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
  }
  return canvasElement;
}
function initRadarDrag() {
  if (window._radarDragInit) {
    return;
  }
  window._radarDragInit = true;
  document.addEventListener("mousedown", updateRadarBounds => {
    const radarBounds = window._radarBounds;
    if (!radarBounds || !window.espEnabled) {
      return;
    }
    if (updateRadarBounds.clientX >= radarBounds.x && updateRadarBounds.clientX <= radarBounds.x + radarBounds.w && updateRadarBounds.clientY >= radarBounds.y && updateRadarBounds.clientY <= radarBounds.y + radarBounds.h) {
      dragState.dragging = true;
      dragState.offsetX = updateRadarBounds.clientX - radarBounds.x;
      dragState.offsetY = updateRadarBounds.clientY - radarBounds.y;
      updateRadarBounds.preventDefault();
      updateRadarBounds.stopPropagation();
    }
  }, true);
  document.addEventListener("mousemove", mouseMoveEvent => {
    if (!dragState.dragging) {
      return;
    }
    dragState.x = mouseMoveEvent.clientX - dragState.offsetX;
    dragState.y = mouseMoveEvent.clientY - dragState.offsetY;
    mouseMoveEvent.preventDefault();
  }, true);
  document.addEventListener("mouseup", mouseUpEvent => {
    if (dragState.dragging) {
      dragState.dragging = false;
      mouseUpEvent.preventDefault();
    }
  }, true);
}

export { getGameCanvas, updateLockButtonUI, getOrCreateCanvas, initRadarDrag };
