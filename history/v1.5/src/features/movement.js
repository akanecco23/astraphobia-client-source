import { startAntiAfk } from "./antidetection.js";
import { coreSharedState } from "../core.js";

function stopMouseSimulation() {
  if (coreSharedState.rotationInterval) {
    clearInterval(coreSharedState.rotationInterval);
    coreSharedState.rotationInterval = null;
  }
}
function toggleMouseSimulation() {
  if (coreSharedState.rotationInterval) {
    stopMouseSimulation();
  } else {
    startAntiAfk();
  }
}

export { stopMouseSimulation, toggleMouseSimulation };
