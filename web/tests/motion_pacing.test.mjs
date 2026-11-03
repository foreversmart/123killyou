import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/'))
      return nextResolve(
        new URL('../src/' + specifier.slice(2) + '.ts', import.meta.url).href,
        context,
      );
    if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier))
      return nextResolve(specifier + '.ts', context);
    return nextResolve(specifier, context);
  },
});

const { applyBlenderPose } = await import('../src/scene/world_character/blender_action_library.ts');
const { node } = await import('../src/scene/world/types.ts');

function rotationTrack() {
  return {
    path: 'rotation',
    times: new Float32Array([0, 10]),
    values: new Float32Array([0, 0, 0, 1, 0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)]),
    components: 4,
  };
}

function targets(name) {
  const root = node(name);
  return {
    pose: 'standing',
    root,
    body: node('body'),
    head: node('head'),
    arms: [node('arm.R'), node('arm.L')],
    elbows: [node('elbow.R'), node('elbow.L')],
    hands: [node('hand.R'), node('hand.L')],
    legs: [node('leg.R'), node('leg.L')],
    knees: [node('knee.R'), node('knee.L')],
  };
}

function library() {
  const track = rotationTrack();
  const tracks = new Map([
    ['head', { rotation: track }],
    ['upper_arm_r', { rotation: track }],
    ['upper_arm_l', { rotation: track }],
  ]);
  return new Map([['walk', { duration: 10, tracks }]]);
}

test('head clips run at one tenth speed for every character', () => {
  const rig = targets('linlan');
  applyBlenderPose('walk', 5, library(), rig);
  assert.ok(rig.head.rotation[1] > 0.05 && rig.head.rotation[1] < 0.11);
});

test('Lu Chen hand clips run at one tenth speed while body actions keep their clock', () => {
  const luchen = targets('luchen');
  const visitor = targets('linlan');
  applyBlenderPose('walk', 5, library(), luchen);
  applyBlenderPose('walk', 5, library(), visitor);
  assert.ok(luchen.arms[0].rotation[1] > 0.05 && luchen.arms[0].rotation[1] < 0.11);
  assert.ok(visitor.arms[0].rotation[1] > 0.7);
});
