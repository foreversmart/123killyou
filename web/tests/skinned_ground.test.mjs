import assert from 'node:assert/strict';
import { test } from 'node:test';
import { skin, vertices, vertexCount, setup, skinPosition } from './skinned_character_fixture.mjs';

test('both source shoes retain strong foot weights so ankle corrections move the rendered shoes', () => {
  const feet = ['R', 'L'].map((side) =>
    skin.skeleton.bones.findIndex((bone) => bone.name === 'foot.' + side),
  );
  const split = feet.reduce((sum, index) => sum + skin.skeleton.bones[index].position[0], 0) / 2;
  for (const [side, foot] of feet.entries()) {
    let count = 0,
      total = 0,
      dominant = 0;
    for (let vertex = 0; vertex < vertexCount; vertex++) {
      if (vertices[vertex * 16 + 1] >= 0.12) continue;
      if (vertices[vertex * 16] >= split !== Boolean(side)) continue;
      let weight = 0;
      for (let slot = 0; slot < 4; slot++) {
        const influence = vertex * 4 + slot;
        if (skin.joints[influence] === foot) weight += skin.weights[influence];
      }
      count++;
      total += weight;
      if (weight > 0.5) dominant++;
    }
    assert.ok(count > 500, 'each shoe has a substantial visible surface');
    assert.ok(total / count > 0.7, 'shoe vertices follow their ankle instead of the shin');
    assert.ok(dominant / count > 0.8, 'the foot remains the main influence across the shoe');
  }
});

for (const [name, pose, shot, flags, options, actor] of [
  ['standing', 'standing', 'arrival_weather', {}, {}, 'linlan'],
  ['seated', 'seated', 'refectory_eating', { meal_linlan_ate: true }, {}, 'linlan'],
  ['walking', 'standing', 'travel', {}, { traveling: true, walkDuration: 5 }, 'linlan'],
  ['kneeling transition', 'kneeling', 'double_calm', { double_calm: true }, {}, 'skin_double'],
]) {
  test(name + ' keeps every rendered skin vertex above the floor', () => {
    const item = setup(pose, shot, flags, options, actor);
    for (const time of [0, 0.05, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 1, 1.2, 1.5, 2, 3, 5, 6]) {
      item.frame(time);
      const palette = item.rig.root.skinTargets.mesh.skinMatrices;
      let lowest = Infinity,
        lowestVertex = -1;
      for (let vertex = 0; vertex < vertexCount; vertex++) {
        const y = skinPosition(vertex, palette)[1];
        if (y < lowest) {
          lowest = y;
          lowestVertex = vertex;
        }
      }
      assert.ok(
        lowest >= -0.005,
        `${name} t=${time}: full mesh vertex ${lowestVertex} penetrates the floor by ${(-lowest).toFixed(5)}m`,
      );
    }
  });
}
