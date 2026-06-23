import {
  getEntityById,
  calculateDistance,
  getNearbyEntities,
  getZoomLevel,
  getOrCreateOverlayCanvas,
} from "../utils.js";
import { getEntityPosition, getFirstAnimalPosition, state } from "../core.js";
import { showNotification } from "../ui/interaction.js";
import { refreshUI } from "../ui/panels.js";

function startEntityTrail() {
  if (state.trailInterval) {
    clearInterval(state.trailInterval);
    state.trailInterval = null;
  }
  state.trailInterval = setInterval(() => {
    if (!window.entityTrailEnabled || !window.entityTrailTargetId) {
      return;
    }
    const targetEntityId = getEntityById(window.entityTrailTargetId);
    if (!targetEntityId) {
      const gameState = getNearbyEntities();
      if (gameState && gameState.players && gameState.players.length > 0) {
        window.entityTrailTargetId = gameState.players[0].id;
      }
      return;
    }
    const targetEntity = getEntityPosition(targetEntityId);
    if (!targetEntity) {
      return;
    }
    const lastTrailPoint =
      window.entityTrailHistory[window.entityTrailHistory.length - 1];
    if (
      lastTrailPoint &&
      calculateDistance(
        lastTrailPoint.x,
        lastTrailPoint.y,
        targetEntity.x,
        targetEntity.y,
      ) < 5
    ) {
      return;
    }
    window.entityTrailHistory.push({
      x: targetEntity.x,
      y: targetEntity.y,
      time: Date.now(),
    });
    if (window.entityTrailHistory.length > window.entityTrailMaxLength) {
      window.entityTrailHistory.shift();
    }
  }, window.entityTrailRecordInterval);
}
function stopMouseSimulation_2() {
  if (state.trailInterval) {
    clearInterval(state.trailInterval);
    state.trailInterval = null;
  }
}
function toggleEntityTrail() {
  if (window.entityTrailEnabled) {
    window.entityTrailEnabled = false;
    window.entityTrailTargetId = null;
    stopMouseSimulation_2();
    window.entityTrailHistory = [];
    showNotification("Trail stopped");
    refreshUI();
    return;
  }
  const nearbyPlayersData = getNearbyEntities();
  const hasNearbyPlayers =
    nearbyPlayersData &&
    nearbyPlayersData.players &&
    nearbyPlayersData.players.length > 0;
  if (!hasNearbyPlayers) {
    showNotification("No players nearby to trace");
    return;
  }
  const targetPlayerId = nearbyPlayersData.players[0].id;
  const targetPlayerName =
    nearbyPlayersData.players[0].entity?.name || "ID:" + targetPlayerId;
  window.entityTrailEnabled = true;
  window.entityTrailTargetId = targetPlayerId;
  window.entityTrailHistory = [];
  startEntityTrail();
  showNotification("Tracing: " + targetPlayerName);
  refreshUI();
}
function drawEntityTrail(ctx, canvas, playerPos, zoomScale) {
  if (!window.entityTrailEnabled || window.entityTrailHistory.length < 2) {
    return;
  }
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const currentTime = Date.now();
  const trailDuration = 30000;
  const { r: colorR, g: colorG, b: colorB } = window.entityTrailColor;
  for (let i = 1; i < window.entityTrailHistory.length; i++) {
    const prevPoint = window.entityTrailHistory[i - 1];
    const currPoint = window.entityTrailHistory[i];
    const pointAge = currentTime - currPoint.time;
    const opacity = Math.max(0.05, 1 - pointAge / trailDuration);
    const prevX = centerX + (prevPoint.x - playerPos.x) * zoomScale;
    const prevY = centerY + (prevPoint.y - playerPos.y) * zoomScale;
    const currX = centerX + (currPoint.x - playerPos.x) * zoomScale;
    const currY = centerY + (currPoint.y - playerPos.y) * zoomScale;
    const progress = i / window.entityTrailHistory.length;
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(currX, currY);
    ctx.strokeStyle =
      "rgba(" + colorR + "," + colorG + "," + colorB + "," + opacity + ")";
    ctx.lineWidth = 1.5 + progress * 1.5;
    ctx.stroke();
  }
  for (let j = 0; j < window.entityTrailHistory.length; j += 5) {
    const point = window.entityTrailHistory[j];
    const pointAge_2 = currentTime - point.time;
    const opacity_2 = Math.max(0.1, 1 - pointAge_2 / trailDuration);
    const pointX = centerX + (point.x - playerPos.x) * zoomScale;
    const pointY = centerY + (point.y - playerPos.y) * zoomScale;
    ctx.fillStyle =
      "rgba(" + colorR + "," + colorG + "," + colorB + "," + opacity_2 + ")";
    ctx.beginPath();
    ctx.arc(pointX, pointY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (window.entityTrailHistory.length > 0) {
    const lastTrailPoint =
      window.entityTrailHistory[window.entityTrailHistory.length - 1];
    const calculatedX = centerX + (lastTrailPoint.x - playerPos.x) * zoomScale;
    const calculatedY = centerY + (lastTrailPoint.y - playerPos.y) * zoomScale;
    ctx.fillStyle = "rgb(" + colorR + "," + colorG + "," + colorB + ")";
    ctx.font = "bold 10px monospace";
    ctx.fillText(
      "TRAIL (" + window.entityTrailHistory.length + " pts)",
      calculatedX + 8,
      calculatedY - 8,
    );
  }
}
function renderOverlayLoop() {
  const overlayCanvas = getOrCreateOverlayCanvas("ast-overlay", 999997);
  const ctx = overlayCanvas.getContext("2d");
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  if (window.entityTrailEnabled) {
    const trailData = getFirstAnimalPosition();
    const trailSettings = getZoomLevel();
    if (trailData) {
      drawEntityTrail(ctx, overlayCanvas, trailData, trailSettings);
    }
  }
  requestAnimationFrame(renderOverlayLoop);
}
window.entityTrailColor = {
  r: 255,
  g: 150,
  b: 0,
};
window.entityTrailEnabled = false;
window.entityTrailTargetId = null;
window.entityTrailHistory = [];
window.entityTrailMaxLength = 200;
window.entityTrailRecordInterval = 100;
document.addEventListener(
  "keydown",
  (event_3) => {
    if (event_3.target.matches("input,textarea,select,[contenteditable]")) {
      return;
    }
    if (event_3.repeat) {
      return;
    }
    const entityTraceKey = window.entityTraceKey.toLowerCase();
    const lowercaseKey = event_3.key.toLowerCase();
    const lowercaseCode = event_3.code.toLowerCase();
    if (
      lowercaseKey === entityTraceKey ||
      lowercaseCode === entityTraceKey ||
      lowercaseCode === "key" + entityTraceKey
    ) {
      event_3.preventDefault();
      toggleEntityTrail();
    }
  },
  true,
);

export {
  startEntityTrail,
  stopMouseSimulation_2,
  toggleEntityTrail,
  drawEntityTrail,
  renderOverlayLoop,
};
