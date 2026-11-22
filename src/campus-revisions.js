import {activityCenterFootprint} from './activity-center.js';

// The OSM relation is a campus park boundary enclosing separated facilities.
// The source layer remains available for download under the ODbL.
const carbonNeutralityPark = 'r18476872';

export function applyCampusRevisions(geo) {
  return {
    ...geo,
    buildings: [
      ...geo.buildings.filter(building=>building.osm!==carbonNeutralityPark),
      activityCenterFootprint,
    ],
  };
}
