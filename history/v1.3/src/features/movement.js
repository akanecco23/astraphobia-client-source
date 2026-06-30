import { featuresentitytrailState } from "./entitytrail.js";
import { startAntiAfk } from "./antidetection.js";

function stopEntityTrail() {
  if (featuresentitytrailState.entityTrailInterval_2) {
    clearInterval(featuresentitytrailState.entityTrailInterval_2);
    featuresentitytrailState.entityTrailInterval_2 = null;
  }
}
function toggleMouseSimulation() {
  if (featuresentitytrailState.entityTrailInterval_2) {
    stopEntityTrail();
  } else {
    startAntiAfk();
  }
}

export { stopEntityTrail, toggleMouseSimulation };
