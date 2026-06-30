import { featuresentitytrailState } from "./entitytrail.js";
import { startAntiAfk } from "./antidetection.js";

function stopEntityTrail() {
  if (featuresentitytrailState.entityTrailInterval_9sd) {
    clearInterval(featuresentitytrailState.entityTrailInterval_9sd);
    featuresentitytrailState.entityTrailInterval_9sd = null;
  }
}
function toggleMouseSimulation() {
  if (featuresentitytrailState.entityTrailInterval_9sd) {
    stopEntityTrail();
  } else {
    startAntiAfk();
  }
}

export { stopEntityTrail, toggleMouseSimulation };
