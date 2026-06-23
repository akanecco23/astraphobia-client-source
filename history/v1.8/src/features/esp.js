import {
  gameInstance,
  getEntityPosition,
  calculateDirection,
  findEntityById,
  getFirstAnimalPosition,
  animalData,
  state,
} from "../core.js";
import {
  isPlayer,
  calculateDistance,
  getNearbyEntities,
  getZoomScale,
  getOrCreateOverlayCanvas,
} from "../utils.js";
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

function drawEsp(ctx, gameState, offsetX, offsetY, scale) {
  if (!gameState || gameState.error) {
    return;
  }
  const myPos = gameState.myPos;
  const espMode = window.espMode;
  const trackedId = window.espTrackedEntityId;
  let entities =
    espMode === "players" ? gameState.players || [] : gameState.food || [];
  let viewportOffsetX = 0;
  let viewportOffsetY = 0;
  try {
    if (gameInstance?.viewport) {
      const viewport = gameInstance.viewport;
      if (viewport.center && viewport.center.x != null) {
        viewportOffsetX = (viewport.center.x - myPos.x) * scale;
        viewportOffsetY = (viewport.center.y - myPos.y) * scale;
      }
    }
  } catch (err) {}
  entities.forEach((entity) => {
    const deltaX = entity.x - myPos.x;
    const deltaY = entity.y - myPos.y;
    const screenX = offsetX + deltaX * scale - viewportOffsetX;
    const screenY = offsetY + deltaY * scale - viewportOffsetY;
    const isTracked = trackedId && entity.id === trackedId;
    const boxSize = 20;
    let espColor;
    if (espMode === "players") {
      espColor = isTracked
        ? window.espColors.tracked
        : entity.distance < 500
          ? window.espColors.close
          : entity.distance < 1500
            ? window.espColors.medium
            : entity.distance < 3000
              ? window.espColors.far
              : window.espColors.veryFar;
      ctx.strokeStyle = espColor;
      ctx.lineWidth = isTracked ? 3 : 2;
      ctx.strokeRect(
        screenX - boxSize / 2,
        screenY - boxSize / 2,
        boxSize,
        boxSize,
      );
      ctx.fillStyle = espColor;
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
        const offset = 15;
        ctx.beginPath();
        ctx.moveTo(screenX - offset, screenY);
        ctx.lineTo(screenX + offset, screenY);
        ctx.moveTo(screenX, screenY - offset);
        ctx.lineTo(screenX, screenY + offset);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(screenX, screenY, offset, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,0,0,0.7)";
        ctx.stroke();
        ctx.fillStyle = "#ff0000";
        ctx.font = "bold 10px monospace";
        ctx.fillText("LOCKED", screenX + offset + 4, screenY - 4);
      }
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      ctx.lineTo(screenX, screenY);
      ctx.strokeStyle = espColor;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      espColor =
        entity.distance < 300
          ? window.espColors.foodClose
          : entity.distance < 1000
            ? window.espColors.foodMedium
            : window.espColors.foodFar;
      ctx.strokeStyle = espColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        screenX - boxSize / 2,
        screenY - boxSize / 2,
        boxSize,
        boxSize,
      );
      if (entity.distance < 1000) {
        ctx.fillStyle = espColor;
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
  const deltaX = entityPos.x - myPos.x;
  const deltaY = entityPos.y - myPos.y;
  const screenX = centerX + deltaX * scale;
  const screenY = centerY + deltaY * scale;
  const distance = calculateDistance(
    myPos.x,
    myPos.y,
    entityPos.x,
    entityPos.y,
  );
  const entityDir = calculateDirection(trackedEntity);
  const pulseOpacity = Math.sin(Date.now() / 200) * 0.3 + 0.7;
  const markerSize = 40;
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
    screenX - markerSize / 2,
    screenY - markerSize / 2,
    markerSize,
    markerSize,
  );
  const arrowLength = 50;
  const angle = Math.atan2(entityDir.dirY, entityDir.dirX);
  ctx.beginPath();
  ctx.moveTo(screenX, screenY);
  ctx.lineTo(
    screenX + entityDir.dirX * arrowLength,
    screenY + entityDir.dirY * arrowLength,
  );
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(
    screenX + entityDir.dirX * arrowLength,
    screenY + entityDir.dirY * arrowLength,
  );
  ctx.lineTo(
    screenX + entityDir.dirX * arrowLength - Math.cos(angle - 0.4) * 10,
    screenY + entityDir.dirY * arrowLength - Math.sin(angle - 0.4) * 10,
  );
  ctx.moveTo(
    screenX + entityDir.dirX * arrowLength,
    screenY + entityDir.dirY * arrowLength,
  );
  ctx.lineTo(
    screenX + entityDir.dirX * arrowLength - Math.cos(angle + 0.4) * 10,
    screenY + entityDir.dirY * arrowLength - Math.sin(angle + 0.4) * 10,
  );
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 2;
  ctx.stroke();
  const rectWidth = 180;
  const rectHeight = 70;
  const rectX = Math.min(
    screenX + markerSize / 2 + 10,
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
function renderEspLoop() {
  if (!window.espEnabled) {
    const espOverlay = document.getElementById("esp-overlay");
    if (espOverlay) {
      espOverlay
        .getContext("2d")
        .clearRect(0, 0, espOverlay.width, espOverlay.height);
    }
    requestAnimationFrame(renderEspLoop);
    return;
  }
  const espCanvas = getOrCreateOverlayCanvas("esp-overlay", 999998);
  const ctx = espCanvas.getContext("2d");
  ctx.clearRect(0, 0, espCanvas.width, espCanvas.height);
  const crosshairPos = getNearbyEntities();
  const playerPos = getFirstAnimalPosition();
  const espColor = getZoomScale();
  drawEsp(
    ctx,
    crosshairPos,
    espCanvas.width / 2,
    espCanvas.height / 2,
    espColor,
  );
  drawTrackedEntity(ctx, espCanvas, playerPos, espColor);
  drawRadar(ctx, espCanvas, crosshairPos);
  requestAnimationFrame(renderEspLoop);
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
  if (!animalData || !animalData.minimap) {
    showNotification("Minimap not available");
    return;
  }
  if (state.isMinimapSmall) {
    animalData.minimap.scale.set(1);
    animalData.minimap.pivot.set(0, 0);
    state.isMinimapSmall = false;
    showNotification("Minimap restored");
  } else {
    animalData.minimap.scale.set(0.5);
    animalData.minimap.pivot.set(-70, -45);
    state.isMinimapSmall = true;
    showNotification("Small minimap enabled");
  }
}

export {
  drawEsp,
  drawTrackedEntity,
  renderEspLoop,
  clearTracking,
  trackPlayer,
  toggleMinimapSize,
};
