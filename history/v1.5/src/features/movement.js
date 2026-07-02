import { featuresentitytrailState } from "./entitytrail.js";
import { startAntiAfk } from "./antidetection.js";

function stopEntityTrail() {
  if (featuresentitytrailState.appEntityTrailInterval) {
    clearInterval(featuresentitytrailState.appEntityTrailInterval);
    featuresentitytrailState.appEntityTrailInterval = null;
  }
}
function toggleMouseSimulation() {
  if (featuresentitytrailState.appEntityTrailInterval) {
    stopEntityTrail();
  } else {
    startAntiAfk();
  }
}

export { stopEntityTrail, toggleMouseSimulation };
