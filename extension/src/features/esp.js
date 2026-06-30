import {
  gameInstance,
  isValidEntity,
  getEntityPosition,
  calculateDirection,
  findEntityById,
  angle,
  getFirstAnimalPosition,
  getGameState_2,
  getViewportScale,
  playerData,
  state,
} from "../core.js";
import { calculateDistance, getOrCreateCanvas } from "../utils.js";
import { showNotification } from "../ui/interaction.js";
import { drawRadar } from "../ui/radar.js";

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
window.autoDodgeEnabled = false;

function drawEsp(ctx, gameData, offsetX, offsetY, scale) {
  if (!gameData || gameData.error) {
    return;
  }
  const myPos = gameData.myPos;
  const espMode = window.espMode;
  const trackedId = window.espTrackedEntityId;
  let entities =
    espMode === "players" ? gameData.players || [] : gameData.food || [];
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
  } catch (error) {}
  entities.forEach((entity) => {
    const deltaX = entity.x - myPos.x;
    const deltaY = entity.y - myPos.y;
    const screenX = offsetX + deltaX * scale - viewportOffsetX;
    const screenY = offsetY + deltaY * scale - viewportOffsetY;
    const isTracked = trackedId && entity.id === trackedId;
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
        entity.entity?.entityName || entity.entity?.name || "ID:" + entity.id,
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
        const boxOffset = 15;
        ctx.beginPath();
        ctx.moveTo(screenX - boxOffset, screenY);
        ctx.lineTo(screenX + boxOffset, screenY);
        ctx.moveTo(screenX, screenY - boxOffset);
        ctx.lineTo(screenX, screenY + boxOffset);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(screenX, screenY, boxOffset, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,0,0,0.7)";
        ctx.stroke();
        ctx.fillStyle = "#ff0000";
        ctx.font = "bold 10px monospace";
        ctx.fillText("LOCKED", screenX + boxOffset + 4, screenY - 4);
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
function drawTrackedEntity(ctx, canvas, playerPos, scale) {
  if (!window.espTrackedEntityId) {
    return;
  }
  const trackedEntity = findEntityById(window.espTrackedEntityId);
  if (!trackedEntity) {
    return;
  }
  if (!isValidEntity(trackedEntity)) {
    window.espTrackedEntityId = null;
    return;
  }
  const entityPos = getEntityPosition(trackedEntity);
  if (!entityPos || !playerPos) {
    return;
  }
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const diffX = entityPos.x - playerPos.x;
  const diffY = entityPos.y - playerPos.y;
  const targetX = centerX + diffX * scale;
  const targetY = centerY + diffY * scale;
  const distance = calculateDistance(
    playerPos.x,
    playerPos.y,
    entityPos.x,
    entityPos.y,
  );
  const entityData = calculateDirection(trackedEntity);
  const pulseOpacity = Math.sin(Date.now() / 200) * 0.3 + 0.7;
  const boxSize = 40;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(targetX, targetY);
  ctx.strokeStyle = "rgba(255,0,255,0.6)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(255,0,255," + pulseOpacity + ")";
  ctx.lineWidth = 3;
  ctx.strokeRect(
    targetX - boxSize / 2,
    targetY - boxSize / 2,
    boxSize,
    boxSize,
  );
  const arrowLength = 50;
  const angle = Math.atan2(entityData.dirY, entityData.dirX);
  ctx.beginPath();
  ctx.moveTo(targetX, targetY);
  ctx.lineTo(
    targetX + entityData.dirX * arrowLength,
    targetY + entityData.dirY * arrowLength,
  );
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(
    targetX + entityData.dirX * arrowLength,
    targetY + entityData.dirY * arrowLength,
  );
  ctx.lineTo(
    targetX + entityData.dirX * arrowLength - Math.cos(angle - 0.4) * 10,
    targetY + entityData.dirY * arrowLength - Math.sin(angle - 0.4) * 10,
  );
  ctx.moveTo(
    targetX + entityData.dirX * arrowLength,
    targetY + entityData.dirY * arrowLength,
  );
  ctx.lineTo(
    targetX + entityData.dirX * arrowLength - Math.cos(angle + 0.4) * 10,
    targetY + entityData.dirY * arrowLength - Math.sin(angle + 0.4) * 10,
  );
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 2;
  ctx.stroke();
  const rectWidth = 180;
  const rectHeight = 70;
  const boxX = Math.min(
    targetX + boxSize / 2 + 10,
    canvas.width - rectWidth - 5,
  );
  const boxY = Math.max(
    5,
    Math.min(targetY - rectHeight / 2, canvas.height - rectHeight - 5),
  );
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.strokeStyle = "rgba(255,0,255," + pulseOpacity + ")";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, rectWidth, rectHeight, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ff00ff";
  ctx.font = "bold 12px monospace";
  ctx.fillText("TRACKING", boxX + 8, boxY + 18);
  ctx.fillStyle = "#ffffff";
  ctx.font = "11px monospace";
  ctx.fillText(
    (trackedEntity.name || "Entity " + window.espTrackedEntityId).substring(
      0,
      18,
    ),
    boxX + 8,
    boxY + 34,
  );
  ctx.fillStyle = "#ff00ff";
  ctx.font = "bold 14px monospace";
  ctx.fillText(Math.round(distance) + " units", boxX + 8, boxY + 52);
  if (
    targetX < 0 ||
    targetX > canvas.width ||
    targetY < 0 ||
    targetY > canvas.height
  ) {
    const targetAngle = Math.atan2(targetY - centerY, targetX - centerX);
    const posX = centerX + Math.cos(targetAngle) * (canvas.width / 2 - 40);
    const posY = centerY + Math.sin(targetAngle) * (canvas.height / 2 - 40);
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.beginPath();
    ctx.roundRect(posX - 40, posY - 15, 80, 30, 4);
    ctx.fill();
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(
      posX + Math.cos(targetAngle) * 20,
      posY + Math.sin(targetAngle) * 20,
    );
    ctx.lineTo(
      posX - Math.cos(targetAngle - 0.5) * 10,
      posY - Math.sin(targetAngle - 0.5) * 10,
    );
    ctx.lineTo(
      posX - Math.cos(targetAngle + 0.5) * 10,
      posY - Math.sin(targetAngle + 0.5) * 10,
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
    const overlayElement = document.getElementById("esp-overlay");
    if (overlayElement) {
      overlayElement
        .getContext("2d")
        .clearRect(0, 0, overlayElement.width, overlayElement.height);
    }
    requestAnimationFrame(renderEspLoop);
    return;
  }
  const canvas = getOrCreateCanvas("esp-overlay", 999998);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const gameData = getGameState_2();
  const localPlayer = getFirstAnimalPosition();
  const settings = getViewportScale();
  drawEsp(ctx, gameData, canvas.width / 2, canvas.height / 2, settings);
  drawTrackedEntity(ctx, canvas, localPlayer, settings);
  drawRadar(ctx, canvas, gameData);
  requestAnimationFrame(renderEspLoop);
}
function toggleEsp() {
  window.espEnabled = !window.espEnabled;
  showNotification(window.espEnabled ? "ESP enabled" : "ESP disabled");
}
function trackPlayer() {
  const gameData = getGameState_2();
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
function toggleEsp_2() {
  window.espTrackedEntityId = null;
  showNotification("Tracking cleared");
}
function toggleEsp_3() {
  window.autoDodgeEnabled = false;
  showNotification("Auto dodge disabled");
}
function toggleMinimapSize() {
  if (!playerData || !playerData.minimap) {
    showNotification("Minimap not available");
    return;
  }
  if (state.isToggled_3) {
    playerData.minimap.scale.set(1);
    playerData.minimap.pivot.set(0, 0);
    state.isToggled_3 = false;
    showNotification("Minimap restored");
  } else {
    playerData.minimap.scale.set(0.5);
    playerData.minimap.pivot.set(-70, -45);
    state.isToggled_3 = true;
    showNotification("Small minimap enabled");
  }
}

export {
  drawEsp,
  drawTrackedEntity,
  renderEspLoop,
  toggleEsp,
  trackPlayer,
  toggleEsp_2,
  toggleEsp_3,
  toggleMinimapSize,
};
