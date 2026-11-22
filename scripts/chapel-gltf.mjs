// Converts data/luce-chapel.json to and from glTF 2.0 so the chapel can be edited in
// Blender or any other 3D tool. The JSON keeps one group per material:
// Float32 positions and normals plus Uint16 indices, each base64-encoded.
//
//   node scripts/chapel-gltf.mjs export [file.gltf]   (default .cache/luce-chapel.gltf)
//   node scripts/chapel-gltf.mjs import <file.gltf|file.glb>
//
// Import merges primitives that share a material, applies node transforms,
// and computes normals for any primitive that has none.
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';

const chapelFile = new URL('../data/luce-chapel.json', import.meta.url);
const FLOAT = 5126, UINT16 = 5123, UINT32 = 5125, UINT8 = 5121;
const COMPONENTS = {SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16};

const decode = (text, Type) => new Type(new Uint8Array(Buffer.from(text, 'base64')).buffer);
const encode = array => Buffer.from(array.buffer, array.byteOffset, array.byteLength).toString('base64');

const toLinear = c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
const toSrgb = c => c <= .0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - .055;
const hexToLinear = hex => [1, 3, 5].map(i => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
const linearToHex = rgb => '#' + rgb.slice(0, 3)
  .map(c => Math.round(Math.min(1, Math.max(0, toSrgb(c))) * 255).toString(16).padStart(2, '0')).join('');

async function exportGltf(target) {
  const chapel = JSON.parse(await readFile(chapelFile, 'utf8'));
  const chunks = [], bufferViews = [], accessors = [], materials = [], primitives = [];
  let length = 0;
  function view(array, kind) {
    const pad = (4 - length % 4) % 4;
    if (pad) chunks.push(Buffer.alloc(pad));
    length += pad;
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    bufferViews.push({buffer: 0, byteOffset: length, byteLength: bytes.length, target: kind});
    chunks.push(bytes);
    length += bytes.length;
    return bufferViews.length - 1;
  }
  function accessor(array, type, componentType, kind, bounds = false) {
    const entry = {bufferView: view(array, kind), componentType, count: array.length / COMPONENTS[type], type};
    if (bounds) {
      entry.min = [0, 1, 2].map(axis => Math.min(...array.filter((_, i) => i % 3 === axis)));
      entry.max = [0, 1, 2].map(axis => Math.max(...array.filter((_, i) => i % 3 === axis)));
    }
    accessors.push(entry);
    return accessors.length - 1;
  }
  for (const group of chapel.groups) {
    materials.push({
      name: group.name,
      doubleSided: group.doubleSided,
      pbrMetallicRoughness: {baseColorFactor: [...hexToLinear(group.color), 1], metallicFactor: 0, roughnessFactor: 1},
    });
    primitives.push({
      attributes: {
        POSITION: accessor(decode(group.positionsFloat32, Float32Array), 'VEC3', FLOAT, 34962, true),
        NORMAL: accessor(decode(group.normalsFloat32, Float32Array), 'VEC3', FLOAT, 34962),
      },
      indices: accessor(decode(group.indicesUint16, Uint16Array), 'SCALAR', UINT16, 34963),
      material: materials.length - 1,
    });
  }
  const buffer = Buffer.concat(chunks);
  const gltf = {
    asset: {version: '2.0', generator: 'tunghai-campus-3d scripts/chapel-gltf.mjs',
      extras: {units: chapel.units, axis: chapel.axis}},
    scene: 0,
    scenes: [{name: 'Luce Memorial Chapel', nodes: [0]}],
    nodes: [{name: 'Luce Memorial Chapel', mesh: 0}],
    meshes: [{name: 'Luce Memorial Chapel', primitives}],
    materials,
    accessors,
    bufferViews,
    buffers: [{byteLength: buffer.length, uri: 'data:application/octet-stream;base64,' + buffer.toString('base64')}],
  };
  await mkdir(dirname(target), {recursive: true});
  await writeFile(target, JSON.stringify(gltf, null, 1));
  console.log(`Wrote ${target}: ${chapel.groups.length} materials`);
}

async function readGltf(source) {
  const bytes = await readFile(source);
  if (bytes.toString('latin1', 0, 4) === 'glTF') {
    const jsonLength = bytes.readUInt32LE(12);
    const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
    const binStart = 20 + jsonLength;
    const bin = binStart < bytes.length ? bytes.subarray(binStart + 8, binStart + 8 + bytes.readUInt32LE(binStart)) : null;
    return {gltf, buffers: gltf.buffers.map(buffer => buffer.uri ? loadUri(buffer.uri, source) : bin)};
  }
  const gltf = JSON.parse(bytes.toString('utf8'));
  return {gltf, buffers: gltf.buffers.map(buffer => loadUri(buffer.uri, source))};
}
function loadUri(uri, source) {
  if (uri.startsWith('data:')) return Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64');
  return readFile(resolve(dirname(source), decodeURIComponent(uri)));
}

function readAccessor(gltf, buffers, index) {
  const accessor = gltf.accessors[index];
  const width = COMPONENTS[accessor.type];
  const Type = {[FLOAT]: Float32Array, [UINT16]: Uint16Array, [UINT32]: Uint32Array, [UINT8]: Uint8Array}[accessor.componentType];
  if (!Type || accessor.sparse) throw new Error(`Unsupported accessor ${index}`);
  const view = gltf.bufferViews[accessor.bufferView];
  const buffer = buffers[view.buffer];
  const start = buffer.byteOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride ?? width * Type.BYTES_PER_ELEMENT;
  const out = new Type(accessor.count * width);
  const data = new DataView(buffer.buffer);
  const reader = {[FLOAT]: 'getFloat32', [UINT16]: 'getUint16', [UINT32]: 'getUint32', [UINT8]: 'getUint8'}[accessor.componentType];
  for (let i = 0; i < accessor.count; i++) {
    for (let k = 0; k < width; k++) out[i * width + k] = data[reader](start + i * stride + k * Type.BYTES_PER_ELEMENT, true);
  }
  return out;
}

const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}
function localMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}
const isIdentity = m => m.every((value, i) => value === identity[i]);

