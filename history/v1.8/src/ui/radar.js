import {
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
function drawRadar(v2156Ctx, v14bbCanvas, v631aGameState) {
  if (!v631aGameState || v631aGameState.error) {
    return;
  }
  const radarSize = 150;
  if (dragState.x === null) {
    dragState.x = v14bbCanvas.width - radarSize - 20;
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
  v2156Ctx.fillStyle = "rgba(20,20,20,0.9)";
  v2156Ctx.beginPath();
  v2156Ctx.roundRect(radarX, radarY, radarSize, radarSize, 4);
  v2156Ctx.fill();
  v2156Ctx.strokeStyle = "#333";
  v2156Ctx.lineWidth = 1;
  v2156Ctx.stroke();
  v2156Ctx.strokeStyle = "rgba(60,60,60,0.5)";
  v2156Ctx.lineWidth = 0.5;
  v2156Ctx.beginPath();
  v2156Ctx.moveTo(radarX + radarSize / 2, radarY);
  v2156Ctx.lineTo(radarX + radarSize / 2, radarY + radarSize);
  v2156Ctx.moveTo(radarX, radarY + radarSize / 2);
  v2156Ctx.lineTo(radarX + radarSize, radarY + radarSize / 2);
  v2156Ctx.stroke();
  for (
    let circleRadiusFactor = 0.25;
    circleRadiusFactor <= 1;
    circleRadiusFactor += 0.25
  ) {
    v2156Ctx.beginPath();
    v2156Ctx.arc(
      radarX + radarSize / 2,
      radarY + radarSize / 2,
      (radarSize / 2) * circleRadiusFactor,
      0,
      Math.PI * 2,
    );
    v2156Ctx.strokeStyle =
      "rgba(60,60,60," + (0.2 + circleRadiusFactor * 0.1) + ")";
    v2156Ctx.stroke();
  }
  v2156Ctx.fillStyle = "#1db954";
  v2156Ctx.beginPath();
  v2156Ctx.arc(
    radarX + radarSize / 2,
    radarY + radarSize / 2,
    4,
    0,
    Math.PI * 2,
  );
  v2156Ctx.fill();
  const radarEntities =
    window.espMode === "players"
      ? v631aGameState.players || []
      : v631aGameState.food || [];
  radarEntities.forEach((target) => {
    const v1e98DiffX = target.x - v631aGameState.myPos.x;
    const v484fDiffY = target.y - v631aGameState.myPos.y;
    let v1a70ScreenX = Math.max(
      radarX + 2,
      Math.min(
        radarX + radarSize - 2,
        radarX + radarSize / 2 + v1e98DiffX * radarScale,
      ),
    );
    let v5a19ScreenY = Math.max(
      radarY + 2,
      Math.min(
        radarY + radarSize - 2,
        radarY + radarSize / 2 + v484fDiffY * radarScale,
      ),
    );
    let v439cEspColor;
    let v483cRadius;
    if (window.espMode === "players") {
      v439cEspColor =
        target.distance < 500
          ? window.espColors.close
          : target.distance < 1500
            ? window.espColors.medium
            : target.distance < 3000
              ? window.espColors.far
              : "#888";
      v483cRadius = 3;
    } else {
      v439cEspColor = window.espColors.foodClose;
      v483cRadius = 1.5;
    }
    if (window.espTrackedEntityId && target.id === window.espTrackedEntityId) {
      v439cEspColor = window.espColors.tracked;
      v483cRadius = 4;
    }
    if (window.lockTargetId && target.id === window.lockTargetId) {
      v439cEspColor = "#ff0000";
      v483cRadius = 4;
    }
    v2156Ctx.fillStyle = v439cEspColor;
    v2156Ctx.beginPath();
    v2156Ctx.arc(v1a70ScreenX, v5a19ScreenY, v483cRadius, 0, Math.PI * 2);
    v2156Ctx.fill();
  });
  if (window.entityTrailEnabled && window.entityTrailTargetId) {
    const targetId = findEntityById(window.entityTrailTargetId);
    if (targetId) {
      const v4855TargetEntity = getEntityPosition(targetId);
      if (v4855TargetEntity) {
        const v4515OffsetY = v4855TargetEntity.x - v631aGameState.myPos.x;
        const v4515V4515OffsetY = v4855TargetEntity.y - v631aGameState.myPos.y;
        const v2a2bDrawY = Math.max(
          radarX + 2,
          Math.min(
            radarX + radarSize - 2,
            radarX + radarSize / 2 + v4515OffsetY * radarScale,
          ),
        );
        const v2a2bV2a2bDrawY = Math.max(
          radarY + 2,
          Math.min(
            radarY + radarSize - 2,
            radarY + radarSize / 2 + v4515V4515OffsetY * radarScale,
          ),
        );
        const alpha = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        const {
          r: v4b2eRed,
          g: v1283Blue,
          b: v1283V1283Blue,
        } = window.entityTrailColor;
        const rgbValue = v4b2eRed + "," + v1283Blue + "," + v1283V1283Blue;
        v2156Ctx.strokeStyle = "rgba(" + rgbValue + "," + alpha + ")";
        v2156Ctx.lineWidth = 2;
        v2156Ctx.beginPath();
        v2156Ctx.arc(v2a2bDrawY, v2a2bV2a2bDrawY, 7, 0, Math.PI * 2);
        v2156Ctx.stroke();
        v2156Ctx.strokeStyle = "rgba(" + rgbValue + "," + alpha * 0.5 + ")";
        v2156Ctx.lineWidth = 4;
        v2156Ctx.beginPath();
        v2156Ctx.arc(v2a2bDrawY, v2a2bV2a2bDrawY, 10, 0, Math.PI * 2);
        v2156Ctx.stroke();
        v2156Ctx.fillStyle = "rgb(" + rgbValue + ")";
        v2156Ctx.beginPath();
        v2156Ctx.arc(v2a2bDrawY, v2a2bV2a2bDrawY, 3, 0, Math.PI * 2);
        v2156Ctx.fill();
        if (window.entityTrailHistory.length > 1) {
          v2156Ctx.strokeStyle = "rgba(" + rgbValue + ",0.3)";
          v2156Ctx.lineWidth = 1;
          v2156Ctx.beginPath();
          window.entityTrailHistory.forEach((v3ea3Entity, v1d1bI) => {
            const drawX = Math.max(
              radarX + 2,
              Math.min(
                radarX + radarSize - 2,
                radarX +
                  radarSize / 2 +
                  (v3ea3Entity.x - v631aGameState.myPos.x) * radarScale,
              ),
            );
            const drawY = Math.max(
              radarY + 2,
              Math.min(
                radarY + radarSize - 2,
                radarY +
                  radarSize / 2 +
                  (v3ea3Entity.y - v631aGameState.myPos.y) * radarScale,
              ),
            );
            if (v1d1bI === 0) {
              v2156Ctx.moveTo(drawX, drawY);
            } else {
              v2156Ctx.lineTo(drawX, drawY);
            }
          });
          v2156Ctx.stroke();
        }
      }
    }
  }
  v2156Ctx.fillStyle = "rgba(20,20,20,0.9)";
  v2156Ctx.beginPath();
  v2156Ctx.roundRect(radarX, radarY + radarSize, radarSize, 22, [0, 0, 4, 4]);
  v2156Ctx.fill();
  v2156Ctx.fillStyle = "#888";
  v2156Ctx.font = "10px monospace";
  v2156Ctx.fillText("RADAR", radarX + 5, radarY + radarSize + 14);
  v2156Ctx.fillText(
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
