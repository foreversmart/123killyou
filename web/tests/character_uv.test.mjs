import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import sharp from 'sharp';

const root = new URL('../public/art/world/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('library.json', root)));
const data = await readFile(new URL(manifest.binary, root));
const binary = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

// Maximum UV distance / world distance measured from each source primitive,
// divided by its 0.85 packing scale. Keep these fixtures local so regression
// checks do not need to decompress every million-triangle source scan.
const sourceDensity = {
  huipu_model: 1.3434176328733574,
  linlan_model: 0.6149391907056136,
  luchen_model: 0.5021374889057739,
  xuzhi_model: 0.5055597275013635,
  zhaoxi_model: 0.5989106194488328,
  zhouyan_model: 0.42247119308134945,
  huipu_model_hidden_palm: 463.69116951098016,
  huipu_model_robe_contact_fill: 463.69116951098016,
};
// These source primitives use only baseColorFactor, with no texture atlas.
// Their existing UVs span tiny triangles, so retain their source bounds and
// verify that they remain flat color instead of relaxing the textured body.
const flatFill = {
  huipu_model_hidden_palm: { triangles: 98, edgesAboveBodyLimit: 294 },
  huipu_model_robe_contact_fill: { triangles: 249, edgesAboveBodyLimit: 294 },
};
const surfacesSeen = new Set();

test('character triangles preserve texture islands without stretching atlas seams across the body', () => {
  for (const [id, model] of Object.entries(manifest.characterModels)) {
    const range = manifest.meshes[model.skin.mesh];
    const vertices = new Float32Array(binary, range.vertexOffset, range.vertexCount);
    const indices = new Uint32Array(binary, range.indexOffset, range.indexCount);
    const density = new Map();
    for (let triangle = 0; triangle < indices.length; triangle += 3) {
      const surfaceIndex = vertices[indices[triangle] * 16 + 11] - 16;
      const surface = manifest.surfaces[surfaceIndex].id;
      assert.ok(surface in sourceDensity, `${id}: missing source UV baseline for ${surface}`);
      surfacesSeen.add(surface);
      const stats = density.get(surface) || {
        largestRatio: 0,
        triangles: 0,
        edgesAboveBodyLimit: 0,
      };
      stats.triangles++;
      density.set(surface, stats);
      for (let edge = 0; edge < 3; edge++) {
        const a = indices[triangle + edge] * 16;
        const b = indices[triangle + ((edge + 1) % 3)] * 16;
        assert.equal(vertices[a + 11] - 16, surfaceIndex, `${id}: triangle mixes materials`);
        const distance = Math.hypot(
          vertices[a] - vertices[b],
          vertices[a + 1] - vertices[b + 1],
          vertices[a + 2] - vertices[b + 2],
        );
        const uvDistance = Math.hypot(
          vertices[a + 13] - vertices[b + 13],
          vertices[a + 14] - vertices[b + 14],
        );
        if (distance === 0) {
          assert.equal(uvDistance, 0, `${id}: collapsed edge spans distinct texture coordinates`);
          continue;
        }
        const ratio = uvDistance / distance;
        stats.largestRatio = Math.max(stats.largestRatio, ratio);
        if (ratio > 1.2) stats.edgesAboveBodyLimit++;
      }
    }
    for (const [surface, stats] of density) {
      // A 0.1% allowance covers Float32 packing of tiny source edges. Textured
      // bodies also keep the 1.2 ceiling; old seam collapses reached hundreds.
      const limit = Math.min(flatFill[surface] ? Infinity : 1.2, sourceDensity[surface] * 1.001);
      assert.ok(
        stats.largestRatio <= limit,
        `${surface}: stretched texture edge ratio ${stats.largestRatio}`,
      );
      if (flatFill[surface]) {
        assert.equal(stats.triangles, flatFill[surface].triangles, surface);
        assert.equal(stats.edgesAboveBodyLimit, flatFill[surface].edgesAboveBodyLimit, surface);
      }
    }
  }
  assert.deepEqual([...surfacesSeen].sort(), Object.keys(sourceDensity).sort());
});

test('source flat-color contact fills retain uniform albedo despite their arbitrary UVs', async () => {
  for (const id of Object.keys(flatFill)) {
    const surface = manifest.surfaces.find((entry) => entry.id === id);
    const { data, info } = await sharp(await readFile(new URL(surface.albedo, root)))
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let channel = 0; channel < info.channels; channel++) {
      let min = 255,
        max = 0;
      for (let i = channel; i < data.length; i += info.channels) {
        min = Math.min(min, data[i]);
        max = Math.max(max, data[i]);
      }
      assert.ok(max - min <= 3, `${id}: flat-color fill acquired texture detail`);
    }
  }
});
