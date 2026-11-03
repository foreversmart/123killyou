import assert from 'node:assert/strict';
import { test } from 'node:test';
import { skin, vertices, vertexCount, setup, skinPosition } from './skinned_character_fixture.mjs';

const shoes = ['R', 'L'].map((side) => {
  const foot = skin.skeleton.bones.findIndex((bone) => bone.name === 'foot.' + side);
  return Array.from({ length: vertexCount }, (_, vertex) => vertex).filter(
    (vertex) =>
      vertices[vertex * 16 + 1] < 0.2 &&
      Array.from({ length: 4 }, (_, slot) => vertex * 4 + slot).some(
        (index) => skin.joints[index] === foot && skin.weights[index] > 0.8,
      ),
  );
});
function shoeBounds(palette) {
  return shoes.map((shoe) => {
    assert.ok(shoe.length > 100, 'each rendered shoe has a substantial sampled surface');
    const points = shoe.map((vertex) => skinPosition(vertex, palette));
    return {
      minY: Math.min(...points.map((point) => point[1])),
      meanY: points.reduce((sum, point) => sum + point[1], 0) / points.length,
      meanZ: points.reduce((sum, point) => sum + point[2], 0) / points.length,
    };
  });
}

test('rendered swing shoes lift forward with a restrained step while the support foot stays grounded', () => {
  const item = setup('standing', 'travel', {}, { traveling: true, walkDuration: 5 });
  item.frame(0);
  const rest = shoeBounds(item.rig.root.skinTargets.mesh.skinMatrices);
  // The fixture moves at 0.7 m/s; these distances sample alternate swing peaks.
  for (const [distance, swing] of [
    [0.25, 0],
    [0.75, 1],
    [1.25, 0],
    [1.75, 1],
  ]) {
    item.frame(distance / 0.7);
    const palette = item.rig.root.skinTargets.mesh.skinMatrices;
    const feet = shoeBounds(palette);
    const support = 1 - swing;
    assert.ok(feet[swing].meanZ > rest[swing].meanZ + 0.03, 'the lifted shoe moves forward');
    assert.ok(feet[swing].minY > feet[support].minY + 0.005, 'one shoe clearly leaves the floor');
    assert.ok(feet[swing].meanY - rest[swing].meanY < 0.15, 'walking does not become high-kicking');
    assert.ok(
      feet[support].minY <= 0.01,
      'the support shoe stays within a centimetre of the floor',
    );
    let lowest = Infinity;
    for (let vertex = 0; vertex < vertexCount; vertex++)
      lowest = Math.min(lowest, skinPosition(vertex, palette)[1]);
    assert.ok(lowest >= -0.005, `the full rendered mesh stays above the floor: ${lowest}`);
  }
  item.frame(5);
  const stoppedPhase = item.rig.root.gait.phase;
  let previousWeight = item.rig.root.gait.weight;
  for (const time of [5.04, 5.08, 5.12, 5.2]) {
    item.frame(time);
    assert.equal(
      item.rig.root.gait.phase,
      stoppedPhase,
      'a planted actor cannot start another step',
    );
    assert.equal(item.rig.root.gait.moving, false);
    assert.ok(item.rig.root.gait.weight <= previousWeight, 'only the foot already raised settles');
    previousWeight = item.rig.root.gait.weight;
  }
  assert.equal(previousWeight, 0, 'the short landing finishes in a standing pose');
  shoeBounds(item.rig.root.skinTargets.mesh.skinMatrices).forEach((foot, side) => {
    for (const key of ['minY', 'meanY', 'meanZ'])
      assert.ok(
        Math.abs(foot[key] - rest[side][key]) < 0.00001,
        'both shoes return to the standing pose after the route ends',
      );
  });
});
