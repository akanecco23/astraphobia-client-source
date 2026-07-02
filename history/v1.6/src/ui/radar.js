import { dragState, state } from "../core.js";

function drawRadar(v5512Ctx, v4718Canvas, v2726GameState) {
  if (!v2726GameState || v2726GameState.error) {
    return;
  }
  const radarSize = 150;
  if (dragState.x === null) {
    dragState.x = v4718Canvas.width - radarSize - 20;
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
  v5512Ctx.fillStyle = "rgba(20,20,20,0.9)";
  v5512Ctx.beginPath();
  v5512Ctx.roundRect(radarX, radarY, radarSize, radarSize, 4);
  v5512Ctx.fill();
  v5512Ctx.strokeStyle = "#333";
  v5512Ctx.lineWidth = 1;
  v5512Ctx.stroke();
  v5512Ctx.strokeStyle = "rgba(60,60,60,0.5)";
  v5512Ctx.lineWidth = 0.5;
  v5512Ctx.beginPath();
  v5512Ctx.moveTo(radarX + radarSize / 2, radarY);
  v5512Ctx.lineTo(radarX + radarSize / 2, radarY + radarSize);
  v5512Ctx.moveTo(radarX, radarY + radarSize / 2);
  v5512Ctx.lineTo(radarX + radarSize, radarY + radarSize / 2);
  v5512Ctx.stroke();
  for (
    let circleRadiusFactor = 0.25;
    circleRadiusFactor <= 1;
    circleRadiusFactor += 0.25
  ) {
    v5512Ctx.beginPath();
    v5512Ctx.arc(
      radarX + radarSize / 2,
      radarY + radarSize / 2,
      (radarSize / 2) * circleRadiusFactor,
      0,
      Math.PI * 2,
    );
    v5512Ctx.strokeStyle =
      "rgba(60,60,60," + (0.2 + circleRadiusFactor * 0.1) + ")";
    v5512Ctx.stroke();
  }
  v5512Ctx.fillStyle = "#1db954";
  v5512Ctx.beginPath();
  v5512Ctx.arc(
    radarX + radarSize / 2,
    radarY + radarSize / 2,
    4,
    0,
    Math.PI * 2,
  );
  v5512Ctx.fill();
  const v662bEspMode = window.espMode;
  const v59c7Entities =
    v662bEspMode === "players"
      ? v2726GameState.players || []
      : v2726GameState.food || [];
  v59c7Entities.forEach((v58c3EntityPos) => {
    const v2541DiffX = v58c3EntityPos.x - v2726GameState.myPos.x;
    const v2506DiffY = v58c3EntityPos.y - v2726GameState.myPos.y;
    let renderX = radarX + radarSize / 2 + v2541DiffX * radarScale;
    let drawY = radarY + radarSize / 2 + v2506DiffY * radarScale;
    renderX = Math.max(radarX + 2, Math.min(radarX + radarSize - 2, renderX));
    drawY = Math.max(radarY + 2, Math.min(radarY + radarSize - 2, drawY));
    let v3317MarkerColor;
    let markerRadius;
    if (v662bEspMode === "players") {
      v3317MarkerColor =
        v58c3EntityPos.distance < 500
          ? "#ff0000"
          : v58c3EntityPos.distance < 1500
            ? "#ffff00"
            : v58c3EntityPos.distance < 3000
              ? "#00ffff"
              : "#888";
      markerRadius = 3;
    } else {
      v3317MarkerColor = "#44cc44";
      markerRadius = 1.5;
    }
    if (
      window.espTrackedEntityId &&
      v58c3EntityPos.id === window.espTrackedEntityId
    ) {
      v3317MarkerColor = "#ff00ff";
      markerRadius = 4;
    }
    v5512Ctx.fillStyle = v3317MarkerColor;
    v5512Ctx.beginPath();
    v5512Ctx.arc(renderX, drawY, markerRadius, 0, Math.PI * 2);
    v5512Ctx.fill();
  });
  v5512Ctx.fillStyle = "rgba(20,20,20,0.9)";
  v5512Ctx.beginPath();
  v5512Ctx.roundRect(radarX, radarY + radarSize, radarSize, 22, [0, 0, 4, 4]);
  v5512Ctx.fill();
  v5512Ctx.fillStyle = "#888";
  v5512Ctx.font = "10px monospace";
  v5512Ctx.fillText("RADAR", radarX + 5, radarY + radarSize + 14);
  const v5e5cFinalY =
    v662bEspMode === "players"
      ? "P:" + (v2726GameState.players || []).length
      : "F:" + (v2726GameState.food || []).length;
  v5512Ctx.fillText(
    v5e5cFinalY,
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
    (updateRadarEsp) => {
      const radarBounds = window._radarBounds;
      if (!radarBounds || !window.espEnabled) {
        return;
      }
      if (
        updateRadarEsp.clientX >= radarBounds.x &&
        updateRadarEsp.clientX <= radarBounds.x + radarBounds.w &&
        updateRadarEsp.clientY >= radarBounds.y &&
        updateRadarEsp.clientY <= radarBounds.y + radarBounds.h
      ) {
        dragState.dragging = true;
        dragState.offsetX = updateRadarEsp.clientX - radarBounds.x;
        dragState.offsetY = updateRadarEsp.clientY - radarBounds.y;
        updateRadarEsp.preventDefault();
        updateRadarEsp.stopPropagation();
      }
    },
    true,
  );
  document.addEventListener(
    "mousemove",
    (mouseEvent) => {
      if (!dragState.dragging) {
        return;
      }
      dragState.x = mouseEvent.clientX - dragState.offsetX;
      dragState.y = mouseEvent.clientY - dragState.offsetY;
      mouseEvent.preventDefault();
    },
    true,
  );
  document.addEventListener(
    "mouseup",
    (event) => {
      if (dragState.dragging) {
        dragState.dragging = false;
        event.preventDefault();
      }
    },
    true,
  );
}

export { drawRadar, initRadarDrag };
