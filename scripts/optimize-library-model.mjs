// Lightens 圖書總館 (thu-library-v04.glb from https://gis.th-thu.com/models/?building=LIB)
// into docs/models/thu-library.glb for the campus scene: drops the normal, roughness and
// clearcoat maps (the campus uses plain diffuse lighting) and the solar-module frames,
// simplifies, merges parts by material, resizes textures to 512 px JPEG and compresses
// the geometry with EXT_meshopt_compression.
//
// The tools are not project dependencies; install them without saving, then run:
//   npm install --no-save @gltf-transform/core@4 @gltf-transform/functions@4 \
//     @gltf-transform/extensions@4 meshoptimizer@0.22 sharp@0.34
//   curl -LO https://gis.th-thu.com/models/assets/thu-library-v04.glb
//   node scripts/optimize-library-model.mjs thu-library-v04.glb docs/models/thu-library.glb
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup, prune, weld, simplify, flatten, join, textureCompress, meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';

const [input, output, errorArg = '0.004', sizeArg = '512'] = process.argv.slice(2);
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder});
const doc = await io.read(input);
const root = doc.getRoot();
const count = () => root.listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0);
console.log('before: meshes', root.listMeshes().length, 'tris', count());

// The aluminium frames of the rooftop solar modules add many small boxes that read as
// nothing at campus scale; the modules themselves stay.
const drop = new Set(['光電模組鋁框']);
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    if (drop.has(prim.getMaterial()?.getName())) prim.dispose();
  }
}
// The campus scene lights everything with plain diffuse materials: keep only base colour.
for (const material of root.listMaterials()) {
  material.setNormalTexture(null).setOcclusionTexture(null).setMetallicRoughnessTexture(null).setEmissiveTexture(null);
  for (const ext of material.listExtensions()) material.setExtension(ext.extensionName, null);
}
for (const ext of root.listExtensionsUsed()) if (ext.extensionName === 'KHR_materials_clearcoat') ext.dispose();
await doc.transform(
  prune(),
  dedup(),
  weld(),
  simplify({simplifier: MeshoptSimplifier, ratio: 0, error: Number(errorArg), lockBorder: false}),
  flatten(),
  join({keepNamed: false}),
  prune(),
  textureCompress({encoder: sharp, targetFormat: 'jpeg', resize: [Number(sizeArg), Number(sizeArg)], quality: 78}),
  meshopt({encoder: MeshoptEncoder, level: 'medium'}),
);
console.log('after: meshes', root.listMeshes().length, 'materials', root.listMaterials().length, 'textures', root.listTextures().length, 'tris', count());
await io.write(output, doc);
console.log('bytes', fs.statSync(output).size);
