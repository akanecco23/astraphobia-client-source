import { featuresentitytrailState } from "./entitytrail.js";
import { startAntiAfk } from "./antidetection.js";

function stopEntityTrail() {
  if (featuresentitytrailState.entityTrailInterval_qpd) {
    clearInterval(featuresentitytrailState.entityTrailInterval_qpd);
    featuresentitytrailState.entityTrailInterval_qpd = null;
  }
}
function toggleMouseSimulation() {
  if (featuresentitytrailState.entityTrailInterval_qpd) {
    stopEntityTrail();
  } else {
    startAntiAfk();
  }
}

export { stopEntityTrail, toggleMouseSimulation };
