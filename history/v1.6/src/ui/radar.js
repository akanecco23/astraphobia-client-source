import { dragState, coreSharedState } from "../core.js";

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
  const espMode = window.espMode;
  const entities =
    espMode === "players" ? gameState.players || [] : gameState.food || [];
  entities.forEach((targetPos) => {
    const diffX = targetPos.x - gameState.myPos.x;
    const diffY = targetPos.y - gameState.myPos.y;
    let renderX = radarX + radarSize / 2 + diffX * radarScale;
    let renderY = radarY + radarSize / 2 + diffY * radarScale;
    renderX = Math.max(radarX + 2, Math.min(radarX + radarSize - 2, renderX));
    renderY = Math.max(radarY + 2, Math.min(radarY + radarSize - 2, renderY));
    let markerColor;
    let markerRadius;
    if (espMode === "players") {
      markerColor =
        targetPos.distance < 500
          ? "#ff0000"
          : targetPos.distance < 1500
            ? "#ffff00"
            : targetPos.distance < 3000
              ? "#00ffff"
              : "#888";
      markerRadius = 3;
    } else {
      markerColor = "#44cc44";
      markerRadius = 1.5;
    }
    if (
      window.espTrackedEntityId &&
      targetPos.id === window.espTrackedEntityId
    ) {
      markerColor = "#ff00ff";
      markerRadius = 4;
    }
    ctx.fillStyle = markerColor;
    ctx.beginPath();
    ctx.arc(renderX, renderY, markerRadius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "rgba(20,20,20,0.9)";
  ctx.beginPath();
  ctx.roundRect(radarX, radarY + radarSize, radarSize, 22, [0, 0, 4, 4]);
  ctx.fill();
  ctx.fillStyle = "#888";
  ctx.font = "10px monospace";
  ctx.fillText("RADAR", radarX + 5, radarY + radarSize + 14);
  const countLabel =
    espMode === "players"
      ? "P:" + (gameState.players || []).length
      : "F:" + (gameState.food || []).length;
  ctx.fillText(countLabel, radarX + radarSize - 50, radarY + radarSize + 14);
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
