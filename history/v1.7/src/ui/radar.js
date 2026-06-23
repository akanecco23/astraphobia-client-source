import { getEntityById } from "../utils.js";
import { getEntityPosition, dragState, state } from "../core.js";

window.lockEnabled = false;
window.lockTargetId = null;

function updateLockButtonUI() {
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
  const worldRange = 5000;
  const radarScale = radarSize / (worldRange * 2);
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
  const entities =
    window.espMode === "players"
      ? gameState.players || []
      : gameState.food || [];
  entities.forEach((target) => {
    const deltaX = target.x - gameState.myPos.x;
    const deltaY = target.y - gameState.myPos.y;
    let screenX = Math.max(
      radarX + 2,
      Math.min(
        radarX + radarSize - 2,
        radarX + radarSize / 2 + deltaX * radarScale,
      ),
    );
    let screenY = Math.max(
      radarY + 2,
      Math.min(
        radarY + radarSize - 2,
        radarY + radarSize / 2 + deltaY * radarScale,
      ),
    );
    let espColor;
    let dotRadius;
    if (window.espMode === "players") {
      espColor =
        target.distance < 500
          ? window.espColors.close
          : target.distance < 1500
            ? window.espColors.medium
            : target.distance < 3000
              ? window.espColors.far
              : "#888";
      dotRadius = 3;
    } else {
      espColor = window.espColors.foodClose;
      dotRadius = 1.5;
    }
    if (window.espTrackedEntityId && target.id === window.espTrackedEntityId) {
      espColor = window.espColors.tracked;
      dotRadius = 4;
    }
    if (window.lockTargetId && target.id === window.lockTargetId) {
      espColor = "#ff0000";
      dotRadius = 4;
    }
    ctx.fillStyle = espColor;
    ctx.beginPath();
    ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  });
  if (window.entityTrailEnabled && window.entityTrailTargetId) {
    const targetEntityId = getEntityById(window.entityTrailTargetId);
    if (targetEntityId) {
      const targetEntity = getEntityPosition(targetEntityId);
      if (targetEntity) {
        const deltaX = targetEntity.x - gameState.myPos.x;
        const deltaY = targetEntity.y - gameState.myPos.y;
        const drawX = Math.max(
          radarX + 2,
          Math.min(
            radarX + radarSize - 2,
            radarX + radarSize / 2 + deltaX * radarScale,
          ),
        );
        const drawY = Math.max(
          radarY + 2,
          Math.min(
            radarY + radarSize - 2,
            radarY + radarSize / 2 + deltaY * radarScale,
          ),
        );
        const opacity = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        const { r: colorR, g: colorG, b: colorB } = window.entityTrailColor;
        const rgbString = colorR + "," + colorG + "," + colorB;
        ctx.strokeStyle = "rgba(" + rgbString + "," + opacity + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(drawX, drawY, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(" + rgbString + "," + opacity * 0.5 + ")";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(drawX, drawY, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgb(" + rgbString + ")";
        ctx.beginPath();
        ctx.arc(drawX, drawY, 3, 0, Math.PI * 2);
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
                  (entity.x - gameState.myPos.x) * radarScale,
              ),
            );
            const drawY = Math.max(
              radarY + 2,
              Math.min(
                radarY + radarSize - 2,
                radarY +
                  radarSize / 2 +
                  (entity.y - gameState.myPos.y) * radarScale,
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
    (window.espMode === "players" ? "P:" : "F:") + entities.length,
    radarX + radarSize - 50,
    radarY + radarSize + 14,
  );
}
function initRadarDragging() {
  if (window._radarDragInit) {
    return;
  }
  window._radarDragInit = true;
  document.addEventListener(
    "mousedown",
    (renderRadarESP) => {
      const radarBounds = window._radarBounds;
      if (!radarBounds || !window.espEnabled) {
        return;
      }
      if (
        renderRadarESP.clientX >= radarBounds.x &&
        renderRadarESP.clientX <= radarBounds.x + radarBounds.w &&
        renderRadarESP.clientY >= radarBounds.y &&
        renderRadarESP.clientY <= radarBounds.y + radarBounds.h
      ) {
        dragState.dragging = true;
        dragState.offsetX = renderRadarESP.clientX - radarBounds.x;
        dragState.offsetY = renderRadarESP.clientY - radarBounds.y;
        renderRadarESP.preventDefault();
        renderRadarESP.stopPropagation();
      }
    },
    true,
  );
  document.addEventListener(
    "mousemove",
    (mousemoveEvent) => {
      if (!dragState.dragging) {
        return;
      }
      dragState.x = mousemoveEvent.clientX - dragState.offsetX;
      dragState.y = mousemoveEvent.clientY - dragState.offsetY;
      mousemoveEvent.preventDefault();
    },
    true,
  );
  document.addEventListener(
    "mouseup",
    (mouseupEvent) => {
      if (dragState.dragging) {
        dragState.dragging = false;
        mouseupEvent.preventDefault();
      }
    },
    true,
  );
}

export { updateLockButtonUI, drawRadar, initRadarDragging };
