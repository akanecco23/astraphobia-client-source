import {
  radius,
  getEntityPosition,
  findEntityById,
  dragState,
  state,
} from "../core.js";

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
  const worldSize = 5000;
  const radarScale = radarSize / (worldSize * 2);
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
  const radarEntities =
    window.espMode === "players"
      ? gameState.players || []
      : gameState.food || [];
  radarEntities.forEach((target) => {
    const diffX = target.x - gameState.myPos.x;
    const diffY = target.y - gameState.myPos.y;
    let screenX = Math.max(
      radarX + 2,
      Math.min(
        radarX + radarSize - 2,
        radarX + radarSize / 2 + diffX * radarScale,
      ),
    );
    let screenY = Math.max(
      radarY + 2,
      Math.min(
        radarY + radarSize - 2,
        radarY + radarSize / 2 + diffY * radarScale,
      ),
    );
    let espColor;
    let radius;
    if (window.espMode === "players") {
      espColor =
        target.distance < 500
          ? window.espColors.close
          : target.distance < 1500
            ? window.espColors.medium
            : target.distance < 3000
              ? window.espColors.far
              : "#888";
      radius = 3;
    } else {
      espColor = window.espColors.foodClose;
      radius = 1.5;
    }
    if (window.espTrackedEntityId && target.id === window.espTrackedEntityId) {
      espColor = window.espColors.tracked;
      radius = 4;
    }
    if (window.lockTargetId && target.id === window.lockTargetId) {
      espColor = "#ff0000";
      radius = 4;
    }
    ctx.fillStyle = espColor;
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.fill();
  });
  if (window.entityTrailEnabled && window.entityTrailTargetId) {
    const targetId = findEntityById(window.entityTrailTargetId);
    if (targetId) {
      const targetEntity = getEntityPosition(targetId);
      if (targetEntity) {
        const offsetX = targetEntity.x - gameState.myPos.x;
        const offsetY = targetEntity.y - gameState.myPos.y;
        const renderX = Math.max(
          radarX + 2,
          Math.min(
            radarX + radarSize - 2,
            radarX + radarSize / 2 + offsetX * radarScale,
          ),
        );
        const renderY = Math.max(
          radarY + 2,
          Math.min(
            radarY + radarSize - 2,
            radarY + radarSize / 2 + offsetY * radarScale,
          ),
        );
        const alpha = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        const { r: red, g: green, b: blue } = window.entityTrailColor;
        const rgbString = red + "," + green + "," + blue;
        ctx.strokeStyle = "rgba(" + rgbString + "," + alpha + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(renderX, renderY, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(" + rgbString + "," + alpha * 0.5 + ")";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(renderX, renderY, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgb(" + rgbString + ")";
        ctx.beginPath();
        ctx.arc(renderX, renderY, 3, 0, Math.PI * 2);
        ctx.fill();
        if (window.entityTrailHistory.length > 1) {
          ctx.strokeStyle = "rgba(" + rgbString + ",0.3)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          window.entityTrailHistory.forEach((entity, index) => {
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
            if (index === 0) {
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
    (window.espMode === "players" ? "P:" : "F:") + radarEntities.length,
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
    (renderRadar) => {
      const radarBounds = window._radarBounds;
      if (!radarBounds || !window.espEnabled) {
        return;
      }
      if (
        renderRadar.clientX >= radarBounds.x &&
        renderRadar.clientX <= radarBounds.x + radarBounds.w &&
        renderRadar.clientY >= radarBounds.y &&
        renderRadar.clientY <= radarBounds.y + radarBounds.h
      ) {
        dragState.dragging = true;
        dragState.offsetX = renderRadar.clientX - radarBounds.x;
        dragState.offsetY = renderRadar.clientY - radarBounds.y;
        renderRadar.preventDefault();
        renderRadar.stopPropagation();
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

export { updateLockButtonUI, drawRadar, initRadarDrag };
