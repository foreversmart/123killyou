import path from 'node:path';
import { readGltf } from './gltf.mjs';

// Minneapolis Institute of Art, CC0. Keep the sculptor's silhouette and face;
// only normalize the scan into the temple's meter-based coordinates.
export async function addStatue(lib, source) {
  const gltf = await readGltf(path.join(source, 'guanyin.glb'));
  const material = gltf.json.materials[0];
  const slot = await lib.surface(
    'guanyin',
    gltf.texture(material.pbrMetallicRoughness.baseColorTexture.index),
    gltf.texture(material.normalTexture.index),
    undefined,
    0.83,
  );
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of gltf.meshes)
    for (let i = 0; i < mesh.positions.length; i++) {
      min[i % 3] = Math.min(min[i % 3], mesh.positions[i]);
      max[i % 3] = Math.max(max[i % 3], mesh.positions[i]);
    }
  const center = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2];
  const scale = 2.55 / (max[1] - min[1]);
  lib.mesh(
    'guanyin',
    gltf.meshes.map((mesh) => ({ mesh, surface: slot })),
    55000,
    (p) => p.map((v, i) => (v - center[i]) * scale),
  );
}
