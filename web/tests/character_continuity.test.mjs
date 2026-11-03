import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { skin, vertices, indices, createSkinPose } from './skinned_character_fixture.mjs';

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier) ? specifier + '.ts' : specifier,
      context,
    );
  },
});

const { characterModel } = await import('../src/scene/world_character/model.ts');
const { animateCharacter } = await import('../src/scene/world_character/animation.ts');
const { continueCharacter, applyCharacterContinuity } =
  await import('../src/scene/world_character/continuity.ts');
const { carryCharacterContinuity } = await import('../src/scene/world_view/continuity.ts');
const { createWorld } = await import('../src/scene/world/create_world.ts');
const { applyBlenderPose } = await import('../src/scene/world_character/blender_action_library.ts');

const actor = (id = 'linlan') => ({ id, portrait: id, name: id, visible: true, status: '' });
const game = (shotKey, flags = {}) => ({
  sceneKey: 'mini_refectory',
  shotKey,
  flags,
  actors: [actor(), actor('xuzhi')],
});
function setup(shotKey, flags = {}) {
  const rig = characterModel('linlan', 'seated');
  animateCharacter(rig, actor(), game(shotKey, flags));
  const update = createSkinPose(rig.root.skinTargets, skin.skeleton, { vertices, indices, skin });
  update();
  return {
    rig,
    frame(time) {
      rig.root.animate(time, 0);
      applyCharacterContinuity(rig.root, time);
      update();
    },
  };
}
const joints = (rig) =>
  [
    rig.root,
    rig.body,
    rig.head,
    ...rig.arms,
    ...rig.elbows,
    ...rig.hands,
    ...rig.legs,
    ...rig.knees,
    rig.camera,
  ].filter(Boolean);
const pose = (rig) =>
  joints(rig).flatMap((joint) => [...joint.position, ...joint.rotation, ...joint.scale]);
const close = (actual, expected, tolerance = 1e-6) => {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) =>
    assert.ok(
      Math.abs(value - expected[index]) < tolerance,
      `${index}: ${value} != ${expected[index]}`,
    ),
  );
};

test('same activity retains its phase through consecutive refectory lines', () => {
  const previous = setup('refectory_table');
  previous.frame(13.2);
  const next = setup('refectory_porridge');
  continueCharacter(previous.rig.root, next.rig.root, 13.2);
  next.frame(13.2);
  close(pose(next.rig), pose(previous.rig));
  close(
    next.rig.root.skinTargets.mesh.skinMatrices,
    previous.rig.root.skinTargets.mesh.skinMatrices,
  );
  next.frame(13.8);
  previous.frame(13.8);
  close(pose(next.rig), pose(previous.rig));
  assert.equal(next.rig.root.animationTimeOffset, 0);
});

test('new activity begins now and blends all joints from the visible outgoing skin pose', () => {
  const previous = setup('refectory_table');
  previous.frame(27);
  const next = setup('refectory_eating');
  continueCharacter(previous.rig.root, next.rig.root, 27);
  next.frame(27);
  close(pose(next.rig), pose(previous.rig));
  close(
    next.rig.root.skinTargets.mesh.skinMatrices,
    previous.rig.root.skinTargets.mesh.skinMatrices,
  );
  assert.equal(next.rig.root.animationTimeOffset, -27);
  next.frame(27.21);
  const paused = pose(next.rig);
  next.frame(27.21);
  close(pose(next.rig), paused);
  const interrupted = setup('refectory_glance');
  continueCharacter(next.rig.root, interrupted.rig.root, 27.21);
  interrupted.frame(27.21);
  close(pose(interrupted.rig), paused);
  next.frame(27.6);
  const reference = setup('refectory_eating');
  reference.frame(0.6);
  close(pose(next.rig), pose(reference.rig));
});

test('a prop change restarts only its actor while other diners keep their established clocks', () => {
  const previous = createWorld({ state: game('refectory_eating') });
  const next = createWorld({ state: game('refectory_eating', { meal_linlan_ate: true }) });
  const before = previous.root.children.find((node) => node.name === 'xuzhi');
  before.animationTimeOffset = -5;
  carryCharacterContinuity(previous, next, 20);
  assert.equal(next.root.children.find((node) => node.name === 'linlan').animationTimeOffset, -20);
  assert.equal(next.root.children.find((node) => node.name === 'xuzhi').animationTimeOffset, -5);
});

