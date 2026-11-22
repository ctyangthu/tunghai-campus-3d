import {activityCenterFootprint} from './activity-center.js';
import {facultyResidenceId, facultyResidenceBuildingIds} from './faculty-residence.js';
import {secondGatePoint} from './gates.js';

// The OSM relation is a campus park boundary enclosing separated facilities.
// The source layer remains available for download under the ODbL.
const carbonNeutralityPark = 'r18476872';

export function applyCampusRevisions(geo) {
  const facultyBuildings = geo.buildings.filter(building=>facultyResidenceBuildingIds.includes(building.osm));
  const residencePoint = facultyBuildings.length && {
    osm: facultyResidenceId,
    x: facultyBuildings.reduce((sum,b)=>sum+b.x,0)/facultyBuildings.length,
    z: facultyBuildings.reduce((sum,b)=>sum+b.z,0)/facultyBuildings.length,
  };
  return {
    ...geo,
    pois: [...geo.pois, ...(residencePoint ? [residencePoint] : []), secondGatePoint],
    buildings: [
      ...geo.buildings.filter(building=>building.osm!==carbonNeutralityPark),
      activityCenterFootprint,
    ],
  };
}
