import assert from 'node:assert/strict';
import { test } from 'node:test';
import { vec3 } from 'wgpu-matrix';
import {
  vertices,
  indices,
  vertexCount,
  setup,
  skinPosition,
} from './skinned_character_fixture.mjs';

const edges = [];
const seen = new Set();
for (let triangle = 0; triangle < indices.length; triangle += 3) {
  for (const [a, b] of [
    [indices[triangle], indices[triangle + 1]],
    [indices[triangle + 1], indices[triangle + 2]],
    [indices[triangle + 2], indices[triangle]],
  ]) {
    const key = Math.min(a, b) * vertexCount + Math.max(a, b);
    if (seen.has(key)) continue;
    seen.add(key);
    const start = vertices.subarray(a * 16, a * 16 + 3);
    const end = vertices.subarray(b * 16, b * 16 + 3);
    edges.push({ a, b, rest: vec3.distance(start, end) });
  }
}

for (const [name, pose, shot, flags, options, actor, times] of [
  ['camera', 'standing', 'arrival_weather', {}, {}, 'linlan', [0, 1.5, 3, 6]],
  ['eat', 'seated', 'refectory_eating', { meal_linlan_ate: true }, {}, 'linlan', [1.5, 3, 6]],
  ['walk', 'standing', 'travel', {}, { traveling: true, walkDuration: 5 }, 'linlan', [0.5, 1.5, 3]],
  ['calm', 'kneeling', 'double_calm', { double_calm: true }, {}, 'skin_double', [0.5, 1.5, 3]],
  ['scratch', 'standing', 'double_scripture_1', {}, {}, 'skin_double', [0.5, 1.5, 3]],
  ['frenzy', 'standing', 'double_frenzy', {}, {}, 'skin_double', [0.5, 1.5, 3]],
]) {
  test(name + ' keeps neighbouring skin vertices from stretching into long sheets', () => {
    const item = setup(pose, shot, flags, options, actor);
    for (const time of times) {
      item.frame(time);
      const palette = item.rig.root.skinTargets.mesh.skinMatrices;
      const posed = Array.from({ length: vertexCount }, (_, vertex) =>
        skinPosition(vertex, palette),
      );
      let worst;
      for (const edge of edges) {
        const length = vec3.distance(posed[edge.a], posed[edge.b]);
        const stretch = length - edge.rest;
        if (!worst || stretch > worst.stretch) worst = { ...edge, length, stretch };
      }
      const source = [worst.a, worst.b].map((vertex) =>
        Array.from(vertices.subarray(vertex * 16, vertex * 16 + 3), (value) => +value.toFixed(4)),
      );
      // Local clothing and skin must stay continuous when adjacent arm/torso
      // regions move. A 10 cm extra edge allowance already exceeds joint folds;
      // metre-long sheets indicate unrelated bones received neighbouring vertices.
      assert.ok(
        worst.stretch <= 0.1,
        `${name} t=${time}: edge ${worst.a}-${worst.b} stretched ${worst.rest.toFixed(4)}m → ` +
          `${worst.length.toFixed(4)}m (+${worst.stretch.toFixed(4)}m), source=${JSON.stringify(source)}`,
      );
    }
  });
}
