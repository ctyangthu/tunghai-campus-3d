// Rebuilds data/terrain.json from Mapzen Terrain Tiles (terrarium encoding).
//   node scripts/build-terrain.mjs
// Downloaded tiles are cached in .cache/terrain/. The output holds
// [bounds, nx, nz, base64 Uint16Array], each value an elevation in decimetres.
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {cacheDir, terrain} from './config.mjs';
import {decodePng} from './lib/png.mjs';
import {terrain as projection} from './lib/projection.mjs';

const {bounds: [west, north, east, south], nx, nz, zoom, tiles} = terrain;
const tileCache = new URL('terrain/', cacheDir);
await mkdir(tileCache, {recursive: true});

const loaded = new Map();
function tile(x, y) {
  const key = `${zoom}/${x}/${y}`;
  if (!loaded.has(key)) loaded.set(key, loadTile(key));
  return loaded.get(key);
}
async function loadTile(key) {
  const file = new URL(key.replaceAll('/', '-') + '.png', tileCache);
  let bytes = await readFile(file).catch(() => null);
  if (!bytes) {
    const response = await fetch(`${tiles}/${key}.png`);
    if (!response.ok) throw new Error(`Terrain tile ${key}: HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(file, bytes);
  }
  const {width, height, rgb} = decodePng(bytes);
  if (width !== 256 || height !== 256) throw new Error(`Terrain tile ${key} is ${width}×${height}`);
  const elevation = new Float64Array(256 * 256);
  for (let i = 0; i < elevation.length; i++) {
    elevation[i] = rgb[i * 3] * 256 + rgb[i * 3 + 1] + rgb[i * 3 + 2] / 256 - 32768;
  }
  return elevation;
}

async function pixel(px, py) {
  const tx = Math.floor(px / 256), ty = Math.floor(py / 256);
  return (await tile(tx, ty))[(py - ty * 256) * 256 + (px - tx * 256)];
}

// Bilinear interpolation between pixel centres in Web Mercator pixel space.
async function elevationAt([lon, lat]) {
  const size = 256 * 2 ** zoom;
  const phi = lat * Math.PI / 180;
  const px = (lon + 180) / 360 * size - .5;
  const py = (1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2 * size - .5;
  const x0 = Math.floor(px), y0 = Math.floor(py), a = px - x0, b = py - y0;
  const [p00, p10, p01, p11] = await Promise.all([
    pixel(x0, y0), pixel(x0 + 1, y0), pixel(x0, y0 + 1), pixel(x0 + 1, y0 + 1),
  ]);
  return (p00 * (1 - a) + p10 * a) * (1 - b) + (p01 * (1 - a) + p11 * a) * b;
}

const decimetres = new Uint16Array(nx * nz);
for (let j = 0; j < nz; j++) {
  for (let i = 0; i < nx; i++) {
    const x = west + i * (east - west) / (nx - 1);
    const z = north + j * (south - north) / (nz - 1);
    decimetres[j * nx + i] = Math.round(await elevationAt(projection.toLonLat([x, z])) * 10);
  }
}
const encoded = Buffer.from(decimetres.buffer).toString('base64');
await writeFile(new URL('../data/terrain.json', import.meta.url),
  JSON.stringify([[west, north, east, south], nx, nz, encoded]));
console.log(`data/terrain.json: ${nx}×${nz} samples from ${loaded.size} tiles at zoom ${zoom}`);
