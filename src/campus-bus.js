import * as T from 'three';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';

// The campus shuttle (data/campus-bus.json, scripts/build-bus.mjs): route lines along
// the roads, drawn a fixed number of pixels wide so they read at every zoom, and a sign
// post at every stop. Both shuttle routes are drawn the same width; each keeps to the
// right-hand side of the road in its direction of travel, so where the two share a
// road they run side by side.
export const busHome = 'https://bus.service.thu.edu.tw/';
// The university's live bus positions. It is served over plain http, so a page on
// https may link to it but cannot embed it or read from it.
export const busLive = 'http://60.248.165.113:61279/';

const lift = 1.2;

// Splits a polyline into pieces about `step` metres long.
function densify(points, step) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1], [bx, bz] = points[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 1; k <= n; k++) out.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
  }
  return out;
}

// Moves a polyline `distance` metres to the right of its direction of travel.
function keepRight(points, distance) {
  return points.map(([x, z], i) => {
    const [px, pz] = points[Math.max(0, i - 1)], [nx, nz] = points[Math.min(points.length - 1, i + 1)];
    const dx = nx - px, dz = nz - pz, length = Math.hypot(dx, dz) || 1;
    return [x - dz / length * distance, z + dx / length * distance];
  });
}

export function addBusLayer(bus, surface) {
  const group = new T.Group();
  group.visible = false;
  const materials = [];
  bus.routes.forEach((route, index) => {
    const path = keepRight(densify(route.path, 3), 2.2);
    const geometry = new LineGeometry();
    // Slightly different heights so the two never fight for the same depth.
    geometry.setPositions(path.flatMap(([x, z]) => [x, surface(x, z) + lift + index * 1.8, z]));
    const material = new LineMaterial({color: route.color, linewidth: 3.2, worldUnits: false});
    materials.push(material);
    const line = new Line2(geometry, material);
    line.computeLineDistances();
    line.renderOrder = 2 + index;
    group.add(line);
  });
  const pole = new T.MeshLambertMaterial({color: '#e8e6dd'});
  const sign = new T.MeshLambertMaterial({color: '#e0a92e'});
  const poleGeometry = new T.CylinderGeometry(.09, .09, 3, 8);
  const signGeometry = new T.BoxGeometry(.9, .9, .08);
  // A stop with a platform on each side gets a sign at each, but one label.
  const labelled = new Set();
  const stops = Object.entries(bus.stops).flatMap(([id, stop]) => {
    const [x, z] = stop.at;
    const ground = surface(x, z);
    const post = new T.Mesh(poleGeometry, pole);
    post.position.set(x, ground + 1.5, z);
    const plate = new T.Mesh(signGeometry, sign);
    plate.position.set(x, ground + 2.7, z);
    group.add(post, plate);
    if (labelled.has(stop.zh)) return [];
    labelled.add(stop.zh);
    return [{id, stop, x, y: ground + 3.4, z}];
  });
  // Taichung city buses (354): both directions in purple above the shuttle routes,
  // with purple stop signs; one label per stop name (a stop has a platform each side).
  const cityStops = [];
  const citySign = new T.MeshLambertMaterial({color: '#7b4fb0'});
  for (const line of bus.city ?? []) {
    const material = new LineMaterial({color: line.color, linewidth: 3.6, worldUnits: false});
    materials.push(material);
    for (const direction of line.directions) {
      const path = densify(direction.path, 3);
      const geometry = new LineGeometry();
      geometry.setPositions(path.flatMap(([x, z]) => [x, surface(x, z) + lift + 3.6, z]));
      const route = new Line2(geometry, material);
      route.computeLineDistances();
      route.renderOrder = 4;
      group.add(route);
      for (const stop of direction.stops) {
        const [x, z] = stop.at;
        const ground = surface(x, z);
        const post = new T.Mesh(poleGeometry, pole);
        post.position.set(x, ground + 1.5, z);
        const plate = new T.Mesh(signGeometry, citySign);
        plate.position.set(x, ground + 2.7, z);
        group.add(post, plate);
        if (cityStops.some(known => known.stop.zh === `${line.ref} ${stop.zh}`)) continue;
        cityStops.push({id: `city-${stop.osm}`, city: true,
          stop: {zh: `${line.ref} ${stop.zh}`, en: `${line.ref} ${stop.en}`}, x, y: ground + 3.4, z});
      }
    }
  }
  stops.push(...cityStops);
  // Line widths are in pixels, so the materials need the drawing size.
  const setResolution = (width, height) => materials.forEach(material => material.resolution.set(width, height));
  return {group, stops, setResolution};
}

// Departures are given in Taiwan time, Monday to Friday.
function taipeiClock(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(part => [part.type, part.value]));
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return {day, minutes: Number(parts.hour) * 60 + Number(parts.minute)};
}
const minutesOf = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

// {time, wait (minutes), day (0–6), today: boolean, left: departures left today}.
export function nextDeparture(route, date = new Date()) {
  const {day, minutes} = taipeiClock(date);
  const weekday = day >= 1 && day <= 5;
  const times = route.departures.map(minutesOf);
  const later = weekday ? times.filter(t => t >= minutes) : [];
  if (later.length) {
    return {time: route.departures[times.indexOf(later[0])], wait: later[0] - minutes, day, today: true, left: later.length};
  }
  let ahead = 1;
  while (![1, 2, 3, 4, 5].includes((day + ahead) % 7)) ahead++;
  return {time: route.departures[0], wait: ahead * 1440 + times[0] - minutes, day: (day + ahead) % 7, today: false, left: 0};
}
