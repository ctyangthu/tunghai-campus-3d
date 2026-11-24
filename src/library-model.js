import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// 圖書總館 from 東海大學校園建築模型 (https://gis.th-thu.com/models/?building=LIB,
// thu-library-v04), rebuilt there from site photographs, an overhead view and oblique
// views. scripts/optimize-library-model.mjs lightens it for the campus scene
// (docs/models/thu-library.glb); the page loads it after the campus is drawn and
// keeps the hand-built library (northern-landmarks.js) until then, or if it fails.
export const libraryId = 'w367196899';
export const libraryModelPath = 'models/thu-library.glb';
// OSM maps 二悅蒔室 as its own outline in the library's north-east corner; the model
// includes that part of the building, so its plain box is removed with the old library.
export const libraryCovers = ['w368066314'];

// Model frame: x across the front, y up with 0 at the entrance floor, +z out of the
// main entrance. It sits on the centre of the OSM roof outline at true scale, turned
// so the entrance faces east down 文理大道 like the rest of the campus grid.
const centre = {x: -938.0, z: -92.5};
const turn = Math.PI / 2 - .285;
// Site extent in the model frame (plaza, side walks, rear lane): [x0, x1, z0, z1].
const site = [-34, 36, -46, 49];

function toWorld(x, z) {
  const c = Math.cos(turn), s = Math.sin(turn);
  return [centre.x + x * c + z * s, centre.z - x * s + z * c];
}

// Materials of the model's earth banks around the plinth.
const earth = new Set(['坡地土色示意', '連橋下方土坡示意']);

// Where the generated trees must not grow.
export const librarySite = [[site[0], site[2]], [site[1], site[2]], [site[1], site[3]], [site[0], site[3]]]
  .map(([x, z]) => toWorld(x, z));

export async function loadLibraryModel(url, terrainHeight) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  const group = new T.Group();
  group.position.set(centre.x, terrainHeight(centre.x, centre.z), centre.z);
  group.rotation.y = turn;
  group.add(gltf.scene);
  const pickables = [];
  const plain = new Map();
  gltf.scene.traverse(object => {
    if (!object.isMesh) return;
    // The campus is lit with plain diffuse materials; match them.
    // The model's bare-earth banks become grassed banks in the campus palette.
    const source = object.material;
    if (!plain.has(source)) {
      plain.set(source, earth.has(source.name)
        ? new T.MeshLambertMaterial({color: '#c3cea6', side: source.side})
        : new T.MeshLambertMaterial({
          color: source.color, map: source.map, transparent: source.transparent, opacity: source.opacity,
          alphaTest: source.alphaTest, side: source.side, vertexColors: source.vertexColors,
        }));
      source.dispose();
    }
    object.material = plain.get(source);
    object.castShadow = object.receiveShadow = true;
    object.userData.osm = libraryId;
    pickables.push(object);
  });
  const bounds = new T.Box3().setFromObject(group);
  return {group, pickables, top: bounds.max.y};
}
