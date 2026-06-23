import { state } from "./core.js";

function generateRandomString(length) {
  let resultString = "";
  for (let i = 0; i < length; i++) {
    const randomCodePoint = Math.floor(Math.random() * 1048575 + 65536);
    resultString += String.fromCodePoint(randomCodePoint);
  }
  return resultString;
}
function getGameCanvas() {
  return (
    document.querySelector("#gameCanvas") ||
    document.querySelector("canvas") ||
    document.querySelector("#canvas-container canvas")
  );
}
const getAllPropertyNames = (targetObject) => {
  return [
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(targetObject)),
    ...Object.getOwnPropertyNames(targetObject),
  ];
};
function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}
function getOrCreateCanvas(canvasId, zIndex) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = canvasId;
    canvas.style.cssText =
      "position:fixed;top:0;left:0;pointer-events:none;z-index:" + zIndex + ";";
    document.body.appendChild(canvas);
  }
  const targetElement = getGameCanvas();
  if (targetElement) {
    const rect = targetElement.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    canvas.style.left = rect.left + "px";
    canvas.style.top = rect.top + "px";
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
  } else if (
    canvas.width !== window.innerWidth ||
    canvas.height !== window.innerHeight
  ) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  return canvas;
}

export {
  generateRandomString,
  getGameCanvas,
  getAllPropertyNames,
  calculateDistance,
  getOrCreateCanvas,
};
