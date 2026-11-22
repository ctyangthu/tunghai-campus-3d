import {activityCenterFootprint} from './activity-center.js';
import {facultyResidenceId, facultyResidenceBuildingIds} from './faculty-residence.js';
import {secondGatePoint} from './gates.js';
import {administrationCenterId, administrationWings} from './west-admin.js';
import {placePoints, places} from './places.js';
import {carbonParkPoint} from './carbon-park.js';
import {wenliBoulevardId} from './wenli-heritage.js';

// The OSM relation is a campus park boundary enclosing separated facilities.
// The source layer remains available for download under the ODbL.
const carbonNeutralityPark = 'r18476872';
// This room is already included in the footprint of the Arts east wing.
const artsMemorialClassroom = 'w368066317';
// This store is a separately tagged bay within the reconstructed dining hall.
const diningHallStore = 'w368104077';

export function applyCampusRevisions(geo) {
  const facultyBuildings = geo.buildings.filter(building=>facultyResidenceBuildingIds.includes(building.osm));
  const residencePoint = facultyBuildings.length && {
    osm: facultyResidenceId,
    x: facultyBuildings.reduce((sum,b)=>sum+b.x,0)/facultyBuildings.length,
    z: facultyBuildings.reduce((sum,b)=>sum+b.z,0)/facultyBuildings.length,
  };
  // 行政中心 is mapped as five wings; its label sits at their centre.
  const wings = geo.buildings.filter(building=>administrationWings.includes(building.osm));
  const administrationPoint = wings.length && {
    osm: administrationCenterId,
    x: wings.reduce((sum,b)=>sum+b.x,0)/wings.length,
    z: wings.reduce((sum,b)=>sum+b.z,0)/wings.length,
  };
  const pois = geo.pois.map(point=>point.osm===wenliBoulevardId
    ? {...point,x:-703,z:-26} : point);
  if (residencePoint) pois.push(residencePoint);
  if (administrationPoint) pois.push(administrationPoint);
  pois.push(secondGatePoint, carbonParkPoint, ...placePoints);
  // Every listed building is a representative point, so it can be clicked and labelled.
  const known = new Set(pois.map(point=>point.osm));
  for (const building of geo.buildings) {
    if (!known.has(building.osm) && places.some(place=>place.id===building.osm)) {
      pois.push({osm:building.osm,x:building.x,z:building.z});
    }
  }
  return {
    ...geo,
    pois,
    buildings: [
      ...geo.buildings.filter(({osm})=>osm!==carbonNeutralityPark && osm!==artsMemorialClassroom && osm!==diningHallStore),
      activityCenterFootprint,
    ],
  };
}
