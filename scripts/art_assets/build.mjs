import path from 'node:path';
import { copyFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import { readGltf } from './gltf.mjs';
import { createLibrary } from './library.mjs';
import { bodyParts } from './pose.mjs';
import { foliage } from './foliage.mjs';
import { addHeads } from './heads.mjs';
import { addStatue } from './statue.mjs';

// Usage: node scripts/art_assets/build.mjs <Poly Haven downloads> <Rocketbox GLBs>
const source = process.argv[2],
  characters = process.argv[3];
if (!source || !characters)
  throw new Error('Provide the source and licensed character directories.');
const output = 'web/public/art/world';
const lib = await createLibrary(output);
for (const [id, asset] of [
  ['soil', 'brown_mud_leaves_01'],
  ['stone', 'stone_tiles_02'],
  ['wood', 'weathered_brown_planks'],
  ['forest', 'aerial_grass_rock'],
  ['roof', 'roof_tiles_14'],
  ['plaster', 'white_plaster_02'],
]) {
  await lib.surface(
    id,
    path.join(source, asset + '_Diffuse.jpg'),
    path.join(source, asset + '_nor_gl.jpg'),
    path.join(source, asset + '_arm.jpg'),
  );
}
for (const [id, asset, budget] of [
  ['tree', 'tree_small_02', 22000],
  ['rock', 'rock_moss_set_01', 4500],
  ['fern', 'fern_02', 1800],
  ['grass', 'grass_medium_02', 1800],
]) {
  const gltf = await readGltf(path.join(source, asset, asset + '.gltf'));
  const surfaces = [];
  for (const [index, mat] of gltf.json.materials.entries()) {
    const pbr = mat.pbrMetallicRoughness || {};
    let color = gltf.texture(pbr.baseColorTexture?.index);
    if (mat.alphaMode) {
      const alpha = await sharp(path.join(source, asset + '_alpha.png'))
        .resize(1024, 1024)
        .greyscale()
        .toBuffer();
      const opaque = await sharp(color).resize(1024, 1024).removeAlpha().png().toBuffer();
      // removeAlpha is a deferred Sharp operation; finish it before joining a new mask.
      color = await sharp(opaque).joinChannel(alpha).png().toBuffer();
    }
    surfaces.push(
      await lib.surface(
        id + '_' + index,
        color,
        gltf.texture(mat.normalTexture?.index),
        gltf.texture(pbr.metallicRoughnessTexture?.index),
      ),
    );
  }
  const names = [...new Set(gltf.meshes.map((m) => m.name))];
  // Each source variation has its own origin; do not import the whole display lineup.
  for (const [variant, name] of names.slice(0, id === 'tree' ? 1 : 3).entries()) {
    const meshes = gltf.meshes.filter((m) => m.name === name);
    const bounds = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (const m of meshes)
      for (let i = 0; i < m.positions.length; i++) {
        const axis = i % 3;
        bounds[axis] = Math.min(bounds[axis], m.positions[i]);
        bounds[axis + 3] = Math.max(bounds[axis + 3], m.positions[i]);
      }
    const center = [(bounds[0] + bounds[3]) / 2, bounds[1], (bounds[2] + bounds[5]) / 2];
    const scale = id === 'tree' ? 5.8 / (bounds[4] - bounds[1]) : 1;
    lib.mesh(
      id + (variant || ''),
      meshes.map((mesh) => ({
        mesh: id === 'tree' && mesh.material === 1 ? foliage(mesh, 0.65) : mesh,
        preserve: id === 'tree' && mesh.material === 1,
        surface: surfaces[mesh.material],
      })),
      budget,
      (p) => p.map((v, i) => (v - center[i]) * scale),
    );
    if (id === 'tree')
      lib.mesh(
        'tree_far',
        meshes.map((mesh) => ({
          mesh: mesh.material === 1 ? foliage(mesh, 0.18) : mesh,
          preserve: mesh.material === 1,
          surface: surfaces[mesh.material],
        })),
        2600,
        (p) => p.map((v, i) => (v - center[i]) * scale),
      );
  }
}
for (const [file, identities] of [
  ['joe', ['zhouyan']],
  ['marta', ['linlan', 'xuzhi']],
]) {
  const gltf = await readGltf(path.join(characters, file + '.glb'));
  const material = gltf.json.materials.find((m) => m.name === 'body');
  const pbr = material.pbrMetallicRoughness;
  const surface = await lib.surface(
    file + '_clothing',
    gltf.texture(pbr.baseColorTexture.index),
    gltf.texture(material.normalTexture.index),
    gltf.texture(pbr.metallicRoughnessTexture.index),
  );
  const parts = bodyParts(gltf, file === 'joe' ? 0.95 : 0.99);
  if (file === 'joe')
    for (const { part, mesh } of parts.filter((p) => p.part.endsWith('arm'))) {
      const indices = [];
      for (let i = 0; i < mesh.indices.length; i += 3) {
        const triangle = [...mesh.indices.slice(i, i + 3)];
        if (triangle.every((vertex) => mesh.positions[vertex * 3 + 1] < -0.46))
          indices.push(...triangle);
      }
      const side = part.startsWith('left') ? 1 : -1;
      lib.mesh(
        'hand_' + (side > 0 ? 'left' : 'right'),
        [{ mesh: { ...mesh, indices: new Uint32Array(indices) }, surface }],
        3000,
        (p) => [p[0] - side * 0.035, p[1] + 0.55, p[2] - 0.045],
      );
    }
  for (const id of identities)
    for (const { part, mesh } of parts) {
      const coat =
        id === 'linlan' ? [1.7, 2.1, 2.3] : id === 'xuzhi' ? [0.7, 1.6, 1.1] : [0.15, 0.23, 0.34];
      const pants =
        id === 'linlan' ? [0.18, 0.2, 0.21] : id === 'xuzhi' ? [0.4, 0.5, 0.45] : [0.25, 0.28, 0.3];
      lib.mesh(
        id + '_' + part,
        [
          {
            mesh,
            surface,
            color: (p) =>
              part.endsWith('arm') && p[1] < -0.38
                ? [1, 1, 1]
                : part.endsWith('leg')
                  ? pants
                  : coat,
          },
        ],
        6000,
      );
    }
}
await addHeads(lib, source);
await addStatue(lib, source);
for (const [id, file] of [
  ['day', 'sky_day'],
  ['night', 'moonless_golf'],
]) {
  await sharp(path.join(source, file + '.jpg'))
    .resize(2048, 1024)
    .webp({ quality: 92 })
    .toFile(path.join(output, 'sky_' + id + '.webp'));
}
await mkdir('assets/environment', { recursive: true });
await copyFile(
  path.join(characters, 'LICENSE-Rocketbox.md'),
  'assets/environment/LICENSE-Rocketbox.md',
);
await lib.save();