test('newly visible characters begin their non-looping GLB action at zero on an old world clock', () => {
  const rig = characterModel('shangong');
  animateCharacter(rig, actor('shangong'), {
    sceneKey: 'mini_oracle',
    shotKey: 'oracle_rescue',
    flags: { cup_jiao_rescue: true },
  });
  continueCharacter(undefined, rig.root, 40);
  const library = new Map([
    [
      'offer_candle',
      {
        duration: 1,
        tracks: new Map([
          [
            'head',
            {
              rotation: {
                path: 'rotation',
                components: 4,
                times: new Float32Array([0, 1]),
                values: new Float32Array([0, 0, 0, 1, Math.sin(0.5), 0, 0, Math.cos(0.5)]),
              },
            },
          ],
        ]),
      },
    ],
  ]);
  rig.root.blenderEnabled = true;
  rig.root.animate(40, 0);
  const initial = [...rig.head.rotation];
  applyBlenderPose('rescue', 40, library, rig.root.blenderTargets);
  close(rig.head.rotation, initial);
  rig.root.animate(40.5, 0);
  applyBlenderPose('rescue', 40.5, library, rig.root.blenderTargets);
  assert.ok(rig.head.rotation[0] > 0 && rig.head.rotation[0] < 1);
});

test('root placement turns through the shortest arc and reaches the authored target', () => {
  const previous = setup('refectory_table');
  previous.frame(5);
  previous.rig.root.position = [1, 0, 2];
  previous.rig.root.rotation[1] = Math.PI - 0.1;
  const next = setup('refectory_eating');
  next.rig.root.position = [2, 0, 2];
  next.rig.root.rotation[1] = -Math.PI + 0.1;
  continueCharacter(previous.rig.root, next.rig.root, 5);
  next.frame(5);
  close(next.rig.root.position, [1, 0, 2]);
  assert.equal(next.rig.root.rotation[1], Math.PI - 0.1);
  next.frame(5.21);
  close(next.rig.root.position, [1.5, 0, 2]);
  assert.ok(Math.abs(next.rig.root.rotation[1] - Math.PI) < 1e-6);
  next.frame(5.5);
  close(next.rig.root.position, [2, 0, 2]);
});

test('GLB handoff blends the final clip pose and preserves the current phase on another rebuild', () => {
  const library = new Map([
    [
      'offer_candle',
      {
        duration: 1,
        tracks: new Map([
          [
            'head',
            {
              rotation: {
                path: 'rotation',
                components: 4,
                times: new Float32Array([0, 1]),
                values: new Float32Array([0, 0, 0, 1, Math.sin(0.5), 0, 0, Math.cos(0.5)]),
              },
            },
          ],
        ]),
      },
    ],
  ]);
  const make = (rescue) => {
    const rig = characterModel('shangong');
    animateCharacter(rig, actor('shangong'), {
      sceneKey: 'mini_oracle',
      shotKey: rescue ? 'oracle_rescue' : 'oracle_rules',
      flags: { cup_jiao_rescue: rescue },
    });
    rig.root.blenderEnabled = true;
    return rig;
  };
  const frame = (rig, time) => {
    rig.root.animate(time, 0);
    if (rig.root.blenderAction)
      applyBlenderPose(rig.root.blenderAction, time, library, rig.root.blenderTargets);
    applyCharacterContinuity(rig.root, time);
  };
  const previous = make(false);
  frame(previous, 17);
  const next = make(true);
  continueCharacter(previous.root, next.root, 17);
  frame(next, 17);
  close(pose(next), pose(previous));
  frame(next, 17.21);
  const paused = pose(next);
  frame(next, 17.21);
  close(pose(next), paused);
  frame(next, 17.6);
  const continuing = make(true);
  continueCharacter(next.root, continuing.root, 17.6);
  frame(continuing, 18.1);
  frame(next, 18.1);
  close(pose(continuing), pose(next));
  assert.equal(continuing.root.animationTimeOffset, -17);
});
