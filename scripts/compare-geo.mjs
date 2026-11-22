// Compares two campus-geo.json files layer by layer, by OSM id.
//   node scripts/compare-geo.mjs <old.json> <new.json> [--verbose]
// Use it before replacing docs/data/campus-geo.json with a rebuilt copy.
import {readFile} from 'node:fs/promises';

const [oldFile, newFile] = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const verbose = process.argv.includes('--verbose');
if (!oldFile || !newFile) {
  console.error('Usage: node scripts/compare-geo.mjs <old.json> <new.json> [--verbose]');
  process.exit(1);
}
const [before, after] = await Promise.all([oldFile, newFile].map(async file => JSON.parse(await readFile(file, 'utf8'))));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Polygon rings that differ only in start point or direction describe the same shape.
function canonicalRing(ring) {
  const text = point => point.join(',');
  const start = ring.reduce((best, point, i) => text(point) < text(ring[best]) ? i : best, 0);
  const forward = [...ring.slice(start), ...ring.slice(0, start)];
  const backward = [forward[0], ...forward.slice(1).reverse()];
  return JSON.stringify(forward) < JSON.stringify(backward) ? forward : backward;
}
function canonical(item, layer) {
  if (layer !== 'buildings' && layer !== 'land') return item;
  return {
    ...item,
    points: canonicalRing(item.points),
    ...(item.holes ? {holes: item.holes.map(canonicalRing).sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : 1)} : {}),
  };
}

function keyed(list) {
  const map = new Map();
  for (const item of list) {
    const base = item.osm;
    let k = base, n = 1;
    while (map.has(k)) k = `${base}#${++n}`; // roads can be split into several pieces
    map.set(k, item);
  }
  return map;
}

let differences = 0;
for (const layer of ['buildings', 'roads', 'land', 'pois']) {
  const a = keyed(before[layer]), b = keyed(after[layer]);
  const removed = [...a.keys()].filter(k => !b.has(k));
  const added = [...b.keys()].filter(k => !a.has(k));
  const changed = new Map();
  for (const [k, item] of a) {
    if (!b.has(k)) continue;
    const [left, right] = [canonical(item, layer), canonical(b.get(k), layer)];
    const fields = [...new Set([...Object.keys(left), ...Object.keys(right)])].filter(f => !same(left[f], right[f]));
    if (fields.length) changed.set(k, fields);
  }
  const fieldCounts = {};
  for (const fields of changed.values()) for (const f of fields) fieldCounts[f] = (fieldCounts[f] ?? 0) + 1;
  const orderSame = same([...a.keys()].filter(k => b.has(k)), [...b.keys()].filter(k => a.has(k)));
  console.log(`${layer}: ${a.size} → ${b.size}; identical ${a.size - removed.length - changed.size}` +
    `, changed ${changed.size}${Object.keys(fieldCounts).length ? ' ' + JSON.stringify(fieldCounts) : ''}` +
    `, removed ${removed.length}, added ${added.length}${orderSame ? '' : ', order differs'}`);
  if (verbose) {
    if (removed.length) console.log('  removed:', removed.join(' '));
    if (added.length) console.log('  added:', added.join(' '));
    for (const [k, fields] of changed) {
      const detail = fields.filter(f => f !== 'points' && f !== 'holes')
        .map(f => `${f} ${JSON.stringify(a.get(k)[f])} → ${JSON.stringify(b.get(k)[f])}`);
      if (fields.includes('points')) detail.push(`points ${a.get(k).points.length} → ${b.get(k).points.length}`);
      console.log(`  ${k}: ${detail.join('; ')}`);
    }
  }
  differences += removed.length + added.length + changed.size;
}
for (const field of ['boundary', 'trees', 'origin', 'boundaryId']) {
  const equal = same(before[field], after[field]);
  console.log(`${field}: ${equal ? 'identical' : 'differs'}`);
  if (!equal) differences++;
}
process.exitCode = differences ? 1 : 0;
