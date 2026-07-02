import { featuresentitytrailState } from "./entitytrail.js";
import { startAntiAfk } from "./antidetection.js";

function stopEntityTrail() {
  if (featuresentitytrailState.modEntityTrailInterval) {
    clearInterval(featuresentitytrailState.modEntityTrailInterval);
    featuresentitytrailState.modEntityTrailInterval = null;
  }
}
function toggleMouseSimulation() {
  if (featuresentitytrailState.modEntityTrailInterval) {
    stopEntityTrail();
  } else {
    startAntiAfk();
  }
}

export { stopEntityTrail, toggleMouseSimulation };
