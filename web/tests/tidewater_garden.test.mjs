import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

test('courtyard grass clips complete original clumps to the bed without stretching blades', async () => {
  const { node } = await import('../src/scene/world/types.ts');
  const { gardenGrass } = await import('../src/scene/world_environment/courtyard_planting.ts');
  const { batchVegetation } = await import('../src/scene/vegetation/batches.ts');
  const root = new URL('../public/art/vegetation/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('vegetation.json', root)));
  const bytes = await readFile(new URL(manifest.binary, root));
  const binary = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const range = manifest.meshes.tidewater_grass_patch;
  const source = {
    vertices: new Float32Array(binary, range.vertexOffset, range.vertexCount),
    indices: new Uint32Array(binary, range.indexOffset, range.indexCount),
  };
  const key = (x, z) => `${x.toFixed(4)}:${z.toFixed(4)}`;
  const original = new Map();
  for (let i = 0; i < source.vertices.length; i += 16) {
    const v = source.vertices;
    const id = key(v[i + 6], v[i + 7]);
    const clump = original.get(id) || { x: v[i + 6], z: v[i + 7], radius: 0, height: 0, count: 0 };
    clump.radius = Math.max(clump.radius, Math.hypot(v[i] - clump.x, v[i + 2] - clump.z));
    clump.height = Math.max(clump.height, v[i + 1]);
    original.set(id, clump);
  }
  for (const index of source.indices) {
    const i = index * 16;
    original.get(key(source.vertices[i + 6], source.vertices[i + 7])).count++;
  }
  const world = node('courtyard_grass_test');
  const x = -5,
    z = 2,
    width = 2.3,
    depth = 3.2,
    ground = 0.065;
  gardenGrass(world, x, z, width, depth, ground);
  const expected = new Map();
  for (const patch of world.children) {
    assert.equal(new Set(patch.scale).size, 1, 'garden plants retain a uniform scale');
    const scale = patch.scale[0];
    for (const clump of original.values()) {
      const px = patch.position[0] + clump.x * scale;
      const pz = patch.position[2] + clump.z * scale;
      if (px < x - width / 2 || px > x + width / 2 || pz < z - depth / 2 || pz > z + depth / 2)
        continue;
      const id = key(
        Math.fround(Math.fround(patch.position[0]) + clump.x * Math.fround(scale)),
        Math.fround(Math.fround(patch.position[2]) + clump.z * Math.fround(scale)),
      );
      assert.ok(!expected.has(id), 'adjacent cells do not duplicate a grass clump');
      expected.set(id, { ...clump, radius: clump.radius * scale, height: clump.height * scale });
    }
  }
  batchVegetation(world, new Map([['tidewater_grass_patch', source]]));
  const actual = new Map();
  for (const batch of world.children.filter((child) => child.geometry)) {
    const { vertices, indices, vegetation } = batch.geometry;
    assert.equal(new Set(indices).size, vertices.length / 16, 'clipped vertices are not uploaded');
    for (let i = 0; i < vertices.length / 16; i++) {
      const [rx, ry, rz] = vegetation.subarray(i * 4, i * 4 + 3);
      assert.ok(Math.abs(ry - ground) < 1e-6, 'grass roots remain on the flowerbed');
      assert.ok(rx >= x - width / 2 - 1e-5 && rx <= x + width / 2 + 1e-5);
      assert.ok(rz >= z - depth / 2 - 1e-5 && rz <= z + depth / 2 + 1e-5);
      const id = key(rx, rz);
      const clump = actual.get(id) || { radius: 0, height: 0, count: 0 };
      clump.radius = Math.max(
        clump.radius,
        Math.hypot(vertices[i * 16] - rx, vertices[i * 16 + 2] - rz),
      );
      clump.height = Math.max(clump.height, vertices[i * 16 + 1] - ry);
      actual.set(id, clump);
    }
    for (let i = 0; i < indices.length; i += 3) {
      const ids = [...indices.subarray(i, i + 3)].map((index) =>
        key(vegetation[index * 4], vegetation[index * 4 + 2]),
      );
      assert.equal(new Set(ids).size, 1, 'clipping retains whole blades in one clump');
      actual.get(ids[0]).count += 3;
    }
  }
  assert.ok(actual.size > 400 && actual.size < original.size * world.children.length);
  assert.deepEqual([...actual.keys()].sort(), [...expected.keys()].sort());
  for (const [id, clump] of actual) {
    const target = expected.get(id);
    assert.equal(clump.count, target.count, 'each retained clump preserves all original triangles');
    assert.ok(Math.abs(clump.radius - target.radius) < 1e-5, 'blades retain their original width');
    assert.ok(Math.abs(clump.height - target.height) < 1e-5, 'blades retain their original height');
  }
});
