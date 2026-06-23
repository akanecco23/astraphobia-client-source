import { startAntiAfk } from "./antidetection.js";
import { coreSharedState } from "../core.js";

function stopMouseSimulation() {
  if (coreSharedState.animationInterval) {
    clearInterval(coreSharedState.animationInterval);
    coreSharedState.animationInterval = null;
  }
}
function toggleMouseSimulation() {
  if (coreSharedState.animationInterval) {
    stopMouseSimulation();
  } else {
    startAntiAfk();
  }
}

export { stopMouseSimulation, toggleMouseSimulation };
