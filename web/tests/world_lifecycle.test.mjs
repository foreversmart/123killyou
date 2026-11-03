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

const { createWorld } = await import('../src/scene/world/create_world.ts');
const { continuityKey } = await import('../src/scene/world/continuity_key.ts');
const { visualKey } = await import('../src/scene/world/visual_key.ts');
const { carryPropContinuity } = await import('../src/scene/world_view/prop_continuity.ts');
const { carryPlayerView, createPlayerControls, updatePlayerView } =
  await import('../src/scene/world_view/player_controls.ts');
const { journeyFrame } = await import('../src/scene/world_vehicle/journey.ts');

const state = (sceneKey, shotKey, extra = {}) => ({
  id: 'session',
  runId: 'run',
  sceneKey,
  shotKey,
  flags: {},
  actors: [],
  inventory: [],
  ...extra,
});

function animate(node, time) {
  node.animate?.(time, 0);
  node.children.forEach((child) => animate(child, time));
}

test('consecutive bedroom chapters retain architecture while a newly triggered door opens from now', () => {
  const firstState = state('mini_room', 'room_table');
  const nextState = state('mini_wake_three_gongs', 'wake_candle');
  const first = createWorld({ state: firstState });
  const next = createWorld({ state: nextState }, first);
  assert.equal(continuityKey(firstState, 'story'), continuityKey(nextState, 'story'));
  assert.equal(next.environment.root, first.environment.root);

  const dangerState = state('mini_double', 'double_frenzy');
  const danger = createWorld({ state: dangerState }, next);
  assert.equal(continuityKey(nextState, 'story'), continuityKey(dangerState, 'story'));
  assert.notEqual(danger.environment.root, next.environment.root);
  carryPropContinuity(next, danger, 35);
  const door = danger.environment.root.children.find((node) => node.name === 'hinged_door');
  animate(danger.root, 35);
  assert.equal(Math.abs(door.children[0].rotation[1]), 0, 'new event is not already complete');
  animate(danger.root, 35.8);
  assert.ok(Math.abs(door.children[0].rotation[1]) > 0);
  assert.ok(Math.abs(door.children[0].rotation[1]) < 1.15);
  const ongoing = createWorld({ state: { ...dangerState, flags: { save_seen: true } } }, danger);
  carryPropContinuity(danger, ongoing, 35.8);
  assert.equal(ongoing.environment.root, danger.environment.root);
  animate(ongoing.root, 36.3);
  assert.equal(Math.abs(door.children[0].rotation[1]), 1.15, 'the existing door finishes once');
});

test('restore, death, daylight and travel boundaries reset continuity while pause preserves it', () => {
  const original = state('mini_room', 'room_table');
  const key = continuityKey(original, 'story');
  assert.equal(continuityKey({ ...original, paused: true }, 'story'), key);
  assert.equal(visualKey({ ...original, paused: true }, 'story'), visualKey(original, 'story'));
  for (const next of [
    { ...original, runId: 'restored' },
    { ...original, sceneKey: 'mini_death', retryScene: 'mini_room' },
    { ...original, sceneKey: 'mini_register' },
  ]) {
    assert.notEqual(continuityKey(next, 'story'), key);
    assert.notEqual(visualKey(next, 'story'), visualKey(original, 'story'));
  }
  assert.notEqual(continuityKey(original, 'travel'), key);
  assert.notEqual(
    continuityKey(state('mini_corridor_candle', 'corridor_candles'), 'story'),
    continuityKey(state('mini_dawn', 'dawn_courtyard'), 'story'),
  );
});

test('road refresh retains the camera object captured by the coach tracking animation', () => {
  for (const departing of [false, true]) {
    const game = state(departing ? 'mini_ending' : 'mini_arrival', 'road');
    const mode = departing ? 'story' : 'road';
    const first = createWorld({ state: game, mode });
    const controls = createPlayerControls();
    updatePlayerView(controls, first, game, 0, false);
    animate(first.root, 8);
    assert.deepEqual(first.camera, journeyFrame(8, departing).camera);

    const next = createWorld({ state: { ...game, flags: { saved: true } }, mode }, first);
    const capturedCamera = next.camera;
    assert.notEqual(next.environment.root, first.environment.root, 'road owns its camera closure');
    carryPropContinuity(first, next, 8);
    carryPlayerView(controls, first, next);
    assert.equal(next.camera, capturedCamera, 'handoff must retain the closure target');
    updatePlayerView(controls, next, game, 1 / 60, false);
    animate(next.root, 8 + 1 / 60);
    assert.deepEqual(next.camera, journeyFrame(8 + 1 / 60, departing).camera);
    animate(next.root, 9);
    assert.deepEqual(next.camera, journeyFrame(9, departing).camera);
  }
});
