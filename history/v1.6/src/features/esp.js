import {
  getEntityPosition,
  calculateDirection,
  findEntityById,
  getFirstAnimalPosition,
  PlayerData,
  state,
} from "../core.js";
import {
  getGameCanvas,
  isPlayer,
  calculateDistance,
  getNearbyEntities,
  getZoomLevel,
} from "../utils.js";
import { showToast } from "../ui/interaction.js";
import { drawRadar } from "../ui/radar.js";

window.espEnabled = false;
window.espTrackedEntityId = null;
window.espMode = "players";
window.autoDodgeEnabled = false;

function createEspOverlay() {
  let overlayCanvas = document.getElementById("esp-overlay");
  if (!overlayCanvas) {
    overlayCanvas = document.createElement("canvas");
    overlayCanvas.id = "esp-overlay";
    overlayCanvas.style.cssText =
      "position:fixed;top:0;left:0;pointer-events:none;z-index:999998;";
    document.body.appendChild(overlayCanvas);
  }
  const v3da5Canvas = getGameCanvas();
  if (v3da5Canvas) {
    const v2bf8Rect = v3da5Canvas.getBoundingClientRect();
    overlayCanvas.width = v2bf8Rect.width;
    overlayCanvas.height = v2bf8Rect.height;
    overlayCanvas.style.left = v2bf8Rect.left + "px";
    overlayCanvas.style.top = v2bf8Rect.top + "px";
    overlayCanvas.style.width = v2bf8Rect.width + "px";
    overlayCanvas.style.height = v2bf8Rect.height + "px";
  } else {
    overlayCanvas.width = window.innerWidth;
    overlayCanvas.height = window.innerHeight;
  }
  return overlayCanvas;
}
function drawEsp(ctx, v3025GameState, offsetX, offsetY, scale) {
  if (!v3025GameState || v3025GameState.error) {
    return;
  }
  const myPos = v3025GameState.myPos;
  const espMode = window.espMode;
  const trackedEntityId = window.espTrackedEntityId;
  let entities =
    espMode === "players"
      ? v3025GameState.players || []
      : v3025GameState.food || [];
  entities.forEach((targetEntity) => {
    const v921eDeltaX = targetEntity.x - myPos.x;
    const v2d32DeltaY = targetEntity.y - myPos.y;
    const d712ScreenX = offsetX + v921eDeltaX * scale;
    const v560dScreenY = offsetY + v2d32DeltaY * scale;
    const isSelected = trackedEntityId && targetEntity.id === trackedEntityId;
    const v58a2BoxSize = 20;
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
        d712ScreenX - v58a2BoxSize / 2,
        v560dScreenY - v58a2BoxSize / 2,
        v58a2BoxSize,
        v58a2BoxSize,
      );
      ctx.fillStyle = markerColor;
      ctx.font = "bold 11px monospace";
      const entityLabel = targetEntity.entity?.name || "ID:" + targetEntity.id;
      ctx.fillText(
        entityLabel,
        d712ScreenX - v58a2BoxSize / 2,
        v560dScreenY - v58a2BoxSize / 2 - 8,
      );
      ctx.font = "10px monospace";
      ctx.fillText(
        Math.round(targetEntity.distance).toString(),
        d712ScreenX - v58a2BoxSize / 2,
        v560dScreenY + v58a2BoxSize / 2 + 13,
      );
      if (targetEntity.entity?.visibleFishLevel != null) {
        ctx.fillText(
          "Lvl:" + targetEntity.entity.visibleFishLevel,
          d712ScreenX - v58a2BoxSize / 2,
          v560dScreenY + v58a2BoxSize / 2 + 24,
        );
      }
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      ctx.lineTo(d712ScreenX, v560dScreenY);
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
        d712ScreenX - v58a2BoxSize / 2,
        v560dScreenY - v58a2BoxSize / 2,
        v58a2BoxSize,
        v58a2BoxSize,
      );
      if (targetEntity.distance < 1000) {
        ctx.fillStyle = markerColor;
        ctx.font = "9px monospace";
        ctx.fillText(
          Math.round(targetEntity.distance).toString(),
          d712ScreenX + v58a2BoxSize / 2 + 3,
          v560dScreenY + 3,
        );
      }
    }
  });
}
function drawTrackedEntity(v14f1Ctx, v4581Canvas, v2270MyPos, v3ffcScale) {
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
  if (!entityPos || !v2270MyPos) {
    return;
  }
  const v15eaCenterX = v4581Canvas.width / 2;
  const v4812CenterY = v4581Canvas.height / 2;
  const diffX = entityPos.x - v2270MyPos.x;
  const diffY = entityPos.y - v2270MyPos.y;
  const screenX = v15eaCenterX + diffX * v3ffcScale;
  const screenY = v4812CenterY + diffY * v3ffcScale;
  const distance = calculateDistance(
    v2270MyPos.x,
    v2270MyPos.y,
    entityPos.x,
    entityPos.y,
  );
  const entityDir = calculateDirection(trackedEntity);
  const pulseAlpha = Math.sin(Date.now() / 200) * 0.3 + 0.7;
  const boxSize = 40;
  v14f1Ctx.beginPath();
  v14f1Ctx.moveTo(v15eaCenterX, v4812CenterY);
  v14f1Ctx.lineTo(screenX, screenY);
  v14f1Ctx.strokeStyle = "rgba(255,0,255,0.6)";
  v14f1Ctx.lineWidth = 2;
  v14f1Ctx.setLineDash([8, 4]);
  v14f1Ctx.stroke();
  v14f1Ctx.setLineDash([]);
  v14f1Ctx.strokeStyle = "rgba(255,0,255," + pulseAlpha + ")";
  v14f1Ctx.lineWidth = 3;
  v14f1Ctx.strokeRect(
    screenX - boxSize / 2,
    screenY - boxSize / 2,
    boxSize,
    boxSize,
  );
  v14f1Ctx.beginPath();
  v14f1Ctx.moveTo(screenX - boxSize, screenY);
  v14f1Ctx.lineTo(screenX + boxSize, screenY);
  v14f1Ctx.moveTo(screenX, screenY - boxSize);
  v14f1Ctx.lineTo(screenX, screenY + boxSize);
  v14f1Ctx.strokeStyle = "rgba(255,0,255,0.5)";
  v14f1Ctx.lineWidth = 1;
  v14f1Ctx.stroke();
  const dirLineLength = 50;
  v14f1Ctx.beginPath();
  v14f1Ctx.moveTo(screenX, screenY);
  v14f1Ctx.lineTo(
    screenX + entityDir.dirX * dirLineLength,
    screenY + entityDir.dirY * dirLineLength,
  );
  v14f1Ctx.strokeStyle = "#ff00ff";
  v14f1Ctx.lineWidth = 2;
  v14f1Ctx.stroke();
  const offsetDistance = 10;
  const v45b4Angle = Math.atan2(entityDir.dirY, entityDir.dirX);
  v14f1Ctx.beginPath();
  v14f1Ctx.moveTo(
    screenX + entityDir.dirX * dirLineLength,
    screenY + entityDir.dirY * dirLineLength,
  );
  v14f1Ctx.lineTo(
    screenX +
      entityDir.dirX * dirLineLength -
      offsetDistance * Math.cos(v45b4Angle - 0.4),
    screenY +
      entityDir.dirY * dirLineLength -
      offsetDistance * Math.sin(v45b4Angle - 0.4),
  );
  v14f1Ctx.moveTo(
    screenX + entityDir.dirX * dirLineLength,
    screenY + entityDir.dirY * dirLineLength,
  );
  v14f1Ctx.lineTo(
    screenX +
      entityDir.dirX * dirLineLength -
      offsetDistance * Math.cos(v45b4Angle + 0.4),
    screenY +
      entityDir.dirY * dirLineLength -
      offsetDistance * Math.sin(v45b4Angle + 0.4),
  );
  v14f1Ctx.strokeStyle = "#ff00ff";
  v14f1Ctx.lineWidth = 2;
  v14f1Ctx.stroke();
  const boxWidth = 180;
  const boxHeight = 70;
  const boxX = Math.min(
    screenX + boxSize / 2 + 10,
    v4581Canvas.width - boxWidth - 5,
  );
  const boxY = Math.max(
    5,
    Math.min(screenY - boxHeight / 2, v4581Canvas.height - boxHeight - 5),
  );
  v14f1Ctx.fillStyle = "rgba(0,0,0,0.85)";
  v14f1Ctx.strokeStyle = "rgba(255,0,255," + pulseAlpha + ")";
  v14f1Ctx.lineWidth = 1.5;
  v14f1Ctx.beginPath();
  v14f1Ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
  v14f1Ctx.fill();
  v14f1Ctx.stroke();
  v14f1Ctx.fillStyle = "#ff00ff";
  v14f1Ctx.font = "bold 12px monospace";
  v14f1Ctx.fillText("TRACKING", boxX + 8, boxY + 18);
  v14f1Ctx.fillStyle = "#ffffff";
  v14f1Ctx.font = "11px monospace";
  const entityName = (
    trackedEntity.name || "Entity " + window.espTrackedEntityId
  ).substring(0, 18);
  v14f1Ctx.fillText(entityName, boxX + 8, boxY + 34);
  v14f1Ctx.fillStyle = "#ff00ff";
  v14f1Ctx.font = "bold 14px monospace";
  v14f1Ctx.fillText(Math.round(distance) + " units", boxX + 8, boxY + 52);
  if (
    screenX < 0 ||
    screenX > v4581Canvas.width ||
    screenY < 0 ||
    screenY > v4581Canvas.height
  ) {
    const targetAngle = Math.atan2(
      screenY - v4812CenterY,
      screenX - v15eaCenterX,
    );
    const posX =
      v15eaCenterX + Math.cos(targetAngle) * (v4581Canvas.width / 2 - 40);
    const posY =
      v4812CenterY + Math.sin(targetAngle) * (v4581Canvas.height / 2 - 40);
    v14f1Ctx.fillStyle = "rgba(0,0,0,0.85)";
    v14f1Ctx.beginPath();
    v14f1Ctx.roundRect(posX - 40, posY - 15, 80, 30, 4);
    v14f1Ctx.fill();
    v14f1Ctx.strokeStyle = "#ff00ff";
    v14f1Ctx.lineWidth = 1.5;
    v14f1Ctx.stroke();
    v14f1Ctx.beginPath();
    v14f1Ctx.moveTo(
      posX + Math.cos(targetAngle) * 20,
      posY + Math.sin(targetAngle) * 20,
    );
    v14f1Ctx.lineTo(
      posX - Math.cos(targetAngle - 0.5) * 10,
      posY - Math.sin(targetAngle - 0.5) * 10,
    );
    v14f1Ctx.lineTo(
      posX - Math.cos(targetAngle + 0.5) * 10,
      posY - Math.sin(targetAngle + 0.5) * 10,
    );
    v14f1Ctx.closePath();
    v14f1Ctx.fillStyle = "#ff00ff";
    v14f1Ctx.fill();
    v14f1Ctx.fillStyle = "#ffffff";
    v14f1Ctx.font = "bold 11px monospace";
    v14f1Ctx.textAlign = "center";
    v14f1Ctx.fillText(Math.round(distance).toString(), posX, posY + 4);
    v14f1Ctx.textAlign = "left";
  }
}
function renderEspLoop() {
  if (!window.espEnabled) {
    const v39f2OverlayCanvas = document.getElementById("esp-overlay");
    if (v39f2OverlayCanvas) {
      const overlayCtx = v39f2OverlayCanvas.getContext("2d");
      overlayCtx.clearRect(
        0,
        0,
        v39f2OverlayCanvas.width,
        v39f2OverlayCanvas.height,
      );
    }
    requestAnimationFrame(renderEspLoop);
    return;
  }
  const espCanvas = createEspOverlay();
  const c073Ctx = espCanvas.getContext("2d");
  c073Ctx.clearRect(0, 0, espCanvas.width, espCanvas.height);
  const v237fEntities = getNearbyEntities();
  const playerData = getFirstAnimalPosition();
  const renderScale = getZoomLevel();
  const v2cc0CenterX = espCanvas.width / 2;
  const v441fCenterY = espCanvas.height / 2;
  drawEsp(c073Ctx, v237fEntities, v2cc0CenterX, v441fCenterY, renderScale);
  drawTrackedEntity(c073Ctx, espCanvas, playerData, renderScale);
  drawRadar(c073Ctx, espCanvas, v237fEntities);
  requestAnimationFrame(renderEspLoop);
}
function toggleEsp() {
  window.espEnabled = !window.espEnabled;
  showToast(window.espEnabled ? "ESP enabled" : "ESP disabled");
}
function trackPlayer() {
  const v11abGameData = getNearbyEntities();
  if (
    v11abGameData &&
    v11abGameData.players &&
    v11abGameData.players.length > 0
  ) {
    window.espTrackedEntityId = v11abGameData.players[0].id;
    showToast(
      "Tracking: " +
        (v11abGameData.players[0].entity?.name || window.espTrackedEntityId),
    );
  } else {
    showToast("No players nearby");
  }
}
function globalToggleEsp() {
  window.espTrackedEntityId = null;
  showToast("Tracking cleared");
}
function v55bbToggleEsp() {
  window.autoDodgeEnabled = false;
  showToast("Auto dodge disabled");
}
function toggleMinimapSize() {
  if (!PlayerData || !PlayerData.minimap) {
    showToast("Minimap not available");
    return;
  }
  if (state.boolIsToggled) {
    PlayerData.minimap.scale.set(1);
    PlayerData.minimap.pivot.set(0, 0);
    state.boolIsToggled = false;
    showToast("Minimap restored");
  } else {
    PlayerData.minimap.scale.set(0.5);
    PlayerData.minimap.pivot.set(-70, -45);
    state.boolIsToggled = true;
    showToast("Small minimap enabled");
  }
}

export {
  createEspOverlay,
  drawEsp,
  drawTrackedEntity,
  renderEspLoop,
  toggleEsp,
  trackPlayer,
  globalToggleEsp,
  v55bbToggleEsp,
  toggleMinimapSize,
};
