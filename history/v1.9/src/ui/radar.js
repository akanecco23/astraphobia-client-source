import {
  getEntityPosition,
  findEntityById,
  dragState,
  state,
} from "../core.js";

window.lockEnabled = false;
window.lockTargetId = null;

function updateLockButton() {
  const lockButton = document.getElementById("lockBtn");
  if (lockButton) {
    lockButton.textContent =
      window.lockEnabled && window.lockTargetId ? "Unlock" : "Lock Nearest";
    lockButton.classList.toggle(
      "toggle-on",
      !!window.lockEnabled && !!window.lockTargetId,
    );
  }
}
function drawRadar(ctx, canvas, gameData) {
  if (!gameData || gameData.error) {
    return;
  }
  const radarSize = 150;
  if (dragState.x === null) {
    dragState.x = canvas.width - radarSize - 20;
  }
  const radarX = dragState.x;
  const radarY = dragState.y;
  const worldScale = 5000;
  const pixelPerUnit = radarSize / (worldScale * 2);
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
  for (let circleStep = 0.25; circleStep <= 1; circleStep += 0.25) {
    ctx.beginPath();
    ctx.arc(
      radarX + radarSize / 2,
      radarY + radarSize / 2,
      (radarSize / 2) * circleStep,
      0,
      Math.PI * 2,
    );
    ctx.strokeStyle = "rgba(60,60,60," + (0.2 + circleStep * 0.1) + ")";
    ctx.stroke();
  }
  ctx.fillStyle = "#1db954";
  ctx.beginPath();
  ctx.arc(radarX + radarSize / 2, radarY + radarSize / 2, 4, 0, Math.PI * 2);
  ctx.fill();
  const entities =
    window.espMode === "players" ? gameData.players || [] : gameData.food || [];
  entities.forEach((targetEntity) => {
    const diffX = targetEntity.x - gameData.myPos.x;
    const diffY = targetEntity.y - gameData.myPos.y;
    let circleX = Math.max(
      radarX + 2,
      Math.min(
        radarX + radarSize - 2,
        radarX + radarSize / 2 + diffX * pixelPerUnit,
      ),
    );
    let circleY = Math.max(
      radarY + 2,
      Math.min(
        radarY + radarSize - 2,
        radarY + radarSize / 2 + diffY * pixelPerUnit,
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
    ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
    ctx.fill();
  });
  if (window.entityTrailEnabled && window.entityTrailTargetId) {
    const targetEntityId = findEntityById(window.entityTrailTargetId);
    if (targetEntityId) {
      const targetEntityPos = getEntityPosition(targetEntityId);
      if (targetEntityPos) {
        const deltaY = targetEntityPos.x - gameData.myPos.x;
        const deltaY_l9z = targetEntityPos.y - gameData.myPos.y;
        const drawY = Math.max(
          radarX + 2,
          Math.min(
            radarX + radarSize - 2,
            radarX + radarSize / 2 + deltaY * pixelPerUnit,
          ),
        );
        const drawY_mb4 = Math.max(
          radarY + 2,
          Math.min(
            radarY + radarSize - 2,
            radarY + radarSize / 2 + deltaY_l9z * pixelPerUnit,
          ),
        );
        const alpha = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        const { r: red, g: blue, b: blue_m3y } = window.entityTrailColor;
        const rgbValue = red + "," + blue + "," + blue_m3y;
        ctx.strokeStyle = "rgba(" + rgbValue + "," + alpha + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(drawY, drawY_mb4, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(" + rgbValue + "," + alpha * 0.5 + ")";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(drawY, drawY_mb4, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgb(" + rgbValue + ")";
        ctx.beginPath();
        ctx.arc(drawY, drawY_mb4, 3, 0, Math.PI * 2);
        ctx.fill();
        if (window.entityTrailHistory.length > 1) {
          ctx.strokeStyle = "rgba(" + rgbValue + ",0.3)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          window.entityTrailHistory.forEach((entity, entityIndex) => {
            const lineX = Math.max(
              radarX + 2,
              Math.min(
                radarX + radarSize - 2,
                radarX +
                  radarSize / 2 +
                  (entity.x - gameData.myPos.x) * pixelPerUnit,
              ),
            );
            const lineY = Math.max(
              radarY + 2,
              Math.min(
                radarY + radarSize - 2,
                radarY +
                  radarSize / 2 +
                  (entity.y - gameData.myPos.y) * pixelPerUnit,
              ),
            );
            if (entityIndex === 0) {
              ctx.moveTo(lineX, lineY);
            } else {
              ctx.lineTo(lineX, lineY);
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
    (window.espMode === "players" ? "P:" : "F:") + entities.length,
    radarX + radarSize - 50,
    radarY + radarSize + 14,
  );
}
function initRadarDrag() {
  if (window._radarDragInit) {
    return;
  }
  window._radarDragInit = true;
  document.addEventListener(
    "mousedown",
    (updateRadar) => {
      const radarBounds = window._radarBounds;
      if (!radarBounds || !window.espEnabled) {
        return;
      }
      if (
        updateRadar.clientX >= radarBounds.x &&
        updateRadar.clientX <= radarBounds.x + radarBounds.w &&
        updateRadar.clientY >= radarBounds.y &&
        updateRadar.clientY <= radarBounds.y + radarBounds.h
      ) {
        dragState.dragging = true;
        dragState.offsetX = updateRadar.clientX - radarBounds.x;
        dragState.offsetY = updateRadar.clientY - radarBounds.y;
        updateRadar.preventDefault();
        updateRadar.stopPropagation();
      }
    },
    true,
  );
  document.addEventListener(
    "mousemove",
    (mouseMoveEvent) => {
      if (!dragState.dragging) {
        return;
      }
      dragState.x = mouseMoveEvent.clientX - dragState.offsetX;
      dragState.y = mouseMoveEvent.clientY - dragState.offsetY;
      mouseMoveEvent.preventDefault();
    },
    true,
  );
  document.addEventListener(
    "mouseup",
    (mouseUpEvent) => {
      if (dragState.dragging) {
        dragState.dragging = false;
        mouseUpEvent.preventDefault();
      }
    },
    true,
  );
}

export { updateLockButton, drawRadar, initRadarDrag };
