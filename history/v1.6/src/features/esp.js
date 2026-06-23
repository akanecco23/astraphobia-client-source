import {
  getGameCanvas,
  isPlayer,
  calculateDistance,
  getNearbyEntities,
  getZoomLevel,
} from "../utils.js";
import {
  getEntityPosition,
  calculateDirection,
  findEntityById,
  getFirstAnimalPosition,
  coreSharedState,
} from "../core.js";
import { drawRadar } from "../ui/radar.js";
import { showToast } from "../ui/interaction.js";

window.espEnabled = false;
window.espTrackedEntityId = null;
window.espMode = "players";

function createEspOverlay() {
  let overlayCanvas = document.getElementById("esp-overlay");
  if (!overlayCanvas) {
    overlayCanvas = document.createElement("canvas");
    overlayCanvas.id = "esp-overlay";
    overlayCanvas.style.cssText =
      "position:fixed;top:0;left:0;pointer-events:none;z-index:999998;";
    document.body.appendChild(overlayCanvas);
  }
  const canvas = getGameCanvas();
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    overlayCanvas.width = rect.width;
    overlayCanvas.height = rect.height;
    overlayCanvas.style.left = rect.left + "px";
    overlayCanvas.style.top = rect.top + "px";
    overlayCanvas.style.width = rect.width + "px";
    overlayCanvas.style.height = rect.height + "px";
  } else {
    overlayCanvas.width = window.innerWidth;
    overlayCanvas.height = window.innerHeight;
  }
  return overlayCanvas;
}
function drawEsp(ctx, gameState, offsetX, offsetY, scale) {
  if (!gameState || gameState.error) {
    return;
  }
  const myPos = gameState.myPos;
  const espMode = window.espMode;
  const trackedEntityId = window.espTrackedEntityId;
  let entities =
    espMode === "players" ? gameState.players || [] : gameState.food || [];
  entities.forEach((targetEntity) => {
    const deltaX = targetEntity.x - myPos.x;
    const deltaY = targetEntity.y - myPos.y;
    const screenX = offsetX + deltaX * scale;
    const screenY = offsetY + deltaY * scale;
    const isSelected = trackedEntityId && targetEntity.id === trackedEntityId;
    const markerSize = 20;
    let markerColor;
    if (espMode === "players") {
      markerColor = isSelected
        ? "#ff00ff"
        : targetEntity.distance < 500
          ? "#ff0000"
          : targetEntity.distance < 1500
            ? "#ffff00"
            : targetEntity.distance < 3000
              ? "#00ffff"
              : "#00ff00";
      ctx.strokeStyle = markerColor;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(
        screenX - markerSize / 2,
        screenY - markerSize / 2,
        markerSize,
        markerSize,
      );
      ctx.fillStyle = markerColor;
      ctx.font = "bold 11px monospace";
      const entityLabel = targetEntity.entity?.name || "ID:" + targetEntity.id;
      ctx.fillText(
        entityLabel,
        screenX - markerSize / 2,
        screenY - markerSize / 2 - 8,
      );
      ctx.font = "10px monospace";
      ctx.fillText(
        Math.round(targetEntity.distance).toString(),
        screenX - markerSize / 2,
        screenY + markerSize / 2 + 13,
      );
      if (targetEntity.entity?.visibleFishLevel != null) {
        ctx.fillText(
          "Lvl:" + targetEntity.entity.visibleFishLevel,
          screenX - markerSize / 2,
          screenY + markerSize / 2 + 24,
        );
      }
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      ctx.lineTo(screenX, screenY);
      ctx.strokeStyle = markerColor;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      markerColor =
        targetEntity.distance < 300
          ? "#00ff00"
          : targetEntity.distance < 1000
            ? "#88ff88"
            : "#44cc44";
      ctx.strokeStyle = markerColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        screenX - markerSize / 2,
        screenY - markerSize / 2,
        markerSize,
        markerSize,
      );
      if (targetEntity.distance < 1000) {
        ctx.fillStyle = markerColor;
        ctx.font = "9px monospace";
        ctx.fillText(
          Math.round(targetEntity.distance).toString(),
          screenX + markerSize / 2 + 3,
          screenY + 3,
        );
      }
    }
  });
}
function drawTrackedEntity(ctx, canvas, myPos, scale) {
  if (!window.espTrackedEntityId) {
    return;
  }
  const trackedEntity = findEntityById(window.espTrackedEntityId);
  if (!trackedEntity) {
    return;
  }
  if (!isPlayer(trackedEntity)) {
    window.espTrackedEntityId = null;
    return;
  }
  const entityPos = getEntityPosition(trackedEntity);
  if (!entityPos || !myPos) {
    return;
  }
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const diffX = entityPos.x - myPos.x;
  const diffY = entityPos.y - myPos.y;
  const screenX = centerX + diffX * scale;
  const screenY = centerY + diffY * scale;
  const distance = calculateDistance(
    myPos.x,
    myPos.y,
    entityPos.x,
    entityPos.y,
  );
  const entityDir = calculateDirection(trackedEntity);
  const pulseAlpha = Math.sin(Date.now() / 200) * 0.3 + 0.7;
  const boxSize = 40;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(screenX, screenY);
  ctx.strokeStyle = "rgba(255,0,255,0.6)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(255,0,255," + pulseAlpha + ")";
  ctx.lineWidth = 3;
  ctx.strokeRect(
    screenX - boxSize / 2,
    screenY - boxSize / 2,
    boxSize,
    boxSize,
  );
  ctx.beginPath();
  ctx.moveTo(screenX - boxSize, screenY);
  ctx.lineTo(screenX + boxSize, screenY);
  ctx.moveTo(screenX, screenY - boxSize);
  ctx.lineTo(screenX, screenY + boxSize);
  ctx.strokeStyle = "rgba(255,0,255,0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();
  const dirLineLength = 50;
  ctx.beginPath();
  ctx.moveTo(screenX, screenY);
  ctx.lineTo(
    screenX + entityDir.dirX * dirLineLength,
    screenY + entityDir.dirY * dirLineLength,
  );
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 2;
  ctx.stroke();
  const offsetDistance = 10;
  const entityAngle = Math.atan2(entityDir.dirY, entityDir.dirX);
  ctx.beginPath();
  ctx.moveTo(
    screenX + entityDir.dirX * dirLineLength,
    screenY + entityDir.dirY * dirLineLength,
  );
  ctx.lineTo(
    screenX +
      entityDir.dirX * dirLineLength -
      offsetDistance * Math.cos(entityAngle - 0.4),
    screenY +
      entityDir.dirY * dirLineLength -
      offsetDistance * Math.sin(entityAngle - 0.4),
  );
  ctx.moveTo(
    screenX + entityDir.dirX * dirLineLength,
    screenY + entityDir.dirY * dirLineLength,
  );
  ctx.lineTo(
    screenX +
      entityDir.dirX * dirLineLength -
      offsetDistance * Math.cos(entityAngle + 0.4),
    screenY +
      entityDir.dirY * dirLineLength -
      offsetDistance * Math.sin(entityAngle + 0.4),
  );
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 2;
  ctx.stroke();
  const boxWidth = 180;
  const boxHeight = 70;
  const boxX = Math.min(
    screenX + boxSize / 2 + 10,
    canvas.width - boxWidth - 5,
  );
  const boxY = Math.max(
    5,
    Math.min(screenY - boxHeight / 2, canvas.height - boxHeight - 5),
  );
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.strokeStyle = "rgba(255,0,255," + pulseAlpha + ")";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ff00ff";
  ctx.font = "bold 12px monospace";
  ctx.fillText("TRACKING", boxX + 8, boxY + 18);
  ctx.fillStyle = "#ffffff";
  ctx.font = "11px monospace";
  const entityName = (
    trackedEntity.name || "Entity " + window.espTrackedEntityId
  ).substring(0, 18);
  ctx.fillText(entityName, boxX + 8, boxY + 34);
  ctx.fillStyle = "#ff00ff";
  ctx.font = "bold 14px monospace";
  ctx.fillText(Math.round(distance) + " units", boxX + 8, boxY + 52);
  if (
    screenX < 0 ||
    screenX > canvas.width ||
    screenY < 0 ||
    screenY > canvas.height
  ) {
    const targetAngle = Math.atan2(screenY - centerY, screenX - centerX);
    const targetX = centerX + Math.cos(targetAngle) * (canvas.width / 2 - 40);
    const targetY = centerY + Math.sin(targetAngle) * (canvas.height / 2 - 40);
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.beginPath();
    ctx.roundRect(targetX - 40, targetY - 15, 80, 30, 4);
    ctx.fill();
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(
      targetX + Math.cos(targetAngle) * 20,
      targetY + Math.sin(targetAngle) * 20,
    );
    ctx.lineTo(
      targetX - Math.cos(targetAngle - 0.5) * 10,
      targetY - Math.sin(targetAngle - 0.5) * 10,
    );
    ctx.lineTo(
      targetX - Math.cos(targetAngle + 0.5) * 10,
      targetY - Math.sin(targetAngle + 0.5) * 10,
    );
    ctx.closePath();
    ctx.fillStyle = "#ff00ff";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(Math.round(distance).toString(), targetX, targetY + 4);
    ctx.textAlign = "left";
  }
}
function renderEspLoop() {
  if (!window.espEnabled) {
    const overlayCanvas = document.getElementById("esp-overlay");
    if (overlayCanvas) {
      const overlayCtx = overlayCanvas.getContext("2d");
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
    requestAnimationFrame(renderEspLoop);
    return;
  }
  const espCanvas = createEspOverlay();
  const ctx = espCanvas.getContext("2d");
  ctx.clearRect(0, 0, espCanvas.width, espCanvas.height);
  const entities = getNearbyEntities();
  const playerData = getFirstAnimalPosition();
  const renderScale = getZoomLevel();
  const centerX = espCanvas.width / 2;
  const centerY = espCanvas.height / 2;
  drawEsp(ctx, entities, centerX, centerY, renderScale);
  drawTrackedEntity(ctx, espCanvas, coreSharedState.playerData, renderScale);
  drawRadar(ctx, espCanvas, entities);
  requestAnimationFrame(renderEspLoop);
}
function clearTracking() {
  window.espEnabled = !window.espEnabled;
  showToast(window.espEnabled ? "ESP enabled" : "ESP disabled");
}
function trackPlayer() {
  const gameData = getNearbyEntities();
  if (gameData && gameData.players && gameData.players.length > 0) {
    window.espTrackedEntityId = gameData.players[0].id;
    showToast(
      "Tracking: " +
        (gameData.players[0].entity?.name || window.espTrackedEntityId),
    );
  } else {
    showToast("No players nearby");
  }
}
function toggleMinimapSize() {
  if (!coreSharedState.playerData || !coreSharedState.playerData.minimap) {
    showToast("Minimap not available");
    return;
  }
  if (coreSharedState.isToggled) {
    coreSharedState.playerData.minimap.scale.set(1);
    coreSharedState.playerData.minimap.pivot.set(0, 0);
    coreSharedState.isToggled = false;
    showToast("Minimap restored");
  } else {
    coreSharedState.playerData.minimap.scale.set(0.5);
    coreSharedState.playerData.minimap.pivot.set(-70, -45);
    coreSharedState.isToggled = true;
    showToast("Small minimap enabled");
  }
}

export {
  createEspOverlay,
  drawEsp,
  drawTrackedEntity,
  renderEspLoop,
  clearTracking,
  trackPlayer,
  toggleMinimapSize,
};
