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
const { createWorld } = await import('../src/scene/world/create_world.ts');
const { carryCharacterContinuity } = await import('../src/scene/world_view/continuity.ts');
const { applyCharacterContinuity } = await import('../src/scene/world_character/continuity.ts');
const { ROOM_SLEEP_WALK_SECONDS } = await import('../src/shared/lib/story_timing.ts');
const { ease } = await import('../src/scene/world_character/joints.ts');
const actor = (id) => ({ id, portrait: id, name: id, visible: true, status: '' });
const game = (sceneKey, shotKey, flags = {}, id = 'linlan') => ({
  sceneKey,
  shotKey,
  flags,
  actors: [actor(id)],
});
function prepare(state) {
  const world = createWorld({ state });
  const root = world.root.children.find((node) => node.characterKey);
  root.updateSkin = createSkinPose(root.skinTargets, skin.skeleton, { vertices, indices, skin });
  root.updateSkin();
  return { world, root };
}
function frame(root, time, delta = 0) {
  root.animate(time, delta);
  applyCharacterContinuity(root, time);
  root.updateSkin();
}
function snapshot(root) {
  const values = [];
  const visit = (node) => {
    values.push(...node.position, ...node.rotation, ...node.scale);
    if (node.bend) values.push(node.bend.angle);
    if (node.matrix) values.push(...node.matrix);
    if (node.skinMatrices) values.push(...node.skinMatrices);
    node.children.forEach(visit);
  };
  visit(root);
  values.push(root.pelvisSupportHeight || 0);
  return values;
}
function close(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) =>
    assert.ok(Math.abs(value - expected[index]) < 1e-6, `${index}: ${value} != ${expected[index]}`),
  );
}

test('world cast rebuild preserves diner hand props and skin on paused and interrupted frames', () => {
  const state = game('mini_refectory', 'refectory_eating', { meal_linlan_ate: true });
  let current = prepare(state);
  frame(current.root, 13.2);
  for (const time of [13.2, 13.31, 13.43, 14]) {
    frame(current.root, time);
    const previous = current;
    current = prepare(state);
    carryCharacterContinuity(previous.world, current.world, time);
    frame(current.root, time);
    close(snapshot(current.root), snapshot(previous.root));
    const paused = snapshot(current.root);
    for (let repeat = 0; repeat < 4; repeat++) frame(current.root, time);
    close(snapshot(current.root), paused);
  }
});

test('world cast rebuild preserves the bed turn, mattress support and skin while paused', () => {
  const state = game('mini_wake_three_gongs', 'room_sleep_wait', {}, 'player');
  const baseline = prepare(state);
  for (let tick = 0; tick <= Math.ceil((ROOM_SLEEP_WALK_SECONDS + 0.12) * 60); tick++)
    frame(baseline.root, tick / 60);
  const time = ROOM_SLEEP_WALK_SECONDS + 0.12;
  frame(baseline.root, time);
  const rebuilt = prepare(state);
  carryCharacterContinuity(baseline.world, rebuilt.world, time);
  frame(rebuilt.root, time);
  close(snapshot(rebuilt.root), snapshot(baseline.root));
  const paused = snapshot(rebuilt.root);
  frame(rebuilt.root, time);
  close(snapshot(rebuilt.root), paused);
  frame(rebuilt.root, time + 0.05);
  frame(baseline.root, time + 0.05);
  assert.equal(rebuilt.root.animationState.sleepFacing, baseline.root.animationState.sleepFacing);
  const turn = baseline.root.rotation[1] - paused[4];
  const expectedFacing = paused[4] + Math.atan2(Math.sin(turn), Math.cos(turn)) * ease(0.05, 0.42);
  close([rebuilt.root.rotation[1]], [expectedFacing]);
  frame(rebuilt.root, time + 0.21);
  const halfway = snapshot(rebuilt.root);
  frame(rebuilt.root, time + 0.21);
  close(snapshot(rebuilt.root), halfway);
  frame(rebuilt.root, time + 0.6);
  frame(baseline.root, time + 0.6);
  close(snapshot(rebuilt.root), snapshot(baseline.root));
});

test('an ongoing speaking gesture keeps its speech clock through world replacement', () => {
  const state = game('mini_arrival', 'arrival_gate', {}, 'xuzhi');
  const previous = prepare(state);
  previous.world.speaker = 'xuzhi';
  for (let tick = 0; tick <= 90; tick++) frame(previous.root, tick / 60, 1 / 60);
  const current = prepare({ ...state, shotKey: 'arrival_weather' });
  current.world.speaker = 'xuzhi';
  carryCharacterContinuity(previous.world, current.world, 1.5);
  frame(current.root, 1.5);
  close(snapshot(current.root), snapshot(previous.root));
  assert.deepEqual(current.root.animationState.speech, previous.root.animationState.speech);
  assert.notEqual(current.root.animationState.speech, previous.root.animationState.speech);
  for (let tick = 91; tick <= 126; tick++) {
    frame(previous.root, tick / 60, 1 / 60);
    frame(current.root, tick / 60, 1 / 60);
  }
  close(snapshot(current.root), snapshot(previous.root));
});
