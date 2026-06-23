import {
  getEntityPosition,
  findEntityById,
  getGameState_2,
  currentTime,
  state,
} from "../core.js";
import { calculateDistance } from "../utils.js";
import { showNotification } from "../ui/interaction.js";
import { refreshUI } from "../ui/panels.js";

function startEntityTrail() {
  if (state.entityTrailInterval) {
    clearInterval(state.entityTrailInterval);
    state.entityTrailInterval = null;
  }
  state.entityTrailInterval = setInterval(() => {
    if (!window.entityTrailEnabled || !window.entityTrailTargetId) {
      return;
    }
    const targetEntityId = findEntityById(window.entityTrailTargetId);
    if (!targetEntityId) {
      const gameState = getGameState_2();
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
function stopEntityTrail() {
  if (state.entityTrailInterval) {
    clearInterval(state.entityTrailInterval);
    state.entityTrailInterval = null;
  }
}
function toggleEntityTrail() {
  if (window.entityTrailEnabled) {
    window.entityTrailEnabled = false;
    window.entityTrailTargetId = null;
    stopEntityTrail();
    window.entityTrailHistory = [];
    showNotification("Trail stopped");
    refreshUI();
    return;
  }
  const nearbyPlayersData = getGameState_2();
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
function drawEntityTrail(ctx, canvas, playerPos, scale) {
  if (!window.entityTrailEnabled || window.entityTrailHistory.length < 2) {
    return;
  }
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const currentTime = Date.now();
  const trailLifetime = 30000;
  const { r: red, g: green, b: blue } = window.entityTrailColor;
  for (let i = 1; i < window.entityTrailHistory.length; i++) {
    const prevPoint = window.entityTrailHistory[i - 1];
    const currPoint = window.entityTrailHistory[i];
    const segmentAge = currentTime - currPoint.time;
    const opacity = Math.max(0.05, 1 - segmentAge / trailLifetime);
    const startX = centerX + (prevPoint.x - playerPos.x) * scale;
    const startY = centerY + (prevPoint.y - playerPos.y) * scale;
    const endX = centerX + (currPoint.x - playerPos.x) * scale;
    const endY = centerY + (currPoint.y - playerPos.y) * scale;
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
    const pointOpacity = Math.max(0.1, 1 - pointAge / trailLifetime);
    const pointX = centerX + (point.x - playerPos.x) * scale;
    const pointY = centerY + (point.y - playerPos.y) * scale;
    ctx.fillStyle =
      "rgba(" + red + "," + green + "," + blue + "," + pointOpacity + ")";
    ctx.beginPath();
    ctx.arc(pointX, pointY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (window.entityTrailHistory.length > 0) {
    const lastTrailPoint =
      window.entityTrailHistory[window.entityTrailHistory.length - 1];
    const screenX = centerX + (lastTrailPoint.x - playerPos.x) * scale;
    const screenY = centerY + (lastTrailPoint.y - playerPos.y) * scale;
    ctx.fillStyle = "rgb(" + red + "," + green + "," + blue + ")";
    ctx.font = "bold 10px monospace";
    ctx.fillText(
      "TRAIL (" + window.entityTrailHistory.length + " pts)",
      screenX + 8,
      screenY - 8,
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
  (event_3) => {
    if (event_3.target.matches("input,textarea,select,[contenteditable]")) {
      return;
    }
    if (event_3.repeat) {
      return;
    }
    const entityTraceKey = window.entityTraceKey.toLowerCase();
    const entityKey = event_3.key.toLowerCase();
    const entityCode = event_3.code.toLowerCase();
    if (
      entityKey === entityTraceKey ||
      entityCode === entityTraceKey ||
      entityCode === "key" + entityTraceKey
    ) {
      event_3.preventDefault();
      toggleEntityTrail();
    }
  },
  true,
);

export {
  startEntityTrail,
  stopEntityTrail,
  toggleEntityTrail,
  drawEntityTrail,
};
