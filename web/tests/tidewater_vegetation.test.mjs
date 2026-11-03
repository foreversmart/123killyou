import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/'))
      return nextResolve(
        new URL('../src/' + specifier.slice(2) + '.ts', import.meta.url).href,
        context,
      );
    return nextResolve(specifier, context);
  },
});

const root = new URL('../public/art/vegetation/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('vegetation.json', root)));
const file = await readFile(new URL(manifest.binary, root));
const binary = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
const names = [
  ...Array.from({ length: 4 }, (_, i) => `tidewater_tree_${i}`),
  ...Array.from({ length: 2 }, (_, i) => `tidewater_shrub_${i}`),
  'tidewater_palm',
  'tidewater_young_palm',
  'tidewater_fern',
  'tidewater_banana_0',
  'tidewater_banana_1',
  'tidewater_monstera',
  'tidewater_elephant_ear',
  'tidewater_heliconia',
  'tidewater_strelitzia',
  'tidewater_grass_patch',
];
function mesh(name) {
  const range = manifest.meshes[name];
  return {
    range,
    vertices: new Float32Array(binary, range.vertexOffset, range.vertexCount),
    indices: new Uint32Array(binary, range.indexOffset, range.indexCount),
  };
}

test('Tidewater flora is a complete local library with auditable geometry sources and license', async () => {
  assert.deepEqual(Object.keys(manifest.meshes).sort(), names.toSorted());
  assert.equal(manifest.binary, 'vegetation.bin');
  assert.deepEqual((await readdir(root)).sort(), ['LICENSE', 'vegetation.bin', 'vegetation.json']);
  assert.equal(manifest.source.project, 'Tidewater');
  assert.equal(manifest.source.license, 'MIT');
  assert.deepEqual(Object.keys(manifest.source.files).sort(), [
    'src/util/Noise.js',
    'src/world/vegetation/GeoBuilder.js',
    'src/world/vegetation/GrassField.js',
    'src/world/vegetation/PlantGeometry.js',
    'src/world/vegetation/TreeForms.js',
  ]);
  for (const hash of Object.values(manifest.source.files)) assert.match(hash, /^[a-f0-9]{64}$/);
  const license = await readFile(new URL('LICENSE', root), 'utf8');
  assert.ok(license.includes(manifest.source.copyright));
  assert.match(license, /Permission is hereby granted, free of charge/);
  for (const range of Object.values(manifest.meshes)) {
    assert.match(range.sourceGenerator.function, /^build[A-Z]/);
    assert.ok(Number.isInteger(range.sourceGenerator.seed));
  }
});

test('packed flora has contiguous byte ranges, finite metre-scale geometry and valid surface metadata', () => {
  assert.equal(manifest.encoding.vertexStride, 16);
  assert.equal(manifest.encoding.offsetUnit, 'byte');
  assert.equal(manifest.encoding.vertexCountUnit, 'float32_element');
  assert.equal(manifest.encoding.indexCountUnit, 'uint32_element');
  let end = 0;
  for (const name of names) {
    const { range, vertices, indices } = mesh(name);
    assert.equal(range.vertexOffset, end, name);
    assert.equal(range.vertexCount % 16, 0, name);
    assert.equal(range.indexOffset, range.vertexOffset + range.vertexCount * 4, name);
    assert.equal(range.indexCount % 3, 0, name);
    assert.ok(vertices.every(Number.isFinite), name);
    assert.ok(
      indices.every((index) => index < vertices.length / 16),
      name,
    );
    let maxY = -Infinity;
    for (let i = 0; i < vertices.length; i += 16) {
      assert.ok(Math.hypot(...vertices.subarray(i, i + 3)) < 20, name);
      assert.ok(vertices[i + 1] > -1, name);
      assert.ok(Math.abs(Math.hypot(...vertices.subarray(i + 3, i + 6)) - 1) < 0.001, name);
      const pattern = vertices[i + 11];
      const allowed =
        range.family === 'canopy'
          ? [100, 101, 104, 105]
          : range.family === 'grass'
            ? [140]
            : [120, 121, 122, 123, 125, 126, 127, 128, 129, 130, 131];
      assert.ok(allowed.includes(pattern), `${name}: material ${pattern}`);
      assert.ok(vertices[i + 15] >= -3 && vertices[i + 15] <= -2, name);
      assert.ok(vertices[i + 9] >= -0.21 && vertices[i + 9] <= 1.2, name);
      assert.ok(vertices[i + 12] >= 0 && vertices[i + 12] <= 1, name);
      maxY = Math.max(maxY, vertices[i + 1]);
    }
    assert.ok(maxY > 0.3, `${name}: mesh must not collapse at its root`);
    if (name.startsWith('tidewater_tree_') || name === 'tidewater_palm')
      assert.ok(maxY > 10 && maxY < 15, `${name}: metre-scale crown height`);
    end = range.indexOffset + range.indexCount * 4;
  }
  assert.equal(end, binary.byteLength);
});

test('tree, shrub and banana variants preserve different silhouettes instead of duplicating a mesh', () => {
  for (const group of [names.slice(0, 4), names.slice(4, 6), names.slice(9, 11)]) {
    const silhouettes = group.map((name) => {
      const { vertices } = mesh(name);
      const positions = new Float32Array((vertices.length / 16) * 3);
      for (let i = 0; i < vertices.length; i += 16)
        positions.set(vertices.subarray(i, i + 3), (i / 16) * 3);
      return createHash('sha256').update(new Uint8Array(positions.buffer)).digest('hex');
    });
    assert.equal(new Set(silhouettes).size, group.length, group.join(', '));
  }
});

test('trunk roots retain their ground mask and palm foliage joins the top of its baked stem', () => {
  for (const name of [...names.slice(0, 6), 'tidewater_palm', 'tidewater_young_palm']) {
    const { vertices } = mesh(name);
    let roots = 0;
    for (let i = 0; i < vertices.length; i += 16) {
      if (vertices[i + 9] > 0 || ![100, 105, 120].includes(vertices[i + 11])) continue;
      roots++;
      assert.ok(vertices[i + 1] <= 0, `${name}: masked roots must remain beneath the ground`);
      assert.equal(vertices[i + 12], 0, `${name}: root flutter`);
    }
    assert.ok(roots > 0, name);
  }
  const { vertices } = mesh('tidewater_palm');
  let crownVertices = 0;
  let crownHeight = 0;
  for (let i = 0; i < vertices.length; i += 16) {
    if (vertices[i + 11] === 120) continue;
    crownVertices++;
    crownHeight += vertices[i + 1];
  }
  assert.ok(crownHeight / crownVertices > 9, 'palm crown must not remain at the world origin');
});

test('grass triangles keep one rooted clump and retain original eight-blade meadow topology', () => {
  const { range, vertices, indices } = mesh('tidewater_grass_patch');
  assert.equal(range.cellSize, 8);
  const clumps = new Map();
  const keyFor = (offset) => `${vertices[offset + 6]}:${vertices[offset + 7]}`;
  for (let i = 0; i < vertices.length; i += 16) {
    const x = vertices[i + 6];
    const z = vertices[i + 7];
    assert.ok(x >= 0 && x < 8 && z >= 0 && z < 8);
    assert.ok(Math.hypot(vertices[i] - x, vertices[i + 2] - z) < 3.5);
    assert.equal(
      vertices[i + 9],
      vertices[i + 14],
      'root-tip mask is available to material and wind',
    );
    assert.ok([0, 1, 2].includes(vertices[i + 10]), 'original blade tier');
    assert.ok([-1, 0, 1].includes(vertices[i + 13]), 'blade side coordinate');
    const key = keyFor(i);
    const clump = clumps.get(key) || { roots: 0, tips: 0 };
    if (vertices[i + 9] === 0) {
      clump.roots++;
      assert.equal(vertices[i + 1], 0, 'all blades start on the clump ground plane');
    }
    if (vertices[i + 9] === 1) clump.tips++;
    clumps.set(key, clump);
  }
  for (let i = 0; i < indices.length; i += 3) {
    const roots = [...indices.subarray(i, i + 3)].map((vertex) => keyFor(vertex * 16));
    assert.equal(
      new Set(roots).size,
      1,
      'terrain grounding must not stretch a face between plants',
    );
  }
  const complete = [...clumps.values()].filter(({ roots, tips }) => roots === 16 && tips === 8);
  const companion = [...clumps.values()].filter(({ roots, tips }) => roots === 8 && tips === 4);
  assert.equal(complete.length, 448, 'original meadow clumps retain all eight blades');
  assert.equal(companion.length, 16, 'original grasses accompanying oat slots remain distinct');
});

test('road, gate, forecourt and courtyard flora resolve only current Tidewater meshes', async () => {
  const { node } = await import('../src/scene/world/types.ts');
  const { addVegetation, addForecourtGarden, addCourtyardGarden } =
    await import('../src/scene/world_environment/vegetation.ts');
  const { courtyardGarden } = await import('../src/scene/world_environment/courtyard_garden.ts');
  const used = new Set();
  function visit(current) {
    if (current.asset) {
      assert.doesNotMatch(current.asset, /^(tree|tree_far|fern\d*|grass\d*)$/);
      if (!/^rock\d*$/.test(current.asset)) {
        assert.ok(manifest.meshes[current.asset], current.asset);
        assert.ok(current.wind > 0, current.asset);
        used.add(current.asset);
      }
    }
    current.children.forEach(visit);
  }
  for (const road of [false, true]) {
    const world = node('vegetation_test');
    addVegetation(world, road);
    addForecourtGarden(world, road);
    addCourtyardGarden(world);
    visit(world);
  }
  visit(courtyardGarden(true));
  visit(courtyardGarden(false));
  assert.deepEqual([...used].sort(), names.toSorted());
});

test('batched meadow follows sloping ground and removes complete clumps from roads and temple paving', async () => {
  const { node } = await import('../src/scene/world/types.ts');
  const { batchVegetation } = await import('../src/scene/vegetation/batches.ts');
  const { terrainHeight, templeClearance } =
    await import('../src/scene/world_environment/terrain.ts');
  const { roadSample, roadNearest } = await import('../src/scene/world_environment/road_path.ts');
  const { plantAsset } = await import('../src/scene/world_environment/procedural_vegetation.ts');
  const grass = mesh('tidewater_grass_patch');
  const assets = new Map([['tidewater_grass_patch', grass]]);
  const world = node('grounding_test');
  const road = roadSample(100).position;
  for (const [x, z] of [
    [28, -20],
    [road[0] - 4, road[2] - 4],
    [48, -80],
  ]) {
    const cell = plantAsset('grass_patch', [x, 7, z]);
    cell.vegetationGround = true;
    world.children.push(cell);
  }
  batchVegetation(world, assets);
  const batches = world.children.filter((child) => child.name.startsWith('vegetation_batch_'));
  let retained = 0;
  let grounded = 0;
  const elevations = new Set();
  for (const batch of batches) {
    const { vertices, indices, vegetation: roots } = batch.geometry;
    assert.equal(roots.length, vertices.length / 4);
    retained += indices.length;
    for (const index of new Set(indices)) {
      const [x, y, z] = roots.subarray(index * 4, index * 4 + 3);
      assert.ok(templeClearance(x, z) > 0.74, 'grass must leave temple paving clear');
      assert.ok(
        z <= 11 || z >= 175 || roadNearest(x, z).distance >= 4.49,
        'grass must leave asphalt clear',
      );
      assert.ok(
        Math.abs(y - terrainHeight(x, z)) < 0.001,
        'each clump samples its own terrain height',
      );
      if (vertices[index * 16 + 9] === 0) {
        grounded++;
        assert.ok(Math.abs(vertices[index * 16 + 1] - y) < 0.001, 'roots stay on the terrain');
        elevations.add(Math.round(y * 10));
      }
    }
    for (let i = 0; i < indices.length; i += 3) {
      const [a, b, c] = indices.subarray(i, i + 3);
      assert.deepEqual(roots.subarray(a * 4, a * 4 + 3), roots.subarray(b * 4, b * 4 + 3));
      assert.deepEqual(roots.subarray(a * 4, a * 4 + 3), roots.subarray(c * 4, c * 4 + 3));
    }
  }
  assert.ok(
    retained > 0 && retained < grass.indices.length * 3,
    'exclusion removes only overlapping clumps',
  );
  assert.ok(
    grounded > 0 && elevations.size > 10,
    'a hillside cell must not become one flat floating carpet',
  );
  const count = batches.length;
  batchVegetation(world, assets);
  assert.equal(
    world.children.filter((child) => child.name.startsWith('vegetation_batch_')).length,
    count,
  );
});
