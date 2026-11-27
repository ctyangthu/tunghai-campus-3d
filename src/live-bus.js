import * as T from 'three';

// Live positions of the campus shuttles from the university's vehicle API
// (東海校車定位 API 串接說明, checked 2026-11-27): one public GeoJSON snapshot of every
// shuttle with a valid fix. Rules from that document, kept here:
// - plain GET, no credentials; the API allows https://ctyangthu.github.io cross-origin;
// - the next request goes out at least 20 s after the previous one finished, one at a
//   time, a single loop per page (a 429 says how long to wait in Retry-After);
// - each successful snapshot is complete: add or move by id, drop vehicles missing from
//   it, and an empty list clears them; on failure keep the last snapshot on screen;
// - coordinates are [longitude, latitude]; gpsTime is each vehicle's own last fix.
export const vehicleFeedUrl = 'https://gis.th-thu.com/api/bus/vehicles.geojson';
const minimumGap = 20;
// Earliest time the next request may go out; kept across stop and start, so turning the
// layer off and on again never polls sooner than the API allows.
let earliest = 0;

export function startCampusBusFeed({onSnapshot, onIssue}) {
  const controller = new AbortController();
  let timer;
  async function update() {
    let waitSeconds = minimumGap;
    try {
      const response = await fetch(vehicleFeedUrl, {signal: controller.signal, credentials: 'omit'});
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('Retry-After'));
        if (Number.isFinite(retryAfter)) waitSeconds = Math.max(minimumGap, retryAfter);
        onIssue({kind: 'limit', seconds: waitSeconds});
      } else if (!response.ok) {
        onIssue({kind: 'http', status: response.status});
      } else {
        const snapshot = await response.json();
        if (snapshot.type !== 'FeatureCollection' || !Array.isArray(snapshot.features)) throw new Error('format');
        if (!controller.signal.aborted) onSnapshot(snapshot);
      }
    } catch (error) {
      if (!controller.signal.aborted) onIssue({kind: 'error', message: error.message});
    } finally {
      earliest = Date.now() + waitSeconds * 1000;
      if (!controller.signal.aborted) timer = setTimeout(update, waitSeconds * 1000);
    }
  }
  timer = setTimeout(update, Math.max(0, earliest - Date.now()));
  return function stop() {
    controller.abort();
    clearTimeout(timer);
  };
}

// A small shuttle bus: white body, campus-green stripe, dark window band.
function busModel() {
  const group = new T.Group();
  const part = (color, w, h, d, y, z = 0) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshLambertMaterial({color}));
    mesh.position.set(0, y, z);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };
  part('#f2f0e8', 2.4, 2.5, 8.6, 1.65);       // body
  part('#2c383d', 2.46, .95, 7.6, 2.15, -.3);  // side windows
  part('#2c383d', 2.2, 1, .1, 2.1, 4.3);       // windscreen
  part('#23634e', 2.48, .32, 8.64, 1.05);      // stripe
  part('#d9d6cb', 2.2, .12, 8.2, 2.96);        // roof
  for (const z of [-2.8, 2.6]) for (const x of [-1.15, 1.15]) {
    const wheel = new T.Mesh(new T.CylinderGeometry(.48, .48, .3, 12), new T.MeshLambertMaterial({color: '#222'}));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, .48, z);
    group.add(wheel);
  }
  return group;
}

// Vehicles on the 3D map. `origin` is the map's [longitude, latitude]; `paths` are the
// route polylines, used to set a vehicle on the road and to point it along it.
export function createVehicleLayer(scene, terrainHeight, origin, paths) {
  const [lon0, lat0] = origin;
  const kx = 111320 * Math.cos(lat0 * Math.PI / 180), kz = 110770;
  const group = new T.Group();
  group.visible = false;
  scene.add(group);
  const vehicles = new Map();

  function nearestRoad(x, z) {
    let best = null;
    for (const path of paths) {
      for (let i = 1; i < path.length; i++) {
        const [ax, az] = path[i - 1], [bx, bz] = path[i];
        const dx = bx - ax, dz = bz - az;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
        const px = ax + t * dx, pz = az + t * dz, d = Math.hypot(px - x, pz - z);
        if (!best || d < best.d) best = {d, x: px, z: pz, yaw: Math.atan2(dx, dz)};
      }
    }
    return best;
  }

  function update(snapshot) {
    const seen = new Set();
    for (const feature of snapshot.features) {
      const coordinates = feature?.geometry?.coordinates;
      if (!feature?.id || !Array.isArray(coordinates) || !coordinates.every(Number.isFinite)) continue;
      const [lon, lat] = coordinates;
      let x = (lon - lon0) * kx, z = -(lat - lat0) * kz;
      // GPS within a few metres of a route sits on it, facing along the road.
      const road = nearestRoad(x, z);
      let yaw = null;
      if (road && road.d < 15) {
        x = road.x;
        z = road.z;
        yaw = road.yaw;
      }
      let vehicle = vehicles.get(feature.id);
      if (!vehicle) {
        vehicle = {id: feature.id, model: busModel(), yaw: yaw ?? 0};
        vehicle.model.traverse(object => { if (object.isMesh) object.userData.vehicle = feature.id; });
        group.add(vehicle.model);
        vehicles.set(feature.id, vehicle);
      } else if (Math.hypot(x - vehicle.x, z - vehicle.z) > 3) {
        // Moving: face the way it went, or the road direction nearest to that.
        const moved = Math.atan2(x - vehicle.x, z - vehicle.z);
        yaw = yaw === null ? moved : (Math.cos(moved - yaw) < 0 ? yaw + Math.PI : yaw);
      } else if (yaw !== null && Math.cos(vehicle.yaw - yaw) < 0) {
        yaw += Math.PI;
      }
      vehicle.x = x;
      vehicle.z = z;
      vehicle.yaw = yaw ?? vehicle.yaw;
      vehicle.gpsTime = Date.parse(feature.properties?.gpsTime) || null;
      vehicle.model.position.set(x, terrainHeight(x, z) + .15, z);
      vehicle.model.rotation.y = vehicle.yaw;
      seen.add(feature.id);
    }
    for (const [id, vehicle] of vehicles) {
      if (seen.has(id)) continue;
      group.remove(vehicle.model);
      vehicles.delete(id);
    }
  }

  return {group, vehicles, update};
}

// "剛剛" / minutes / hours since a vehicle's last fix.
export function fixAge(gpsTime, now = Date.now()) {
  if (!gpsTime) return null;
  const minutes = Math.max(0, Math.floor((now - gpsTime) / 60000));
  return minutes < 60 ? {minutes} : {hours: Math.floor(minutes / 60)};
}

const clock = new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'});
export const taipeiTime = time => clock.format(new Date(time));
