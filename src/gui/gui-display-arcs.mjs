import { internal } from './gui-core';

// Create low-detail versions of large arc collections for faster rendering
// at zoomed-out scales.
export function enhanceArcCollectionForDisplay(unfilteredArcs) {
  var size = unfilteredArcs.getPointCount(),
      filteredArcs, filteredSegLen;

  // Only generate low-detail arcs for larger datasets
  if (size > 5e5) {
    update();
  }

  function update() {
    if (unfilteredArcs.getVertexData().zz) {
      // Use precalculated simplification data for vertex filtering, if available
      filteredArcs = initFilteredArcs(unfilteredArcs);
      filteredSegLen = internal.getAvgSegment(filteredArcs);
    } else {
      // Use fast simplification as a fallback
      filteredSegLen = internal.getAvgSegment(unfilteredArcs) * 4;
      filteredArcs = internal.simplifyArcsFast(unfilteredArcs, filteredSegLen);
    }
  }

  function initFilteredArcs(arcs) {
    var filterPct = 0.08;
    var nth = Math.ceil(arcs.getPointCount() / 5e5);
    var currInterval = arcs.getRetainedInterval();
    var filterZ = arcs.getThresholdByPct(filterPct, nth);
    var filteredArcs = arcs.setRetainedInterval(filterZ).getFilteredCopy();
    arcs.setRetainedInterval(currInterval); // reset current simplification
    return filteredArcs;
  }

  // TODO: better job of detecting arc change... e.g. revision number
  unfilteredArcs.getScaledArcs = function(ext) {
    // check for changes in the number of arcs (probably due to editing)
    if (filteredArcs && filteredArcs.size() != unfilteredArcs.size()) {
      // arc count has changed... probably due to editing
      update();
      if (filteredArcs.size() != unfilteredArcs.size()) {
        throw Error('Internal error');
      }
    }
    if (filteredArcs) {
      // match simplification of unfiltered arcs
      filteredArcs.setRetainedInterval(unfilteredArcs.getRetainedInterval());
    }
    // switch to filtered version of arcs at small scales
    var unitsPerPixel = 1/ext.getTransform().mx,
        useFiltering = filteredArcs && unitsPerPixel > filteredSegLen * 1.5;
    return useFiltering ? filteredArcs : unfilteredArcs;
  };
}
