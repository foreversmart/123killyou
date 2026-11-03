import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { packPlant, createPlantLibrary } from './pack.mjs';
import { loadGrassPatch, packGrass } from './grass.mjs';

// This is an offline build tool. The game only reads its packed output and does
// not import Tidewater or require the neighbouring checkout at runtime.
const root = fileURLToPath(new URL('../../', import.meta.url));
const source = path.resolve(process.argv[2] || path.join(root, '../tidewater'));
const output = path.join(root, 'web/public/art/vegetation');
const modulePath = 'src/world/vegetation/PlantGeometry.js';
const plants = await import(pathToFileURL(path.join(source, modulePath)).href);
const records = [];

function add(name, result, family, nominalHeight, sourceGenerator) {
  records.push({
    name: `tidewater_${name}`,
    ...packPlant(result.geometry || result, family, nominalHeight),
    metadata: { family, nominalHeight, sourceGenerator },
  });
}

const tree = plants.buildTreeNear(21).geometry;
for (let variant = 0; variant < plants.TREE_VARIANTS; variant++) {
  add(
    `tree_${variant}`,
    plants.lobeVariantGeometry(tree, plants.LOBE_TABLE, variant * 8, variant),
    'canopy',
    plants.TREE_H,
    { function: 'buildTreeNear', seed: 21, variant },
  );
}
const shrub = plants.buildShrubNear(31).geometry;
for (let variant = 0; variant < plants.SHRUB_VARIANTS; variant++) {
  add(
    `shrub_${variant}`,
    plants.lobeVariantGeometry(shrub, plants.LOBE_TABLE, (plants.TREE_VARIANTS + variant) * 8),
    'canopy',
    plants.SHRUB_H,
    { function: 'buildShrubNear', seed: 31, variant },
  );
}
for (const [name, generator, seed, height] of [
  ['palm', 'buildPalmNear', 11, 10],
  ['young_palm', 'buildYoungPalm', 5, 0.35],
  ['fern', 'buildFern', 3, 0.02],
  ['banana_0', 'buildBanana', 9, 0.02],
  ['banana_1', 'buildBanana', 23, 0.02],
  ['monstera', 'buildMonstera', 41, 0.02],
  ['elephant_ear', 'buildElephantEar', 43, 0.02],
  ['heliconia', 'buildHeliconia', 47, 0.02],
  ['strelitzia', 'buildStrelitzia', 53, 0.02],
]) {
  add(name, plants[generator](seed), 'plant', height, { function: generator, seed });
}
records.push({
  name: 'tidewater_grass_patch',
  ...packGrass(await loadGrassPatch(source)),
  metadata: {
    family: 'grass',
    cellSize: 8,
    nominalHeight: 1,
    sourceGenerator: { function: 'buildPatch', level: 0, seed: 7, kind: 0 },
    rootPosition: 'sourceMatYzw.xy contains the clump root X/Z within the 8m cell',
  },
});

const sourceFiles = [
  modulePath,
  'src/world/vegetation/GeoBuilder.js',
  'src/world/vegetation/TreeForms.js',
  'src/world/vegetation/GrassField.js',
  'src/util/Noise.js',
];
const sources = {};
for (const file of sourceFiles) {
  sources[file] = createHash('sha256')
    .update(await readFile(path.join(source, file)))
    .digest('hex');
}
const { manifest, binary } = createPlantLibrary(records);
manifest.source = {
  project: 'Tidewater',
  license: 'MIT',
  copyright: 'Copyright (c) 2026 DRG Software Solutions LLC',
  files: sources,
};
await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'vegetation.bin'), binary);
await writeFile(path.join(output, 'vegetation.json'), JSON.stringify(manifest, null, 2) + '\n');
await copyFile(path.join(source, 'LICENSE'), path.join(output, 'LICENSE'));
for (const record of records) {
  console.log(
    `${record.name}: ${record.vertices.length / 16} vertices, ${record.indices.length / 3} triangles`,
  );
}
console.log(`Wrote ${records.length} exact source meshes (${binary.byteLength} bytes).`);
