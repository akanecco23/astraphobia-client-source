import { featuresentitytrailState } from "./entitytrail.js";
import { startAntiAfk } from "./antidetection.js";

function stopEntityTrail() {
  if (featuresentitytrailState.entityTrailInterval_s4i) {
    clearInterval(featuresentitytrailState.entityTrailInterval_s4i);
    featuresentitytrailState.entityTrailInterval_s4i = null;
  }
}
function toggleMouseSimulation() {
  if (featuresentitytrailState.entityTrailInterval_s4i) {
    stopEntityTrail();
  } else {
    startAntiAfk();
  }
}

export { stopEntityTrail, toggleMouseSimulation };