function transform(positions, normals, m) {
  if (isIdentity(m)) return;
  for (let i = 0; i < positions.length; i += 3) {
    const [x, y, z] = positions.subarray(i, i + 3);
    positions.set([0, 1, 2].map(r => m[r] * x + m[4 + r] * y + m[8 + r] * z + m[12 + r]), i);
  }
  // Normals use the inverse transpose; for rotation and uniform scale that is the
  // same rotation, renormalised. Non-uniform scale is rare for an architectural model.
  for (let i = 0; i < normals.length; i += 3) {
    const [x, y, z] = normals.subarray(i, i + 3);
    const n = [0, 1, 2].map(r => m[r] * x + m[4 + r] * y + m[8 + r] * z);
    const length = Math.hypot(...n) || 1;
    normals.set(n.map(v => v / length), i);
  }
}

function computeNormals(positions, indices) {
  const normals = new Float32Array(positions.length);
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [indices[t] * 3, indices[t + 1] * 3, indices[t + 2] * 3];
    const u = [0, 1, 2].map(k => positions[b + k] - positions[a + k]);
    const v = [0, 1, 2].map(k => positions[c + k] - positions[a + k]);
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    for (const vertex of [a, b, c]) for (let k = 0; k < 3; k++) normals[vertex + k] += n[k];
  }
  for (let i = 0; i < normals.length; i += 3) {
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    for (let k = 0; k < 3; k++) normals[i + k] /= length;
  }
  return normals;
}

async function importGltf(source) {
  const {gltf, buffers: pending} = await readGltf(source);
  const buffers = await Promise.all(pending);
  const groups = new Map();
  function visit(index, parent) {
    const node = gltf.nodes[index];
    const matrix = multiply(parent, localMatrix(node));
    if (node.mesh !== undefined) {
      for (const primitive of gltf.meshes[node.mesh].primitives) {
        if ((primitive.mode ?? 4) !== 4) throw new Error('Only triangle primitives are supported');
        const positions = readAccessor(gltf, buffers, primitive.attributes.POSITION);
        const count = positions.length / 3;
        const indices = primitive.indices === undefined
          ? Uint32Array.from({length: count}, (_, i) => i)
          : readAccessor(gltf, buffers, primitive.indices);
        const normals = primitive.attributes.NORMAL === undefined
          ? computeNormals(positions, indices)
          : readAccessor(gltf, buffers, primitive.attributes.NORMAL);
        transform(positions, normals, matrix);
        const material = gltf.materials?.[primitive.material] ?? {name: 'Default'};
        const key = primitive.material ?? -1;
        if (!groups.has(key)) {
          groups.set(key, {
            name: material.name ?? `Material ${key}`,
            color: linearToHex(material.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1]),
            doubleSided: Boolean(material.doubleSided),
            positions: [], normals: [], indices: [], count: 0,
          });
        }
        const group = groups.get(key);
        group.positions.push(positions);
        group.normals.push(normals);
        group.indices.push(Array.from(indices, i => i + group.count));
        group.count += count;
      }
    }
    for (const child of node.children ?? []) visit(child, matrix);
  }
  const scene = gltf.scenes?.[gltf.scene ?? 0];
  for (const root of scene?.nodes ?? gltf.nodes.map((_, i) => i)) visit(root, identity);

  const join = (parts, Type) => {
    const out = new Type(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) { out.set(part, offset); offset += part.length; }
    return out;
  };
  const chapel = {
    units: gltf.asset?.extras?.units ?? 'indicative meters',
    axis: gltf.asset?.extras?.axis ?? 'Y up, entrance +Z',
    groups: [...groups.values()].map(group => {
      if (group.count > 65536) throw new Error(`${group.name} has ${group.count} vertices; Uint16 indices allow 65536`);
      return {
        name: group.name,
        color: group.color,
        doubleSided: group.doubleSided,
        positionsFloat32: encode(join(group.positions, Float32Array)),
        normalsFloat32: encode(join(group.normals, Float32Array)),
        indicesUint16: encode(Uint16Array.from(group.indices.flat())),
      };
    }),
  };
  await writeFile(chapelFile, JSON.stringify(chapel));
  console.log(`Wrote data/luce-chapel.json: ${chapel.groups.map(g => g.name).join(', ')}`);
}

const [command, file] = process.argv.slice(2);
if (command === 'export') await exportGltf(resolve(file ?? new URL('../.cache/luce-chapel.gltf', import.meta.url).pathname));
else if (command === 'import' && file) await importGltf(resolve(file));
else {
  console.error('Usage: node scripts/chapel-gltf.mjs export [file.gltf] | import <file.gltf|file.glb>');
  process.exitCode = 1;
}
