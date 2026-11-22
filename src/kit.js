import * as T from 'three';

// Small helpers shared by the hand-modelled buildings.

const materials = new Map();
export function paint(color, side = T.FrontSide) {
  const key = color + side;
  if (!materials.has(key)) materials.set(key, new T.MeshLambertMaterial({color, side}));
  return materials.get(key);
}

// Collects box instances (world position, size and yaw) per material, so each
// material becomes a single instanced draw call.
export function createBoxBatch() {
  const batches = new Map();
  return {
    add(material, x, y, z, width, height, depth, yaw = 0) {
      if (!batches.has(material)) batches.set(material, []);
      batches.get(material).push([x, y, z, width, height, depth, yaw]);
    },
    flush(parent, osm) {
      const unit = new T.BoxGeometry(1, 1, 1);
      const dummy = new T.Object3D();
      const meshes = [];
      for (const [material, list] of batches) {
        const mesh = new T.InstancedMesh(unit, material, list.length);
        mesh.castShadow = mesh.receiveShadow = true;
        if (osm) mesh.userData.osm = osm;
        list.forEach(([x, y, z, width, height, depth, yaw], i) => {
          dummy.position.set(x, y, z);
          dummy.rotation.set(0, yaw, 0);
          dummy.scale.set(width, height, depth);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        });
        parent.add(mesh);
        meshes.push(mesh);
      }
      batches.clear();
      return meshes;
    },
  };
}

// A flat sign with text drawn on a canvas; vertical text stacks one character per line.
export function textPanel(text, width, height, {background = '#f5f4ef', color = '#233b31', vertical = false, serif = vertical} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * 64);
  canvas.height = Math.round(height * 64);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const family = serif ? '"Noto Serif TC", "Songti TC", serif' : 'system-ui, sans-serif';
  if (vertical) {
    const step = canvas.height / text.length;
    ctx.font = `600 ${Math.min(step * .78, canvas.width * .74)}px ${family}`;
    [...text].forEach((char, i) => ctx.fillText(char, canvas.width / 2, step * (i + .5)));
  } else {
    const size = Math.min(canvas.height * .56, canvas.width * .86 / Math.max(1, text.length));
    ctx.font = `600 ${size}px ${family}`;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  return new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshBasicMaterial({map: texture}));
}

// Local frame along a building axis: at(u, w) returns world [x, z]; u runs along
// `axis` (a unit vector) and w to its right-hand side looking down from above.
export function axisFrame(center, axis) {
  const across = [-axis[1], axis[0]];
  return {
    at: (u, w) => [center[0] + axis[0] * u + across[0] * w, center[1] + axis[1] * u + across[1] * w],
    yaw: -Math.atan2(axis[1], axis[0]),
    axis, across,
  };
}
