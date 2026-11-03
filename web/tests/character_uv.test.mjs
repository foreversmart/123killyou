import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../public/art/world/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('library.json', root)));
const data = await readFile(new URL(manifest.binary, root));
const binary = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

test('character triangles preserve texture islands without stretching atlas seams across the body', () => {
  for (const [id, model] of Object.entries(manifest.characterModels)) {
    const range = manifest.meshes[model.skin.mesh];
    const vertices = new Float32Array(binary, range.vertexOffset, range.vertexCount);
    const indices = new Uint32Array(binary, range.indexOffset, range.indexCount);
    let largestRatio = 0;
    for (let triangle = 0; triangle < indices.length; triangle += 3) {
      for (let edge = 0; edge < 3; edge++) {
        const a = indices[triangle + edge] * 16;
        const b = indices[triangle + ((edge + 1) % 3)] * 16;
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
        largestRatio = Math.max(largestRatio, uvDistance / distance);
      }
    }
    // Source scans stay below 1.07 UV units per world meter after packing.
    // Cross-island simplification previously raised this ratio into the thousands.
    assert.ok(largestRatio < 1.2, `${id}: stretched texture edge ratio ${largestRatio}`);
  }
});
