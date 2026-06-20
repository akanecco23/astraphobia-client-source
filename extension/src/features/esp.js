import {
  getAnimalPosition,
  extractPosition,
  calculateDirection,
  calculateDistance,
  buildEntityState,
} from "./movement.js";
import { getViewportScale, dragState, state } from "../core.js";
import { showNotification } from "../ui/interaction.js";
import { drawEntityTrail } from "./entitytrail.js";
import { getOrCreateCanvas } from "../ui/radar.js";
import { findEntityById } from "./autofarm.js";
import { isValidEntity } from "../utils.js";

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

function refreshUI() {}
function renderLoop() {
  const overlayCanvas = getOrCreateCanvas("ast-overlay", 999997);
  const overlayCtx = overlayCanvas.getContext("2d");
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  const currentPlayerPos = getAnimalPosition();
  if (currentPlayerPos && window.entityTrailEnabled) {
    drawEntityTrail(
      overlayCtx,
      overlayCanvas,
      currentPlayerPos,
      getViewportScale(),
    );
  }
  requestAnimationFrame(renderLoop);
}
function drawESP(ctx, gameState, offsetX, offsetY, scale) {
  if (!gameState || gameState.error) {
    return;
  }
  const myPos = gameState.myPos;
  const espMode = window.espMode;
  const trackedId = window.espTrackedEntityId;
  let entities =
    espMode === "players" ? gameState.players || [] : gameState.food || [];
  let viewCenterX = 0;
  let viewCenterY = 0;
  try {
    if (state.gameInstance?.viewport) {
      const viewport = state.gameInstance.viewport;
      if (viewport.center && viewport.center.x != null) {
        viewCenterX = (viewport.center.x - myPos.x) * scale;
        viewCenterY = (viewport.center.y - myPos.y) * scale;
      }
    }
  } catch (err) {}
  entities.forEach((targetEntity) => {
    const deltaX = targetEntity.x - myPos.x;
    const deltaY = targetEntity.y - myPos.y;
    const screenPosX = offsetX + deltaX * scale - viewCenterX;
    const screenPosY = offsetY + deltaY * scale - viewCenterY;
    const isTracked = trackedId && targetEntity.id === trackedId;
    const boxSize = 20;
    let espColor;
    if (espMode === "players") {
      espColor = isTracked
        ? window.espColors.tracked
        : targetEntity.distance < 500
          ? window.espColors.close
          : targetEntity.distance < 1500
            ? window.espColors.medium
            : targetEntity.distance < 3000
              ? window.espColors.far
              : window.espColors.veryFar;
      ctx.strokeStyle = espColor;
      ctx.lineWidth = isTracked ? 3 : 2;
      ctx.strokeRect(
        screenPosX - boxSize / 2,
        screenPosY - boxSize / 2,
        boxSize,
        boxSize,
      );
      ctx.fillStyle = espColor;
      ctx.font = "bold 11px monospace";
      ctx.fillText(
        targetEntity.entity?.entityName ||
          targetEntity.entity?.name ||
          "ID:" + targetEntity.id,
        screenPosX - boxSize / 2,
        screenPosY - boxSize / 2 - 8,
      );
      ctx.font = "10px monospace";
      ctx.fillText(
        Math.round(targetEntity.distance).toString(),
        screenPosX - boxSize / 2,
        screenPosY + boxSize / 2 + 13,
      );
      if (targetEntity.entity?.visibleFishLevel != null) {
        ctx.fillText(
          "Lvl:" + targetEntity.entity.visibleFishLevel,
          screenPosX - boxSize / 2,
          screenPosY + boxSize / 2 + 24,
        );
      }
      if (window.lockEnabled && window.lockTargetId === targetEntity.id) {
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 2;
        const boxOffset = 15;
        ctx.beginPath();
        ctx.moveTo(screenPosX - boxOffset, screenPosY);
        ctx.lineTo(screenPosX + boxOffset, screenPosY);
        ctx.moveTo(screenPosX, screenPosY - boxOffset);
        ctx.lineTo(screenPosX, screenPosY + boxOffset);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(screenPosX, screenPosY, boxOffset, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,0,0,0.7)";
        ctx.stroke();
        ctx.fillStyle = "#ff0000";
        ctx.font = "bold 10px monospace";
        ctx.fillText("LOCKED", screenPosX + boxOffset + 4, screenPosY - 4);
      }
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      ctx.lineTo(screenPosX, screenPosY);
      ctx.strokeStyle = espColor;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      espColor =
        targetEntity.distance < 300
          ? window.espColors.foodClose
          : targetEntity.distance < 1000
            ? window.espColors.foodMedium
            : window.espColors.foodFar;
      ctx.strokeStyle = espColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        screenPosX - boxSize / 2,
        screenPosY - boxSize / 2,
        boxSize,
        boxSize,
      );
      if (targetEntity.distance < 1000) {
        ctx.fillStyle = espColor;
        ctx.font = "9px monospace";
        ctx.fillText(
          Math.round(targetEntity.distance).toString(),
          screenPosX + boxSize / 2 + 3,
          screenPosY + 3,
        );
      }
    }
  });
}
function drawTrackerLine(ctx, canvas, playerPos, zoomScale) {
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
  const entityPos = extractPosition(trackedEntity);
  if (!entityPos || !playerPos) {
    return;
  }
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const diffX = entityPos.x - playerPos.x;
  const diffY = entityPos.y - playerPos.y;
  const targetX = centerX + diffX * zoomScale;
  const targetY = centerY + diffY * zoomScale;
  const distance = calculateDistance(
    playerPos.x,
    playerPos.y,
    entityPos.x,
    entityPos.y,
  );
  const entityDir = calculateDirection(trackedEntity);
  const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
  const markerSize = 40;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(targetX, targetY);
  ctx.strokeStyle = "rgba(255,0,255,0.6)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(255,0,255," + pulse + ")";
  ctx.lineWidth = 3;
  ctx.strokeRect(
    targetX - markerSize / 2,
    targetY - markerSize / 2,
    markerSize,
    markerSize,
  );
  const arrowLength = 50;
  const angle = Math.atan2(entityDir.dirY, entityDir.dirX);
  ctx.beginPath();
  ctx.moveTo(targetX, targetY);
  ctx.lineTo(
    targetX + entityDir.dirX * arrowLength,
    targetY + entityDir.dirY * arrowLength,
  );
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(
    targetX + entityDir.dirX * arrowLength,
    targetY + entityDir.dirY * arrowLength,
  );
  ctx.lineTo(
    targetX + entityDir.dirX * arrowLength - Math.cos(angle - 0.4) * 10,
    targetY + entityDir.dirY * arrowLength - Math.sin(angle - 0.4) * 10,
  );
  ctx.moveTo(
    targetX + entityDir.dirX * arrowLength,
    targetY + entityDir.dirY * arrowLength,
  );
  ctx.lineTo(
    targetX + entityDir.dirX * arrowLength - Math.cos(angle + 0.4) * 10,
    targetY + entityDir.dirY * arrowLength - Math.sin(angle + 0.4) * 10,
  );
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 2;
  ctx.stroke();
  const rectWidth = 180;
  const rectHeight = 70;
  const rectX = Math.min(
    targetX + markerSize / 2 + 10,
    canvas.width - rectWidth - 5,
  );
  const rectY = Math.max(
    5,
    Math.min(targetY - rectHeight / 2, canvas.height - rectHeight - 5),
  );
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.strokeStyle = "rgba(255,0,255," + pulse + ")";
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
    targetX < 0 ||
    targetX > canvas.width ||
    targetY < 0 ||
    targetY > canvas.height
  ) {
    const arrowAngle = Math.atan2(targetY - centerY, targetX - centerX);
    const arrowCenterX =
      centerX + Math.cos(arrowAngle) * (canvas.width / 2 - 40);
    const arrowCenterY =
      centerY + Math.sin(arrowAngle) * (canvas.height / 2 - 40);
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.beginPath();
    ctx.roundRect(arrowCenterX - 40, arrowCenterY - 15, 80, 30, 4);
    ctx.fill();
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(
      arrowCenterX + Math.cos(arrowAngle) * 20,
      arrowCenterY + Math.sin(arrowAngle) * 20,
    );
    ctx.lineTo(
      arrowCenterX - Math.cos(arrowAngle - 0.5) * 10,
      arrowCenterY - Math.sin(arrowAngle - 0.5) * 10,
    );
    ctx.lineTo(
      arrowCenterX - Math.cos(arrowAngle + 0.5) * 10,
      arrowCenterY - Math.sin(arrowAngle + 0.5) * 10,
    );
    ctx.closePath();
    ctx.fillStyle = "#ff00ff";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      Math.round(distance).toString(),
      arrowCenterX,
      arrowCenterY + 4,
    );
    ctx.textAlign = "left";
  }
}
function drawRadar(ctx, canvas, gameState) {
  if (!gameState || gameState.error) {
    return;
  }
  const radarSize = 150;
  if (dragState.x === null) {
    dragState.x = canvas.width - radarSize - 20;
  }
  const radarX = dragState.x;
  const radarY = dragState.y;
  const worldScale = 5000;
  const pixelScale = radarSize / (worldScale * 2);
  window._radarBounds = {
    x: radarX,
    y: radarY,
    w: radarSize,
    h: radarSize + 22,
  };
  ctx.fillStyle = "rgba(20,20,20,0.9)";
  ctx.beginPath();
  ctx.roundRect(radarX, radarY, radarSize, radarSize, 4);
  ctx.fill();
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(60,60,60,0.5)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(radarX + radarSize / 2, radarY);
  ctx.lineTo(radarX + radarSize / 2, radarY + radarSize);
  ctx.moveTo(radarX, radarY + radarSize / 2);
  ctx.lineTo(radarX + radarSize, radarY + radarSize / 2);
  ctx.stroke();
  for (
    let circleRadiusFactor = 0.25;
    circleRadiusFactor <= 1;
    circleRadiusFactor += 0.25
  ) {
    ctx.beginPath();
    ctx.arc(
      radarX + radarSize / 2,
      radarY + radarSize / 2,
      (radarSize / 2) * circleRadiusFactor,
      0,
      Math.PI * 2,
    );
    ctx.strokeStyle = "rgba(60,60,60," + (0.2 + circleRadiusFactor * 0.1) + ")";
    ctx.stroke();
  }
  ctx.fillStyle = "#1db954";
  ctx.beginPath();
  ctx.arc(radarX + radarSize / 2, radarY + radarSize / 2, 4, 0, Math.PI * 2);
  ctx.fill();
  const entitiesToDraw =
    window.espMode === "players"
      ? gameState.players || []
      : gameState.food || [];
  entitiesToDraw.forEach((targetEntity) => {
    const diffX = targetEntity.x - gameState.myPos.x;
    const diffY = targetEntity.y - gameState.myPos.y;
    let screenX = Math.max(
      radarX + 2,
      Math.min(
        radarX + radarSize - 2,
        radarX + radarSize / 2 + diffX * pixelScale,
      ),
    );
    let screenY = Math.max(
      radarY + 2,
      Math.min(
        radarY + radarSize - 2,
        radarY + radarSize / 2 + diffY * pixelScale,
      ),
    );
    let espColor;
    let circleRadius;
    if (window.espMode === "players") {
      espColor =
        targetEntity.distance < 500
          ? window.espColors.close
          : targetEntity.distance < 1500
            ? window.espColors.medium
            : targetEntity.distance < 3000
              ? window.espColors.far
              : "#888";
      circleRadius = 3;
    } else {
      espColor = window.espColors.foodClose;
      circleRadius = 1.5;
    }
    if (
      window.espTrackedEntityId &&
      targetEntity.id === window.espTrackedEntityId
    ) {
      espColor = window.espColors.tracked;
      circleRadius = 4;
    }
    if (window.lockTargetId && targetEntity.id === window.lockTargetId) {
      espColor = "#ff0000";
      circleRadius = 4;
    }
    ctx.fillStyle = espColor;
    ctx.beginPath();
    ctx.arc(screenX, screenY, circleRadius, 0, Math.PI * 2);
    ctx.fill();
  });
  if (window.entityTrailEnabled && window.entityTrailTargetId) {
    const targetEntityId = findEntityById(window.entityTrailTargetId);
    if (targetEntityId) {
      const targetEntity = extractPosition(targetEntityId);
      if (targetEntity) {
        const deltaX = targetEntity.x - gameState.myPos.x;
        const deltaY = targetEntity.y - gameState.myPos.y;
        const canvasX = Math.max(
          radarX + 2,
          Math.min(
            radarX + radarSize - 2,
            radarX + radarSize / 2 + deltaX * pixelScale,
          ),
        );
        const canvasY = Math.max(
          radarY + 2,
          Math.min(
            radarY + radarSize - 2,
            radarY + radarSize / 2 + deltaY * pixelScale,
          ),
        );
        const opacityPulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        const {
          r: colorRed,
          g: colorGreen,
          b: colorBlue,
        } = window.entityTrailColor;
        const rgbString = colorRed + "," + colorGreen + "," + colorBlue;
        ctx.strokeStyle = "rgba(" + rgbString + "," + opacityPulse + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(" + rgbString + "," + opacityPulse * 0.5 + ")";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgb(" + rgbString + ")";
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 3, 0, Math.PI * 2);
        ctx.fill();
        if (window.entityTrailHistory.length > 1) {
          ctx.strokeStyle = "rgba(" + rgbString + ",0.3)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          window.entityTrailHistory.forEach((entity, entityIndex) => {
            const drawX = Math.max(
              radarX + 2,
              Math.min(
                radarX + radarSize - 2,
                radarX +
                  radarSize / 2 +
                  (entity.x - gameState.myPos.x) * pixelScale,
              ),
            );
            const drawY = Math.max(
              radarY + 2,
              Math.min(
                radarY + radarSize - 2,
                radarY +
                  radarSize / 2 +
                  (entity.y - gameState.myPos.y) * pixelScale,
              ),
            );
            if (entityIndex === 0) {
              ctx.moveTo(drawX, drawY);
            } else {
              ctx.lineTo(drawX, drawY);
            }
          });
          ctx.stroke();
        }
      }
    }
  }
  ctx.fillStyle = "rgba(20,20,20,0.9)";
  ctx.beginPath();
  ctx.roundRect(radarX, radarY + radarSize, radarSize, 22, [0, 0, 4, 4]);
  ctx.fill();
  ctx.fillStyle = "#888";
  ctx.font = "10px monospace";
  ctx.fillText("RADAR", radarX + 5, radarY + radarSize + 14);
  ctx.fillText(
    (window.espMode === "players" ? "P:" : "F:") + entitiesToDraw.length,
    radarX + radarSize - 50,
    radarY + radarSize + 14,
  );
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
  const espCanvas = getOrCreateCanvas("esp-overlay", 999998);
  const espCtx = espCanvas.getContext("2d");
  espCtx.clearRect(0, 0, espCanvas.width, espCanvas.height);
  const currentGameState = buildEntityState();
  const playerData = getAnimalPosition();
  const renderSettings = getViewportScale();
  drawESP(
    espCtx,
    currentGameState,
    espCanvas.width / 2,
    espCanvas.height / 2,
    renderSettings,
  );
  drawTrackerLine(espCtx, espCanvas, playerData, renderSettings);
  drawRadar(espCtx, espCanvas, currentGameState);
  requestAnimationFrame(renderEspLoop);
}
function toggleEsp() {
  window.espEnabled = !window.espEnabled;
  showNotification(window.espEnabled ? "ESP enabled" : "ESP disabled");
}

export {
  refreshUI,
  renderLoop,
  drawESP,
  drawTrackerLine,
  drawRadar,
  renderEspLoop,
  toggleEsp,
};
