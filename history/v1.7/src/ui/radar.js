import { getEntityPosition, dragState, state } from "../core.js";
import { getEntityById } from "../utils.js";

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
function drawRadar(v1438Ctx, v1439Canvas, v27c0GameState) {
  if (!v27c0GameState || v27c0GameState.error) {
    return;
  }
  const radarSize = 150;
  if (dragState.x === null) {
    dragState.x = v1439Canvas.width - radarSize - 20;
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
  v1438Ctx.fillStyle = "rgba(20,20,20,0.9)";
  v1438Ctx.beginPath();
  v1438Ctx.roundRect(radarX, radarY, radarSize, radarSize, 4);
  v1438Ctx.fill();
  v1438Ctx.strokeStyle = "#333";
  v1438Ctx.lineWidth = 1;
  v1438Ctx.stroke();
  v1438Ctx.strokeStyle = "rgba(60,60,60,0.5)";
  v1438Ctx.lineWidth = 0.5;
  v1438Ctx.beginPath();
  v1438Ctx.moveTo(radarX + radarSize / 2, radarY);
  v1438Ctx.lineTo(radarX + radarSize / 2, radarY + radarSize);
  v1438Ctx.moveTo(radarX, radarY + radarSize / 2);
  v1438Ctx.lineTo(radarX + radarSize, radarY + radarSize / 2);
  v1438Ctx.stroke();
  for (
    let circleRadiusFactor = 0.25;
    circleRadiusFactor <= 1;
    circleRadiusFactor += 0.25
  ) {
    v1438Ctx.beginPath();
    v1438Ctx.arc(
      radarX + radarSize / 2,
      radarY + radarSize / 2,
      (radarSize / 2) * circleRadiusFactor,
      0,
      Math.PI * 2,
    );
    v1438Ctx.strokeStyle =
      "rgba(60,60,60," + (0.2 + circleRadiusFactor * 0.1) + ")";
    v1438Ctx.stroke();
  }
  v1438Ctx.fillStyle = "#1db954";
  v1438Ctx.beginPath();
  v1438Ctx.arc(
    radarX + radarSize / 2,
    radarY + radarSize / 2,
    4,
    0,
    Math.PI * 2,
  );
  v1438Ctx.fill();
  const v5a93Entities =
    window.espMode === "players"
      ? v27c0GameState.players || []
      : v27c0GameState.food || [];
  v5a93Entities.forEach((a3e7Target) => {
    const ea8eDeltaX = a3e7Target.x - v27c0GameState.myPos.x;
    const v324bDeltaY = a3e7Target.y - v27c0GameState.myPos.y;
    let v5487ScreenX = Math.max(
      radarX + 2,
      Math.min(
        radarX + radarSize - 2,
        radarX + radarSize / 2 + ea8eDeltaX * radarScale,
      ),
    );
    let v1a83ScreenY = Math.max(
      radarY + 2,
      Math.min(
        radarY + radarSize - 2,
        radarY + radarSize / 2 + v324bDeltaY * radarScale,
      ),
    );
    let espColor;
    let dotRadius;
    if (window.espMode === "players") {
      espColor =
        a3e7Target.distance < 500
          ? window.espColors.close
          : a3e7Target.distance < 1500
            ? window.espColors.medium
            : a3e7Target.distance < 3000
              ? window.espColors.far
              : "#888";
      dotRadius = 3;
    } else {
      espColor = window.espColors.foodClose;
      dotRadius = 1.5;
    }
    if (
      window.espTrackedEntityId &&
      a3e7Target.id === window.espTrackedEntityId
    ) {
      espColor = window.espColors.tracked;
      dotRadius = 4;
    }
    if (window.lockTargetId && a3e7Target.id === window.lockTargetId) {
      espColor = "#ff0000";
      dotRadius = 4;
    }
    v1438Ctx.fillStyle = espColor;
    v1438Ctx.beginPath();
    v1438Ctx.arc(v5487ScreenX, v1a83ScreenY, dotRadius, 0, Math.PI * 2);
    v1438Ctx.fill();
  });
  if (window.entityTrailEnabled && window.entityTrailTargetId) {
    const targetEntityId = getEntityById(window.entityTrailTargetId);
    if (targetEntityId) {
      const v4402TargetEntity = getEntityPosition(targetEntityId);
      if (v4402TargetEntity) {
        const v1472DeltaY = v4402TargetEntity.x - v27c0GameState.myPos.x;
        const v1472V1472DeltaY = v4402TargetEntity.y - v27c0GameState.myPos.y;
        const v13d4DrawY = Math.max(
          radarX + 2,
          Math.min(
            radarX + radarSize - 2,
            radarX + radarSize / 2 + v1472DeltaY * radarScale,
          ),
        );
        const v13d4V13d4DrawY = Math.max(
          radarY + 2,
          Math.min(
            radarY + radarSize - 2,
            radarY + radarSize / 2 + v1472V1472DeltaY * radarScale,
          ),
        );
        const alpha = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        const {
          r: red,
          g: v244aBlue,
          b: v244aV244aBlue,
        } = window.entityTrailColor;
        const rgbValue = red + "," + v244aBlue + "," + v244aV244aBlue;
        v1438Ctx.strokeStyle = "rgba(" + rgbValue + "," + alpha + ")";
        v1438Ctx.lineWidth = 2;
        v1438Ctx.beginPath();
        v1438Ctx.arc(v13d4DrawY, v13d4V13d4DrawY, 7, 0, Math.PI * 2);
        v1438Ctx.stroke();
        v1438Ctx.strokeStyle = "rgba(" + rgbValue + "," + alpha * 0.5 + ")";
        v1438Ctx.lineWidth = 4;
        v1438Ctx.beginPath();
        v1438Ctx.arc(v13d4DrawY, v13d4V13d4DrawY, 10, 0, Math.PI * 2);
        v1438Ctx.stroke();
        v1438Ctx.fillStyle = "rgb(" + rgbValue + ")";
        v1438Ctx.beginPath();
        v1438Ctx.arc(v13d4DrawY, v13d4V13d4DrawY, 3, 0, Math.PI * 2);
        v1438Ctx.fill();
        if (window.entityTrailHistory.length > 1) {
          v1438Ctx.strokeStyle = "rgba(" + rgbValue + ",0.3)";
          v1438Ctx.lineWidth = 1;
          v1438Ctx.beginPath();
          window.entityTrailHistory.forEach((v4ad0Entity, entityIndex) => {
            const drawX = Math.max(
              radarX + 2,
              Math.min(
                radarX + radarSize - 2,
                radarX +
                  radarSize / 2 +
                  (v4ad0Entity.x - v27c0GameState.myPos.x) * radarScale,
              ),
            );
            const drawY = Math.max(
              radarY + 2,
              Math.min(
                radarY + radarSize - 2,
                radarY +
                  radarSize / 2 +
                  (v4ad0Entity.y - v27c0GameState.myPos.y) * radarScale,
              ),
            );
            if (entityIndex === 0) {
              v1438Ctx.moveTo(drawX, drawY);
            } else {
              v1438Ctx.lineTo(drawX, drawY);
            }
          });
          v1438Ctx.stroke();
        }
      }
    }
  }
  v1438Ctx.fillStyle = "rgba(20,20,20,0.9)";
  v1438Ctx.beginPath();
  v1438Ctx.roundRect(radarX, radarY + radarSize, radarSize, 22, [0, 0, 4, 4]);
  v1438Ctx.fill();
  v1438Ctx.fillStyle = "#888";
  v1438Ctx.font = "10px monospace";
  v1438Ctx.fillText("RADAR", radarX + 5, radarY + radarSize + 14);
  v1438Ctx.fillText(
    (window.espMode === "players" ? "P:" : "F:") + v5a93Entities.length,
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
