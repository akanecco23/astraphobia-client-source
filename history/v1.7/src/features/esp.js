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
  playerData,
  state,
} from "../core.js";
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

function drawEspEntities(
  v8d34Ctx,
  v3a5cGameState,
  v5a9fOffsetX,
  v3d86OffsetY,
  scale,
) {
  if (!v3a5cGameState || v3a5cGameState.error) {
    return;
  }
  const myPos = v3a5cGameState.myPos;
  const espMode = window.espMode;
  const trackedEntityId = window.espTrackedEntityId;
  let v528fEntities =
    espMode === "players"
      ? v3a5cGameState.players || []
      : v3a5cGameState.food || [];
  v528fEntities.forEach((v1be9Entity) => {
    const v10adDeltaX = v1be9Entity.x - myPos.x;
    const v5777DeltaY = v1be9Entity.y - myPos.y;
    const v52faScreenX = v5a9fOffsetX + v10adDeltaX * scale;
    const v3d34ScreenY = v3d86OffsetY + v5777DeltaY * scale;
    const isTracked = trackedEntityId && v1be9Entity.id === trackedEntityId;
    const v4f0eBoxSize = 20;
    let entityColor;
    if (espMode === "players") {
      entityColor = isTracked
        ? window.espColors.tracked
        : v1be9Entity.distance < 500
          ? window.espColors.close
          : v1be9Entity.distance < 1500
            ? window.espColors.medium
            : v1be9Entity.distance < 3000
              ? window.espColors.far
              : window.espColors.veryFar;
      v8d34Ctx.strokeStyle = entityColor;
      v8d34Ctx.lineWidth = isTracked ? 3 : 2;
      v8d34Ctx.strokeRect(
        v52faScreenX - v4f0eBoxSize / 2,
        v3d34ScreenY - v4f0eBoxSize / 2,
        v4f0eBoxSize,
        v4f0eBoxSize,
      );
      v8d34Ctx.fillStyle = entityColor;
      v8d34Ctx.font = "bold 11px monospace";
      v8d34Ctx.fillText(
        v1be9Entity.entity?.name || "ID:" + v1be9Entity.id,
        v52faScreenX - v4f0eBoxSize / 2,
        v3d34ScreenY - v4f0eBoxSize / 2 - 8,
      );
      v8d34Ctx.font = "10px monospace";
      v8d34Ctx.fillText(
        Math.round(v1be9Entity.distance).toString(),
        v52faScreenX - v4f0eBoxSize / 2,
        v3d34ScreenY + v4f0eBoxSize / 2 + 13,
      );
      if (v1be9Entity.entity?.visibleFishLevel != null) {
        v8d34Ctx.fillText(
          "Lvl:" + v1be9Entity.entity.visibleFishLevel,
          v52faScreenX - v4f0eBoxSize / 2,
          v3d34ScreenY + v4f0eBoxSize / 2 + 24,
        );
      }
      if (window.lockEnabled && window.lockTargetId === v1be9Entity.id) {
        v8d34Ctx.strokeStyle = "#ff0000";
        v8d34Ctx.lineWidth = 2;
        const drawOffset = 15;
        v8d34Ctx.beginPath();
        v8d34Ctx.moveTo(v52faScreenX - drawOffset, v3d34ScreenY);
        v8d34Ctx.lineTo(v52faScreenX + drawOffset, v3d34ScreenY);
        v8d34Ctx.moveTo(v52faScreenX, v3d34ScreenY - drawOffset);
        v8d34Ctx.lineTo(v52faScreenX, v3d34ScreenY + drawOffset);
        v8d34Ctx.stroke();
        v8d34Ctx.beginPath();
        v8d34Ctx.arc(v52faScreenX, v3d34ScreenY, drawOffset, 0, Math.PI * 2);
        v8d34Ctx.strokeStyle = "rgba(255,0,0,0.7)";
        v8d34Ctx.stroke();
        v8d34Ctx.fillStyle = "#ff0000";
        v8d34Ctx.font = "bold 10px monospace";
        v8d34Ctx.fillText(
          "LOCKED",
          v52faScreenX + drawOffset + 4,
          v3d34ScreenY - 4,
        );
      }
      v8d34Ctx.beginPath();
      v8d34Ctx.moveTo(v5a9fOffsetX, v3d86OffsetY);
      v8d34Ctx.lineTo(v52faScreenX, v3d34ScreenY);
      v8d34Ctx.strokeStyle = entityColor;
      v8d34Ctx.globalAlpha = 0.25;
      v8d34Ctx.lineWidth = 1;
      v8d34Ctx.stroke();
      v8d34Ctx.globalAlpha = 1;
    } else {
      entityColor =
        v1be9Entity.distance < 300
          ? window.espColors.foodClose
          : v1be9Entity.distance < 1000
            ? window.espColors.foodMedium
            : window.espColors.foodFar;
      v8d34Ctx.strokeStyle = entityColor;
      v8d34Ctx.lineWidth = 1.5;
      v8d34Ctx.strokeRect(
        v52faScreenX - v4f0eBoxSize / 2,
        v3d34ScreenY - v4f0eBoxSize / 2,
        v4f0eBoxSize,
        v4f0eBoxSize,
      );
      if (v1be9Entity.distance < 1000) {
        v8d34Ctx.fillStyle = entityColor;
        v8d34Ctx.font = "9px monospace";
        v8d34Ctx.fillText(
          Math.round(v1be9Entity.distance).toString(),
          v52faScreenX + v4f0eBoxSize / 2 + 3,
          v3d34ScreenY + 3,
        );
      }
    }
  });
}
function drawTrackedEntityIndicator(
  v116cCtx,
  v4641Canvas,
  v2c54MyPos,
  v5f42Scale,
) {
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
  if (!entityPos || !v2c54MyPos) {
    return;
  }
  const v44f2CenterX = v4641Canvas.width / 2;
  const v59f7CenterY = v4641Canvas.height / 2;
  const v11d1DiffX = entityPos.x - v2c54MyPos.x;
  const v55e5DiffY = entityPos.y - v2c54MyPos.y;
  const screenX = v44f2CenterX + v11d1DiffX * v5f42Scale;
  const screenY = v59f7CenterY + v55e5DiffY * v5f42Scale;
  const v1637Distance = calculateDistance(
    v2c54MyPos.x,
    v2c54MyPos.y,
    entityPos.x,
    entityPos.y,
  );
  const entityDir = calculateDirection(trackedEntity);
  const pulseOpacity = Math.sin(Date.now() / 200) * 0.3 + 0.7;
  const boxSize = 40;
  v116cCtx.beginPath();
  v116cCtx.moveTo(v44f2CenterX, v59f7CenterY);
  v116cCtx.lineTo(screenX, screenY);
  v116cCtx.strokeStyle = "rgba(255,0,255,0.6)";
  v116cCtx.lineWidth = 2;
  v116cCtx.setLineDash([8, 4]);
  v116cCtx.stroke();
  v116cCtx.setLineDash([]);
  v116cCtx.strokeStyle = "rgba(255,0,255," + pulseOpacity + ")";
  v116cCtx.lineWidth = 3;
  v116cCtx.strokeRect(
    screenX - boxSize / 2,
    screenY - boxSize / 2,
    boxSize,
    boxSize,
  );
  const dirLineLength = 50;
  const v1e6eAngle = Math.atan2(entityDir.dirY, entityDir.dirX);
  v116cCtx.beginPath();
  v116cCtx.moveTo(screenX, screenY);
  v116cCtx.lineTo(
    screenX + entityDir.dirX * dirLineLength,
    screenY + entityDir.dirY * dirLineLength,
  );
  v116cCtx.strokeStyle = "#ff00ff";
  v116cCtx.lineWidth = 2;
  v116cCtx.stroke();
  v116cCtx.beginPath();
  v116cCtx.moveTo(
    screenX + entityDir.dirX * dirLineLength,
    screenY + entityDir.dirY * dirLineLength,
  );
  v116cCtx.lineTo(
    screenX + entityDir.dirX * dirLineLength - Math.cos(v1e6eAngle - 0.4) * 10,
    screenY + entityDir.dirY * dirLineLength - Math.sin(v1e6eAngle - 0.4) * 10,
  );
  v116cCtx.moveTo(
    screenX + entityDir.dirX * dirLineLength,
    screenY + entityDir.dirY * dirLineLength,
  );
  v116cCtx.lineTo(
    screenX + entityDir.dirX * dirLineLength - Math.cos(v1e6eAngle + 0.4) * 10,
    screenY + entityDir.dirY * dirLineLength - Math.sin(v1e6eAngle + 0.4) * 10,
  );
  v116cCtx.strokeStyle = "#ff00ff";
  v116cCtx.lineWidth = 2;
  v116cCtx.stroke();
  const rectWidth = 180;
  const rectHeight = 70;
  const boxX = Math.min(
    screenX + boxSize / 2 + 10,
    v4641Canvas.width - rectWidth - 5,
  );
  const boxY = Math.max(
    5,
    Math.min(screenY - rectHeight / 2, v4641Canvas.height - rectHeight - 5),
  );
  v116cCtx.fillStyle = "rgba(0,0,0,0.85)";
  v116cCtx.strokeStyle = "rgba(255,0,255," + pulseOpacity + ")";
  v116cCtx.lineWidth = 1.5;
  v116cCtx.beginPath();
  v116cCtx.roundRect(boxX, boxY, rectWidth, rectHeight, 4);
  v116cCtx.fill();
  v116cCtx.stroke();
  v116cCtx.fillStyle = "#ff00ff";
  v116cCtx.font = "bold 12px monospace";
  v116cCtx.fillText("TRACKING", boxX + 8, boxY + 18);
  v116cCtx.fillStyle = "#ffffff";
  v116cCtx.font = "11px monospace";
  v116cCtx.fillText(
    (trackedEntity.name || "Entity " + window.espTrackedEntityId).substring(
      0,
      18,
    ),
    boxX + 8,
    boxY + 34,
  );
  v116cCtx.fillStyle = "#ff00ff";
  v116cCtx.font = "bold 14px monospace";
  v116cCtx.fillText(Math.round(v1637Distance) + " units", boxX + 8, boxY + 52);
  if (
    screenX < 0 ||
    screenX > v4641Canvas.width ||
    screenY < 0 ||
    screenY > v4641Canvas.height
  ) {
    const targetAngle = Math.atan2(
      screenY - v59f7CenterY,
      screenX - v44f2CenterX,
    );
    const posX =
      v44f2CenterX + Math.cos(targetAngle) * (v4641Canvas.width / 2 - 40);
    const posY =
      v59f7CenterY + Math.sin(targetAngle) * (v4641Canvas.height / 2 - 40);
    v116cCtx.fillStyle = "rgba(0,0,0,0.85)";
    v116cCtx.beginPath();
    v116cCtx.roundRect(posX - 40, posY - 15, 80, 30, 4);
    v116cCtx.fill();
    v116cCtx.strokeStyle = "#ff00ff";
    v116cCtx.lineWidth = 1.5;
    v116cCtx.stroke();
    v116cCtx.beginPath();
    v116cCtx.moveTo(
      posX + Math.cos(targetAngle) * 20,
      posY + Math.sin(targetAngle) * 20,
    );
    v116cCtx.lineTo(
      posX - Math.cos(targetAngle - 0.5) * 10,
      posY - Math.sin(targetAngle - 0.5) * 10,
    );
    v116cCtx.lineTo(
      posX - Math.cos(targetAngle + 0.5) * 10,
      posY - Math.sin(targetAngle + 0.5) * 10,
    );
    v116cCtx.closePath();
    v116cCtx.fillStyle = "#ff00ff";
    v116cCtx.fill();
    v116cCtx.fillStyle = "#ffffff";
    v116cCtx.font = "bold 11px monospace";
    v116cCtx.textAlign = "center";
    v116cCtx.fillText(Math.round(v1637Distance).toString(), posX, posY + 4);
    v116cCtx.textAlign = "left";
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
  const v5615Canvas = getOrCreateOverlayCanvas("esp-overlay", 999998);
  const v5379Ctx = v5615Canvas.getContext("2d");
  v5379Ctx.clearRect(0, 0, v5615Canvas.width, v5615Canvas.height);
  const v9036Entities = getNearbyEntities();
  const localPlayer = getFirstAnimalPosition();
  const v47a2ZoomLevel = getZoomLevel();
  drawEspEntities(
    v5379Ctx,
    v9036Entities,
    v5615Canvas.width / 2,
    v5615Canvas.height / 2,
    v47a2ZoomLevel,
  );
  drawTrackedEntityIndicator(
    v5379Ctx,
    v5615Canvas,
    localPlayer,
    v47a2ZoomLevel,
  );
  drawRadar(v5379Ctx, v5615Canvas, v9036Entities);
  requestAnimationFrame(renderEspOverlay);
}
function toggleEsp() {
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
function mainToggleEsp() {
  window.espTrackedEntityId = null;
  showNotification("Tracking cleared");
}
function sysToggleEsp() {
  window.autoDodgeEnabled = false;
  showNotification("Auto dodge disabled");
}
function toggleMinimapSize() {
  if (!playerData || !playerData.minimap) {
    showNotification("Minimap not available");
    return;
  }
  if (state.boolIsToggled) {
    playerData.minimap.scale.set(1);
    playerData.minimap.pivot.set(0, 0);
    state.boolIsToggled = false;
    showNotification("Minimap restored");
  } else {
    playerData.minimap.scale.set(0.5);
    playerData.minimap.pivot.set(-70, -45);
    state.boolIsToggled = true;
    showNotification("Small minimap enabled");
  }
}

export {
  drawEspEntities,
  drawTrackedEntityIndicator,
  renderEspOverlay,
  toggleEsp,
  trackPlayer,
  mainToggleEsp,
  sysToggleEsp,
  toggleMinimapSize,
};
