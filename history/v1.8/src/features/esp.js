import {
  gameInstance,
  getEntityPosition,
  calculateDirection,
  findEntityById,
  getFirstAnimalPosition,
  playerData,
  state,
} from "../core.js";
import {
  isPlayer,
  calculateDistance,
  getNearbyEntities,
  getZoomScale,
  getOrCreateOverlayCanvas,
} from "../utils.js";
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

function drawEsp(v5568Ctx, v136aGameState, v4893OffsetX, v5815OffsetY, scale) {
  if (!v136aGameState || v136aGameState.error) {
    return;
  }
  const myPos = v136aGameState.myPos;
  const espMode = window.espMode;
  const trackedId = window.espTrackedEntityId;
  let entities =
    espMode === "players"
      ? v136aGameState.players || []
      : v136aGameState.food || [];
  let viewportOffsetX = 0;
  let viewportOffsetY = 0;
  try {
    if (gameInstance?.viewport) {
      const v2067Viewport = gameInstance.viewport;
      if (v2067Viewport.center && v2067Viewport.center.x != null) {
        viewportOffsetX = (v2067Viewport.center.x - myPos.x) * scale;
        viewportOffsetY = (v2067Viewport.center.y - myPos.y) * scale;
      }
    }
  } catch (err) {}
  entities.forEach((v2f06Entity) => {
    const v431cDeltaX = v2f06Entity.x - myPos.x;
    const v1e95DeltaY = v2f06Entity.y - myPos.y;
    const v2dd0ScreenX = v4893OffsetX + v431cDeltaX * scale - viewportOffsetX;
    const v3ff3ScreenY = v5815OffsetY + v1e95DeltaY * scale - viewportOffsetY;
    const isTracked = trackedId && v2f06Entity.id === trackedId;
    const boxSize = 20;
    let v344aEspColor;
    if (espMode === "players") {
      v344aEspColor = isTracked
        ? window.espColors.tracked
        : v2f06Entity.distance < 500
          ? window.espColors.close
          : v2f06Entity.distance < 1500
            ? window.espColors.medium
            : v2f06Entity.distance < 3000
              ? window.espColors.far
              : window.espColors.veryFar;
      v5568Ctx.strokeStyle = v344aEspColor;
      v5568Ctx.lineWidth = isTracked ? 3 : 2;
      v5568Ctx.strokeRect(
        v2dd0ScreenX - boxSize / 2,
        v3ff3ScreenY - boxSize / 2,
        boxSize,
        boxSize,
      );
      v5568Ctx.fillStyle = v344aEspColor;
      v5568Ctx.font = "bold 11px monospace";
      v5568Ctx.fillText(
        v2f06Entity.entity?.name || "ID:" + v2f06Entity.id,
        v2dd0ScreenX - boxSize / 2,
        v3ff3ScreenY - boxSize / 2 - 8,
      );
      v5568Ctx.font = "10px monospace";
      v5568Ctx.fillText(
        Math.round(v2f06Entity.distance).toString(),
        v2dd0ScreenX - boxSize / 2,
        v3ff3ScreenY + boxSize / 2 + 13,
      );
      if (v2f06Entity.entity?.visibleFishLevel != null) {
        v5568Ctx.fillText(
          "Lvl:" + v2f06Entity.entity.visibleFishLevel,
          v2dd0ScreenX - boxSize / 2,
          v3ff3ScreenY + boxSize / 2 + 24,
        );
      }
      if (window.lockEnabled && window.lockTargetId === v2f06Entity.id) {
        v5568Ctx.strokeStyle = "#ff0000";
        v5568Ctx.lineWidth = 2;
        const offset = 15;
        v5568Ctx.beginPath();
        v5568Ctx.moveTo(v2dd0ScreenX - offset, v3ff3ScreenY);
        v5568Ctx.lineTo(v2dd0ScreenX + offset, v3ff3ScreenY);
        v5568Ctx.moveTo(v2dd0ScreenX, v3ff3ScreenY - offset);
        v5568Ctx.lineTo(v2dd0ScreenX, v3ff3ScreenY + offset);
        v5568Ctx.stroke();
        v5568Ctx.beginPath();
        v5568Ctx.arc(v2dd0ScreenX, v3ff3ScreenY, offset, 0, Math.PI * 2);
        v5568Ctx.strokeStyle = "rgba(255,0,0,0.7)";
        v5568Ctx.stroke();
        v5568Ctx.fillStyle = "#ff0000";
        v5568Ctx.font = "bold 10px monospace";
        v5568Ctx.fillText(
          "LOCKED",
          v2dd0ScreenX + offset + 4,
          v3ff3ScreenY - 4,
        );
      }
      v5568Ctx.beginPath();
      v5568Ctx.moveTo(v4893OffsetX, v5815OffsetY);
      v5568Ctx.lineTo(v2dd0ScreenX, v3ff3ScreenY);
      v5568Ctx.strokeStyle = v344aEspColor;
      v5568Ctx.globalAlpha = 0.25;
      v5568Ctx.lineWidth = 1;
      v5568Ctx.stroke();
      v5568Ctx.globalAlpha = 1;
    } else {
      v344aEspColor =
        v2f06Entity.distance < 300
          ? window.espColors.foodClose
          : v2f06Entity.distance < 1000
            ? window.espColors.foodMedium
            : window.espColors.foodFar;
      v5568Ctx.strokeStyle = v344aEspColor;
      v5568Ctx.lineWidth = 1.5;
      v5568Ctx.strokeRect(
        v2dd0ScreenX - boxSize / 2,
        v3ff3ScreenY - boxSize / 2,
        boxSize,
        boxSize,
      );
      if (v2f06Entity.distance < 1000) {
        v5568Ctx.fillStyle = v344aEspColor;
        v5568Ctx.font = "9px monospace";
        v5568Ctx.fillText(
          Math.round(v2f06Entity.distance).toString(),
          v2dd0ScreenX + boxSize / 2 + 3,
          v3ff3ScreenY + 3,
        );
      }
    }
  });
}
function drawTrackedEntity(v3ef8Ctx, v704bCanvas, v22dcMyPos, v2af4Scale) {
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
  if (!entityPos || !v22dcMyPos) {
    return;
  }
  const v552bCenterX = v704bCanvas.width / 2;
  const v171aCenterY = v704bCanvas.height / 2;
  const deltaX = entityPos.x - v22dcMyPos.x;
  const deltaY = entityPos.y - v22dcMyPos.y;
  const screenX = v552bCenterX + deltaX * v2af4Scale;
  const screenY = v171aCenterY + deltaY * v2af4Scale;
  const v400eDistance = calculateDistance(
    v22dcMyPos.x,
    v22dcMyPos.y,
    entityPos.x,
    entityPos.y,
  );
  const entityDir = calculateDirection(trackedEntity);
  const pulseOpacity = Math.sin(Date.now() / 200) * 0.3 + 0.7;
  const markerSize = 40;
  v3ef8Ctx.beginPath();
  v3ef8Ctx.moveTo(v552bCenterX, v171aCenterY);
  v3ef8Ctx.lineTo(screenX, screenY);
  v3ef8Ctx.strokeStyle = "rgba(255,0,255,0.6)";
  v3ef8Ctx.lineWidth = 2;
  v3ef8Ctx.setLineDash([8, 4]);
  v3ef8Ctx.stroke();
  v3ef8Ctx.setLineDash([]);
  v3ef8Ctx.strokeStyle = "rgba(255,0,255," + pulseOpacity + ")";
  v3ef8Ctx.lineWidth = 3;
  v3ef8Ctx.strokeRect(
    screenX - markerSize / 2,
    screenY - markerSize / 2,
    markerSize,
    markerSize,
  );
  const arrowLength = 50;
  const f734Angle = Math.atan2(entityDir.dirY, entityDir.dirX);
  v3ef8Ctx.beginPath();
  v3ef8Ctx.moveTo(screenX, screenY);
  v3ef8Ctx.lineTo(
    screenX + entityDir.dirX * arrowLength,
    screenY + entityDir.dirY * arrowLength,
  );
  v3ef8Ctx.strokeStyle = "#ff00ff";
  v3ef8Ctx.lineWidth = 2;
  v3ef8Ctx.stroke();
  v3ef8Ctx.beginPath();
  v3ef8Ctx.moveTo(
    screenX + entityDir.dirX * arrowLength,
    screenY + entityDir.dirY * arrowLength,
  );
  v3ef8Ctx.lineTo(
    screenX + entityDir.dirX * arrowLength - Math.cos(f734Angle - 0.4) * 10,
    screenY + entityDir.dirY * arrowLength - Math.sin(f734Angle - 0.4) * 10,
  );
  v3ef8Ctx.moveTo(
    screenX + entityDir.dirX * arrowLength,
    screenY + entityDir.dirY * arrowLength,
  );
  v3ef8Ctx.lineTo(
    screenX + entityDir.dirX * arrowLength - Math.cos(f734Angle + 0.4) * 10,
    screenY + entityDir.dirY * arrowLength - Math.sin(f734Angle + 0.4) * 10,
  );
  v3ef8Ctx.strokeStyle = "#ff00ff";
  v3ef8Ctx.lineWidth = 2;
  v3ef8Ctx.stroke();
  const rectWidth = 180;
  const rectHeight = 70;
  const boxX = Math.min(
    screenX + markerSize / 2 + 10,
    v704bCanvas.width - rectWidth - 5,
  );
  const boxY = Math.max(
    5,
    Math.min(screenY - rectHeight / 2, v704bCanvas.height - rectHeight - 5),
  );
  v3ef8Ctx.fillStyle = "rgba(0,0,0,0.85)";
  v3ef8Ctx.strokeStyle = "rgba(255,0,255," + pulseOpacity + ")";
  v3ef8Ctx.lineWidth = 1.5;
  v3ef8Ctx.beginPath();
  v3ef8Ctx.roundRect(boxX, boxY, rectWidth, rectHeight, 4);
  v3ef8Ctx.fill();
  v3ef8Ctx.stroke();
  v3ef8Ctx.fillStyle = "#ff00ff";
  v3ef8Ctx.font = "bold 12px monospace";
  v3ef8Ctx.fillText("TRACKING", boxX + 8, boxY + 18);
  v3ef8Ctx.fillStyle = "#ffffff";
  v3ef8Ctx.font = "11px monospace";
  v3ef8Ctx.fillText(
    (trackedEntity.name || "Entity " + window.espTrackedEntityId).substring(
      0,
      18,
    ),
    boxX + 8,
    boxY + 34,
  );
  v3ef8Ctx.fillStyle = "#ff00ff";
  v3ef8Ctx.font = "bold 14px monospace";
  v3ef8Ctx.fillText(Math.round(v400eDistance) + " units", boxX + 8, boxY + 52);
  if (
    screenX < 0 ||
    screenX > v704bCanvas.width ||
    screenY < 0 ||
    screenY > v704bCanvas.height
  ) {
    const targetAngle = Math.atan2(
      screenY - v171aCenterY,
      screenX - v552bCenterX,
    );
    const posX =
      v552bCenterX + Math.cos(targetAngle) * (v704bCanvas.width / 2 - 40);
    const posY =
      v171aCenterY + Math.sin(targetAngle) * (v704bCanvas.height / 2 - 40);
    v3ef8Ctx.fillStyle = "rgba(0,0,0,0.85)";
    v3ef8Ctx.beginPath();
    v3ef8Ctx.roundRect(posX - 40, posY - 15, 80, 30, 4);
    v3ef8Ctx.fill();
    v3ef8Ctx.strokeStyle = "#ff00ff";
    v3ef8Ctx.lineWidth = 1.5;
    v3ef8Ctx.stroke();
    v3ef8Ctx.beginPath();
    v3ef8Ctx.moveTo(
      posX + Math.cos(targetAngle) * 20,
      posY + Math.sin(targetAngle) * 20,
    );
    v3ef8Ctx.lineTo(
      posX - Math.cos(targetAngle - 0.5) * 10,
      posY - Math.sin(targetAngle - 0.5) * 10,
    );
    v3ef8Ctx.lineTo(
      posX - Math.cos(targetAngle + 0.5) * 10,
      posY - Math.sin(targetAngle + 0.5) * 10,
    );
    v3ef8Ctx.closePath();
    v3ef8Ctx.fillStyle = "#ff00ff";
    v3ef8Ctx.fill();
    v3ef8Ctx.fillStyle = "#ffffff";
    v3ef8Ctx.font = "bold 11px monospace";
    v3ef8Ctx.textAlign = "center";
    v3ef8Ctx.fillText(Math.round(v400eDistance).toString(), posX, posY + 4);
    v3ef8Ctx.textAlign = "left";
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
  const eba1Ctx = espCanvas.getContext("2d");
  eba1Ctx.clearRect(0, 0, espCanvas.width, espCanvas.height);
  const crosshairPos = getNearbyEntities();
  const v4929PlayerPos = getFirstAnimalPosition();
  const espColor = getZoomScale();
  drawEsp(
    eba1Ctx,
    crosshairPos,
    espCanvas.width / 2,
    espCanvas.height / 2,
    espColor,
  );
  drawTrackedEntity(eba1Ctx, espCanvas, v4929PlayerPos, espColor);
  drawRadar(eba1Ctx, espCanvas, crosshairPos);
  requestAnimationFrame(renderEspLoop);
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
function modToggleEsp() {
  window.espTrackedEntityId = null;
  showNotification("Tracking cleared");
}
function v571eToggleEsp() {
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
  drawEsp,
  drawTrackedEntity,
  renderEspLoop,
  toggleEsp,
  trackPlayer,
  modToggleEsp,
  v571eToggleEsp,
  toggleMinimapSize,
};
