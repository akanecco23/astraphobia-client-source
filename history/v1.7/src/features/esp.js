import {
  isPlayer,
  getEntityById,
  calculateDistance,
  getNearbyEntities,
  getZoomLevel,
  getOrCreateOverlayCanvas,
} from "../utils.js";
import {
  getEntityPosition,
  calculateDirection,
  getFirstAnimalPosition,
  state,
} from "../core.js";
import { drawRadar } from "../ui/radar.js";
import { showNotification } from "../ui/interaction.js";

window.espEnabled = false;
window.espColors = {
  close: "#ff0000",
  medium: "#ffff00",
  far: "#00ffff",
  veryFar: "#00ff00",
  tracked: "#ff00ff",
  foodClose: "#00ff00",
  foodMedium: "#88ff88",
  foodFar: "#44cc44",
};
window.espTrackedEntityId = null;
window.espMode = "players";

function drawEspEntities(ctx, gameState, offsetX, offsetY, scale) {
  if (!gameState || gameState.error) {
    return;
  }
  const myPos = gameState.myPos;
  const espMode = window.espMode;
  const trackedEntityId = window.espTrackedEntityId;
  let entities =
    espMode === "players" ? gameState.players || [] : gameState.food || [];
  entities.forEach((entity) => {
    const deltaX = entity.x - myPos.x;
    const deltaY = entity.y - myPos.y;
    const screenX = offsetX + deltaX * scale;
    const screenY = offsetY + deltaY * scale;
    const isTracked = trackedEntityId && entity.id === trackedEntityId;
    const boxSize = 20;
    let entityColor;
    if (espMode === "players") {
      entityColor = isTracked
        ? window.espColors.tracked
        : entity.distance < 500
          ? window.espColors.close
          : entity.distance < 1500
            ? window.espColors.medium
            : entity.distance < 3000
              ? window.espColors.far
              : window.espColors.veryFar;
      ctx.strokeStyle = entityColor;
      ctx.lineWidth = isTracked ? 3 : 2;
      ctx.strokeRect(
        screenX - boxSize / 2,
        screenY - boxSize / 2,
        boxSize,
        boxSize,
      );
      ctx.fillStyle = entityColor;
      ctx.font = "bold 11px monospace";
      ctx.fillText(
        entity.entity?.name || "ID:" + entity.id,
        screenX - boxSize / 2,
        screenY - boxSize / 2 - 8,
      );
      ctx.font = "10px monospace";
      ctx.fillText(
        Math.round(entity.distance).toString(),
        screenX - boxSize / 2,
        screenY + boxSize / 2 + 13,
      );
      if (entity.entity?.visibleFishLevel != null) {
        ctx.fillText(
          "Lvl:" + entity.entity.visibleFishLevel,
          screenX - boxSize / 2,
          screenY + boxSize / 2 + 24,
        );
      }
      if (window.lockEnabled && window.lockTargetId === entity.id) {
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 2;
        const drawOffset = 15;
        ctx.beginPath();
        ctx.moveTo(screenX - drawOffset, screenY);
        ctx.lineTo(screenX + drawOffset, screenY);
        ctx.moveTo(screenX, screenY - drawOffset);
        ctx.lineTo(screenX, screenY + drawOffset);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(screenX, screenY, drawOffset, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,0,0,0.7)";
        ctx.stroke();
        ctx.fillStyle = "#ff0000";
        ctx.font = "bold 10px monospace";
        ctx.fillText("LOCKED", screenX + drawOffset + 4, screenY - 4);
      }
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      ctx.lineTo(screenX, screenY);
      ctx.strokeStyle = entityColor;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      entityColor =
        entity.distance < 300
          ? window.espColors.foodClose
          : entity.distance < 1000
            ? window.espColors.foodMedium
            : window.espColors.foodFar;
      ctx.strokeStyle = entityColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        screenX - boxSize / 2,
        screenY - boxSize / 2,
        boxSize,
        boxSize,
      );
      if (entity.distance < 1000) {
        ctx.fillStyle = entityColor;
        ctx.font = "9px monospace";
        ctx.fillText(
          Math.round(entity.distance).toString(),
          screenX + boxSize / 2 + 3,
          screenY + 3,
        );
      }
    }
  });
}
function drawTrackedEntityIndicator(ctx, canvas, myPos, scale) {
  if (!window.espTrackedEntityId) {
    return;
  }
  const trackedEntity = getEntityById(window.espTrackedEntityId);
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
  const pulseOpacity = Math.sin(Date.now() / 200) * 0.3 + 0.7;
  const boxSize = 40;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(screenX, screenY);
  ctx.strokeStyle = "rgba(255,0,255,0.6)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(255,0,255," + pulseOpacity + ")";
  ctx.lineWidth = 3;
  ctx.strokeRect(
    screenX - boxSize / 2,
    screenY - boxSize / 2,
    boxSize,
    boxSize,
  );
  const dirLineLength = 50;
  const angle = Math.atan2(entityDir.dirY, entityDir.dirX);
  ctx.beginPath();
  ctx.moveTo(screenX, screenY);
  ctx.lineTo(
    screenX + entityDir.dirX * dirLineLength,
    screenY + entityDir.dirY * dirLineLength,
  );
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(
    screenX + entityDir.dirX * dirLineLength,
    screenY + entityDir.dirY * dirLineLength,
  );
  ctx.lineTo(
    screenX + entityDir.dirX * dirLineLength - Math.cos(angle - 0.4) * 10,
    screenY + entityDir.dirY * dirLineLength - Math.sin(angle - 0.4) * 10,
  );
  ctx.moveTo(
    screenX + entityDir.dirX * dirLineLength,
    screenY + entityDir.dirY * dirLineLength,
  );
  ctx.lineTo(
    screenX + entityDir.dirX * dirLineLength - Math.cos(angle + 0.4) * 10,
    screenY + entityDir.dirY * dirLineLength - Math.sin(angle + 0.4) * 10,
  );
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 2;
  ctx.stroke();
  const rectWidth = 180;
  const rectHeight = 70;
  const rectX = Math.min(
    screenX + boxSize / 2 + 10,
    canvas.width - rectWidth - 5,
  );
  const rectY = Math.max(
    5,
    Math.min(screenY - rectHeight / 2, canvas.height - rectHeight - 5),
  );
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.strokeStyle = "rgba(255,0,255," + pulseOpacity + ")";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(rectX, rectY, rectWidth, rectHeight, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ff00ff";
  ctx.font = "bold 12px monospace";
  ctx.fillText("TRACKING", rectX + 8, rectY + 18);
  ctx.fillStyle = "#ffffff";
  ctx.font = "11px monospace";
  ctx.fillText(
    (trackedEntity.name || "Entity " + window.espTrackedEntityId).substring(
      0,
      18,
    ),
    rectX + 8,
    rectY + 34,
  );
  ctx.fillStyle = "#ff00ff";
  ctx.font = "bold 14px monospace";
  ctx.fillText(Math.round(distance) + " units", rectX + 8, rectY + 52);
  if (
    screenX < 0 ||
    screenX > canvas.width ||
    screenY < 0 ||
    screenY > canvas.height
  ) {
    const angle_2 = Math.atan2(screenY - centerY, screenX - centerX);
    const posX = centerX + Math.cos(angle_2) * (canvas.width / 2 - 40);
    const posY = centerY + Math.sin(angle_2) * (canvas.height / 2 - 40);
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.beginPath();
    ctx.roundRect(posX - 40, posY - 15, 80, 30, 4);
    ctx.fill();
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(posX + Math.cos(angle_2) * 20, posY + Math.sin(angle_2) * 20);
    ctx.lineTo(
      posX - Math.cos(angle_2 - 0.5) * 10,
      posY - Math.sin(angle_2 - 0.5) * 10,
    );
    ctx.lineTo(
      posX - Math.cos(angle_2 + 0.5) * 10,
      posY - Math.sin(angle_2 + 0.5) * 10,
    );
    ctx.closePath();
    ctx.fillStyle = "#ff00ff";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(Math.round(distance).toString(), posX, posY + 4);
    ctx.textAlign = "left";
  }
}
function renderEspOverlay() {
  if (!window.espEnabled) {
    const overlayElement = document.getElementById("esp-overlay");
    if (overlayElement) {
      overlayElement
        .getContext("2d")
        .clearRect(0, 0, overlayElement.width, overlayElement.height);
    }
    requestAnimationFrame(renderEspOverlay);
    return;
  }
  const canvas = getOrCreateOverlayCanvas("esp-overlay", 999998);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const entities = getNearbyEntities();
  const localPlayer = getFirstAnimalPosition();
  const zoomLevel = getZoomLevel();
  drawEspEntities(
    ctx,
    entities,
    canvas.width / 2,
    canvas.height / 2,
    zoomLevel,
  );
  drawTrackedEntityIndicator(ctx, canvas, localPlayer, zoomLevel);
  drawRadar(ctx, canvas, entities);
  requestAnimationFrame(renderEspOverlay);
}
function clearTracking() {
  window.espEnabled = !window.espEnabled;
  showNotification(window.espEnabled ? "ESP enabled" : "ESP disabled");
}
function trackPlayer() {
  const gameData = getNearbyEntities();
  if (gameData && gameData.players && gameData.players.length > 0) {
    window.espTrackedEntityId = gameData.players[0].id;
    showNotification(
      "Tracking: " +
        (gameData.players[0].entity?.name || window.espTrackedEntityId),
    );
  } else {
    showNotification("No players nearby");
  }
}
function toggleMinimapSize() {
  if (!state.animalData || !state.animalData.minimap) {
    showNotification("Minimap not available");
    return;
  }
  if (state.isMinimapSmall) {
    state.animalData.minimap.scale.set(1);
    state.animalData.minimap.pivot.set(0, 0);
    state.isMinimapSmall = false;
    showNotification("Minimap restored");
  } else {
    state.animalData.minimap.scale.set(0.5);
    state.animalData.minimap.pivot.set(-70, -45);
    state.isMinimapSmall = true;
    showNotification("Small minimap enabled");
  }
}

export {
  drawEspEntities,
  drawTrackedEntityIndicator,
  renderEspOverlay,
  clearTracking,
  trackPlayer,
  toggleMinimapSize,
};
