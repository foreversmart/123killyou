import assert from 'node:assert/strict';
import { test } from 'node:test';
import { vec3 } from 'wgpu-matrix';
import { setup, skin, bonePoint, worldMatrix } from './skinned_character_fixture.mjs';

function cameraCenter(rig) {
  const { bone, center } = skin.skeleton.camera;
  const palette = rig.root.skinTargets.mesh.skinMatrices.subarray(bone * 16, bone * 16 + 16);
  const modelCenter = vec3.transformMat4(center, palette);
  return vec3.transformMat4(modelCenter, worldMatrix(rig.root, rig.root));
}

test('the source camera follows its dedicated palette and invisible control without duplicate geometry', () => {
  assert.ok(skin.skeleton.camera, 'source camera mask has a dedicated bone and centre');
  for (const [pose, shot, flags] of [
    ['standing', 'arrival_weather', {}],
    ['standing', 'dawn_courtyard', {}],
    ['seated', 'refectory_eating', { meal_linlan_ate: true }],
  ]) {
    const { rig, frame } = setup(pose, shot, flags);
    rig.root.position = [1.2, 0.1, -0.8];
    rig.root.rotation[1] = 0.63;
    assert.equal(rig.camera.name, 'camera_control');
    assert.equal(rig.camera.geometry, undefined);
    assert.equal(rig.camera.asset, undefined);
    assert.ok(!rig.body.children.some((node) => node.name === 'held_camera'));
    for (const time of [0, 1.5, 3, 6, 6.4001]) {
      frame(time);
      const control = worldMatrix(rig.root, rig.camera).subarray(12, 15);
      assert.ok(
        vec3.distance(cameraCenter(rig), control) < 0.00002,
        shot + ': source camera centre agrees with the complete control transform',
      );
    }
  }
});

test('during eating the source camera hangs from the torso while the feeding hand moves separately', () => {
  assert.ok(skin.skeleton.camera);
  const { rig, frame } = setup('seated', 'refectory_eating', { meal_linlan_ate: true });
  const cameras = [],
    hands = [];
  for (const time of [1.5, 3, 6]) {
    frame(time);
    cameras.push(cameraCenter(rig));
    hands.push(bonePoint(rig, 'hand.R', true));
  }
  assert.ok(
    hands.some((point) => vec3.distance(point, hands[0]) > 0.08),
    'the feeding hand completes a visible reach',
  );
  assert.ok(
    cameras.every((point) => vec3.distance(point, cameras[0]) < 0.015),
    'the camera keeps its chest position throughout the meal instead of following the spoon',
  );
});
