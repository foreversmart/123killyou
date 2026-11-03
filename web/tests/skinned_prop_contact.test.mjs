import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mat4, vec3 } from 'wgpu-matrix';
import {
  setup,
  skin,
  vertices,
  vertexCount,
  bonePoint,
  worldMatrix,
} from './skinned_character_fixture.mjs';

function descendant(root, name) {
  if (root.name === name) return root;
  for (const child of root.children) {
    const found = descendant(child, name);
    if (found) return found;
  }
}

function sourcePoint(rig, name, offset) {
  const index = skin.skeleton.bones.findIndex((bone) => bone.name === name);
  const source = vec3.add(skin.skeleton.bones[index].position, offset);
  const palette = rig.root.skinTargets.mesh.skinMatrices.subarray(index * 16, index * 16 + 16);
  return vec3.transformMat4(vec3.transformMat4(source, palette), worldMatrix(rig.root, rig.root));
}

test('the real spoon bowl reaches the held soup and the source lower lip throughout each meal cycle', () => {
  const { rig, animation, frame } = setup('seated', 'refectory_eating', { meal_linlan_ate: true });
  rig.root.position = [1.2, 0.1, -0.8];
  rig.root.rotation[1] = 0.63;
  const spoon = descendant(rig.root, 'meal_utensils');
  assert.ok(spoon && animation.heldBowl);
  for (const time of [0, 4, 5]) {
    frame(time);
    const tip = vec3.transformMat4([0, 0.13, 0.16], worldMatrix(rig.root, spoon));
    const soup = vec3.transformMat4([0, 0.125, 0], worldMatrix(rig.root, animation.heldBowl));
    assert.ok(vec3.distance(tip, soup) < 0.015, 'the spoon dips into the actual held soup');
  }
  for (const time of [1.5, 2, 7]) {
    frame(time);
    const tip = vec3.transformMat4([0, 0.13, 0.16], worldMatrix(rig.root, spoon));
    const lip = sourcePoint(rig, 'head', [-0.004, 0.031, 0.121]);
    assert.ok(vec3.distance(tip, lip) < 0.035, 'the spoon reaches the mouth on the imported face');
    assert.ok(
      tip[1] < lip[1],
      'the spoon stays below the lower lip instead of rising over the face',
    );
  }
});

test('both source hands close onto the actual camera body while taking and reviewing photos', () => {
  const { bone, center } = skin.skeleton.camera;
  const bounds = [Array(3).fill(Infinity), Array(3).fill(-Infinity)];
  for (let vertex = 0; vertex < vertexCount; vertex++) {
    if (skin.joints[vertex * 4] !== bone) continue;
    for (let axis = 0; axis < 3; axis++) {
      const value = vertices[vertex * 16 + axis] - center[axis];
      bounds[0][axis] = Math.min(bounds[0][axis], value);
      bounds[1][axis] = Math.max(bounds[1][axis], value);
    }
  }
  for (const shot of ['arrival_weather', 'dawn_courtyard']) {
    const { rig, frame } = setup('standing', shot);
    rig.root.position = [-0.8, 0.1, 1.2];
    rig.root.rotation[1] = -0.63;
    for (const time of [0, 1.2, 2, 4, 6.4]) {
      frame(time);
      const inverse = mat4.inverse(worldMatrix(rig.root, rig.camera));
      for (const [suffix, side] of [
        ['R', 0],
        ['L', 1],
      ]) {
        const wrist = vec3.transformMat4(bonePoint(rig, 'hand.' + suffix, true), inverse);
        const fingertip = vec3.transformMat4(
          bonePoint(rig, 'finger_1.' + suffix + '_tip', true),
          inverse,
        );
        assert.ok(
          side ? wrist[0] > bounds[1][0] : wrist[0] < bounds[0][0],
          'each wrist stays outside its side of the camera',
        );
        assert.ok(Math.abs(wrist[0]) < 0.13, 'the palms remain close enough to grip the body');
        for (let axis = 0; axis < 3; axis++)
          assert.ok(
            fingertip[axis] >= bounds[0][axis] - 0.01 && fingertip[axis] <= bounds[1][axis] + 0.01,
            'each index fingertip closes onto the camera instead of hovering above it',
          );
        assert.ok(
          wrist[1] >= bounds[0][1] && wrist[1] <= bounds[1][1],
          'wrists share the camera height',
        );
      }
    }
  }
});
