import {
  extractPosition,
  calculateDistance,
  buildEntityState,
} from "./movement.js";
import { showNotification } from "../ui/interaction.js";
import { findEntityById } from "./autofarm.js";
import { refreshUI } from "./esp.js";
import { state } from "../core.js";

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
window.entityTraceKey = "h";

let trailIntervalId = null;
function startEntityTrailTracking() {
  if (trailIntervalId) {
    clearInterval(trailIntervalId);
    trailIntervalId = null;
  }
  trailIntervalId = setInterval(() => {
    if (!window.entityTrailEnabled || !window.entityTrailTargetId) {
      return;
    }
    const targetEntityId = findEntityById(window.entityTrailTargetId);
    if (!targetEntityId) {
      const gameState = buildEntityState();
      if (gameState && gameState.players && gameState.players.length > 0) {
        window.entityTrailTargetId = gameState.players[0].id;
      }
      return;
    }
    const targetEntityPosition = extractPosition(targetEntityId);
    if (!targetEntityPosition) {
      return;
    }
    const lastTrailPoint =
      window.entityTrailHistory[window.entityTrailHistory.length - 1];
    if (
      lastTrailPoint &&
      calculateDistance(
        lastTrailPoint.x,
        lastTrailPoint.y,
        targetEntityPosition.x,
        targetEntityPosition.y,
      ) < 5
    ) {
      return;
    }
    window.entityTrailHistory.push({
      x: targetEntityPosition.x,
      y: targetEntityPosition.y,
      time: Date.now(),
    });
    if (window.entityTrailHistory.length > window.entityTrailMaxLength) {
      window.entityTrailHistory.shift();
    }
  }, window.entityTrailRecordInterval);
}
function stopEntityTrailTracking() {
  if (trailIntervalId) {
    clearInterval(trailIntervalId);
    trailIntervalId = null;
  }
}
function toggleEntityTrail() {
  if (window.entityTrailEnabled) {
    window.entityTrailEnabled = false;
    window.entityTrailTargetId = null;
    stopEntityTrailTracking();
    window.entityTrailHistory = [];
    showNotification("Trail stopped");
    refreshUI();
    return;
  }
  const playerData = buildEntityState();
  const hasNearbyPlayers =
    playerData && playerData.players && playerData.players.length > 0;
  if (!hasNearbyPlayers) {
    showNotification("No players nearby to trace");
    return;
  }
  const targetPlayerId = playerData.players[0].id;
  const targetPlayerName =
    playerData.players[0].entity?.name || "ID:" + targetPlayerId;
  window.entityTrailEnabled = true;
  window.entityTrailTargetId = targetPlayerId;
  window.entityTrailHistory = [];
  startEntityTrailTracking();
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
  const { r: red, g: green, b: blue } = window.entityTrailColor;
  for (let i = 1; i < window.entityTrailHistory.length; i++) {
    const prevPoint = window.entityTrailHistory[i - 1];
    const currPoint = window.entityTrailHistory[i];
    const age = state.currentTime - currPoint.time;
    const opacity = Math.max(0.05, 1 - age / trailDuration);
    const startX = centerX + (prevPoint.x - playerPos.x) * zoomScale;
    const startY = centerY + (prevPoint.y - playerPos.y) * zoomScale;
    const endX = centerX + (currPoint.x - playerPos.x) * zoomScale;
    const endY = centerY + (currPoint.y - playerPos.y) * zoomScale;
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
    const historyPoint = window.entityTrailHistory[j];
    const pointAge = state.currentTime - historyPoint.time;
    const pointOpacity = Math.max(0.1, 1 - pointAge / trailDuration);
    const pointX = centerX + (historyPoint.x - playerPos.x) * zoomScale;
    const pointY = centerY + (historyPoint.y - playerPos.y) * zoomScale;
    ctx.fillStyle =
      "rgba(" + red + "," + green + "," + blue + "," + pointOpacity + ")";
    ctx.beginPath();
    ctx.arc(pointX, pointY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (window.entityTrailHistory.length > 0) {
    const lastTrailPosition =
      window.entityTrailHistory[window.entityTrailHistory.length - 1];
    const calculatedXOffset =
      centerX + (lastTrailPosition.x - playerPos.x) * zoomScale;
    const calculatedYOffset =
      centerY + (lastTrailPosition.y - playerPos.y) * zoomScale;
    ctx.fillStyle = "rgb(" + red + "," + green + "," + blue + ")";
    ctx.font = "bold 10px monospace";
    ctx.fillText(
      "TRAIL (" + window.entityTrailHistory.length + " pts)",
      calculatedXOffset + 8,
      calculatedYOffset - 8,
    );
  }
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
  (inputEvent_3) => {
    if (
      inputEvent_3.target.matches("input,textarea,select,[contenteditable]")
    ) {
      return;
    }
    if (inputEvent_3.repeat) {
      return;
    }
    const entityTraceKey = window.entityTraceKey.toLowerCase();
    const itemKey = inputEvent_3.key.toLowerCase();
    const itemCode = inputEvent_3.code.toLowerCase();
    if (
      itemKey === entityTraceKey ||
      itemCode === entityTraceKey ||
      itemCode === "key" + entityTraceKey
    ) {
      inputEvent_3.preventDefault();
      toggleEntityTrail();
    }
  },
  true,
);

export {
  startEntityTrailTracking,
  stopEntityTrailTracking,
  toggleEntityTrail,
  drawEntityTrail,
};
