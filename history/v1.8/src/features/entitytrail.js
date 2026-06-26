import {
  getNearbyEntities,
  getZoomScale,
  getOrCreateOverlayCanvas,
} from "../utils.js";
import { startEntityTrail, getFirstAnimalPosition, state } from "../core.js";
import { showNotification } from "../ui/interaction.js";
import { refreshUI } from "../ui/panels.js";

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
function drawEntityTrail(ctx, canvas, originPos, zoomScale) {
  if (!window.entityTrailEnabled || window.entityTrailHistory.length < 2) {
    return;
  }
  const halfWidth = canvas.width / 2;
  const halfHeight = canvas.height / 2;
  const currentTime = Date.now();
  const trailDuration = 30000;
  const { r: red, g: green, b: blue } = window.entityTrailColor;
  for (let i = 1; i < window.entityTrailHistory.length; i++) {
    const prevPoint = window.entityTrailHistory[i - 1];
    const currPoint = window.entityTrailHistory[i];
    const age = currentTime - currPoint.time;
    const opacity = Math.max(0.05, 1 - age / trailDuration);
    const startX = halfWidth + (prevPoint.x - originPos.x) * zoomScale;
    const startY = halfHeight + (prevPoint.y - originPos.y) * zoomScale;
    const endX = halfWidth + (currPoint.x - originPos.x) * zoomScale;
    const endY = halfHeight + (currPoint.y - originPos.y) * zoomScale;
    const progress = i / window.entityTrailHistory.length;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle =
      "rgba(" + red + "," + green + "," + blue + "," + opacity + ")";
    ctx.lineWidth = 1.5 + progress * 1.5;
    ctx.stroke();
  }
  for (let j = 0; j < window.entityTrailHistory.length; j += 5) {
    const point = window.entityTrailHistory[j];
    const pointAge = currentTime - point.time;
    const pointOpacity = Math.max(0.1, 1 - pointAge / trailDuration);
    const pointX = halfWidth + (point.x - originPos.x) * zoomScale;
    const pointY = halfHeight + (point.y - originPos.y) * zoomScale;
    ctx.fillStyle =
      "rgba(" + red + "," + green + "," + blue + "," + pointOpacity + ")";
    ctx.beginPath();
    ctx.arc(pointX, pointY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (window.entityTrailHistory.length > 0) {
    const lastTrailPosition =
      window.entityTrailHistory[window.entityTrailHistory.length - 1];
    const projectedX =
      halfWidth + (lastTrailPosition.x - originPos.x) * zoomScale;
    const projectedY =
      halfHeight + (lastTrailPosition.y - originPos.y) * zoomScale;
    ctx.fillStyle = "rgb(" + red + "," + green + "," + blue + ")";
    ctx.font = "bold 10px monospace";
    ctx.fillText(
      "TRAIL (" + window.entityTrailHistory.length + " pts)",
      projectedX + 8,
      projectedY - 8,
    );
  }
}
function renderOverlay() {
  const overlayCanvas = getOrCreateOverlayCanvas("ast-overlay", 999997);
  const overlayCtx = overlayCanvas.getContext("2d");
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  const entityData = getFirstAnimalPosition();
  if (entityData && window.entityTrailEnabled) {
    drawEntityTrail(overlayCtx, overlayCanvas, entityData, getZoomScale());
  }
  requestAnimationFrame(renderOverlay);
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

export {
  stopMouseSimulation_2,
  toggleEntityTrail,
  drawEntityTrail,
  renderOverlay,
};
