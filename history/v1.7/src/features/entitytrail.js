import {
  getNearbyEntities,
  getZoomLevel,
  getOrCreateOverlayCanvas,
} from "../utils.js";
import { startEntityTrail, getFirstAnimalPosition, state } from "../core.js";
import { showNotification } from "../ui/interaction.js";
import { refreshUI } from "../ui/panels.js";

function appStopEntityTrail() {
  if (featuresentitytrailState.modEntityTrailInterval) {
    clearInterval(featuresentitytrailState.modEntityTrailInterval);
    featuresentitytrailState.modEntityTrailInterval = null;
  }
}
function toggleEntityTrail() {
  if (window.entityTrailEnabled) {
    window.entityTrailEnabled = false;
    window.entityTrailTargetId = null;
    appStopEntityTrail();
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
function drawEntityTrail(ctx, v1756Canvas, v11d3PlayerPos, zoomScale) {
  if (!window.entityTrailEnabled || window.entityTrailHistory.length < 2) {
    return;
  }
  const v1b16CenterX = v1756Canvas.width / 2;
  const v2368CenterY = v1756Canvas.height / 2;
  const v23e2CurrentTime = Date.now();
  const trailDuration = 30000;
  const { r: colorR, g: colorG, b: colorB } = window.entityTrailColor;
  for (let v89e7I = 1; v89e7I < window.entityTrailHistory.length; v89e7I++) {
    const prevPoint = window.entityTrailHistory[v89e7I - 1];
    const currPoint = window.entityTrailHistory[v89e7I];
    const pointAge = v23e2CurrentTime - currPoint.time;
    const opacity = Math.max(0.05, 1 - pointAge / trailDuration);
    const prevX = v1b16CenterX + (prevPoint.x - v11d3PlayerPos.x) * zoomScale;
    const prevY = v2368CenterY + (prevPoint.y - v11d3PlayerPos.y) * zoomScale;
    const currX = v1b16CenterX + (currPoint.x - v11d3PlayerPos.x) * zoomScale;
    const currY = v2368CenterY + (currPoint.y - v11d3PlayerPos.y) * zoomScale;
    const progress = v89e7I / window.entityTrailHistory.length;
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
    const v3cc1PointAge = v23e2CurrentTime - point.time;
    const v45a9Opacity = Math.max(0.1, 1 - v3cc1PointAge / trailDuration);
    const pointX = v1b16CenterX + (point.x - v11d3PlayerPos.x) * zoomScale;
    const pointY = v2368CenterY + (point.y - v11d3PlayerPos.y) * zoomScale;
    ctx.fillStyle =
      "rgba(" + colorR + "," + colorG + "," + colorB + "," + v45a9Opacity + ")";
    ctx.beginPath();
    ctx.arc(pointX, pointY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (window.entityTrailHistory.length > 0) {
    const lastTrailPoint =
      window.entityTrailHistory[window.entityTrailHistory.length - 1];
    const v597aScreenY =
      v1b16CenterX + (lastTrailPoint.x - v11d3PlayerPos.x) * zoomScale;
    const v597aV597aScreenY =
      v2368CenterY + (lastTrailPoint.y - v11d3PlayerPos.y) * zoomScale;
    ctx.fillStyle = "rgb(" + colorR + "," + colorG + "," + colorB + ")";
    ctx.font = "bold 10px monospace";
    ctx.fillText(
      "TRAIL (" + window.entityTrailHistory.length + " pts)",
      v597aScreenY + 8,
      v597aV597aScreenY - 8,
    );
  }
}
function renderOverlayLoop() {
  const v536aOverlayCanvas = getOrCreateOverlayCanvas("ast-overlay", 999997);
  const v3f1aCtx = v536aOverlayCanvas.getContext("2d");
  v3f1aCtx.clearRect(0, 0, v536aOverlayCanvas.width, v536aOverlayCanvas.height);
  if (window.entityTrailEnabled) {
    const trailData = getFirstAnimalPosition();
    const trailSettings = getZoomLevel();
    if (trailData) {
      drawEntityTrail(v3f1aCtx, v536aOverlayCanvas, trailData, trailSettings);
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

export const featuresentitytrailState = {
  globalEntityTrailInterval: null,
  modEntityTrailInterval: null,
};

export {
  appStopEntityTrail,
  toggleEntityTrail,
  drawEntityTrail,
  renderOverlayLoop,
};
