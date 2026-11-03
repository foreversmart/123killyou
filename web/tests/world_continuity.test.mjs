import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

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
const { cups } = await import('../src/scene/world_prop/ritual.ts');
const state = (sceneKey, shotKey, extra = {}) => ({
  id: 'session',
  runId: 'run',
  sceneKey,
  shotKey,
  flags: {},
  actors: [],
  dialogue: { speaker: '', text: '' },
  inventory: [],
  ...extra,
});
function nodes(root) {
  return [root, ...root.children.flatMap(nodes)];
}
const find = (world, name) => nodes(world.root).find((node) => node.name === name);
const pose = (node) => [node.position.slice(), node.rotation.slice(), node.scale.slice()];
function advance(world, time) {
  for (const node of nodes(world.root)) node.animate?.(time, 0);
}

test('registration dialogue and investigation retain architecture while updating story props', () => {
  const before = state('mini_register', 'register_desk');
  const first = createWorld({ state: before });
  const next = createWorld({ state: { ...before, shotKey: 'register_drag_mark' } }, first);
  assert.equal(next.environment.root, first.environment.root);
  assert.equal(next.root.children[0], first.root.children[0]);
  assert.notEqual(next.hotspots, first.hotspots);
  assert.equal(find(first, 'drag_marks'), undefined);
  assert.ok(find(next, 'drag_marks'));
  assert.ok(next.hotspots.some((spot) => spot.id === 'register'));
});

test('same physical bedroom continues across story chapters but restored runs and real moves reset', () => {
  const first = state('mini_room', 'room_table');
  const knocking = state('mini_three_knocks', 'three_knocks');
  assert.equal(continuityKey(first, 'story'), continuityKey(knocking, 'story'));
  const previous = createWorld({ state: first });
  const next = createWorld({ state: knocking }, previous);
  assert.equal(next.environment.root, previous.environment.root);
  const restored = { ...knocking, runId: 'restored-run' };
  assert.notEqual(continuityKey(knocking, 'story'), continuityKey(restored, 'story'));
  assert.notEqual(visualKey(knocking, 'story'), visualKey(restored, 'story'));
  assert.notEqual(
    continuityKey(knocking, 'story'),
    continuityKey(state('mini_four_knocks', 'four_peephole'), 'story'),
  );
  assert.notEqual(
    continuityKey(knocking, 'story'),
    continuityKey(state('mini_death', 'death_mini_three_knocks'), 'story'),
  );
  assert.notEqual(continuityKey(knocking, 'story'), continuityKey(knocking, 'travel'));
});

test('opening a door starts at the current world time and a later dialogue update cannot restart it', () => {
  const first = createWorld({ state: state('mini_double', 'double_candle') });
  advance(first, 29);
  const opening = state('mini_double', 'double_frenzy');
  const second = createWorld({ state: opening }, first);
  assert.notEqual(second.environment.root, first.environment.root);
  carryPropContinuity(first, second, 29);
  advance(second, 29);
  const door = find(second, 'hinged_door');
  assert.ok(door);
  assert.ok(door.children.slice(0, 2).every((leaf) => leaf.rotation[1] === 0));
  advance(second, 29.8);
  const angle = door.children[1].rotation[1];
  assert.ok(angle > 0 && angle < 1.15);
  const third = createWorld(
    { state: { ...opening, flags: { double_identity_known: true } } },
    second,
  );
  assert.equal(third.environment.root, second.environment.root);
  carryPropContinuity(second, third, 29.8);
  advance(third, 29.8);
  assert.equal(find(third, 'hinged_door').children[1].rotation[1], angle);
  advance(third, 30.3);
  assert.equal(find(third, 'hinged_door').children[1].rotation[1], 1.15);
});

test('a cup throw starts at zero, survives intermediate updates, and ends on the authoritative faces', () => {
  const waiting = state('mini_oracle', 'oracle_rules');
  const first = createWorld({ state: waiting });
  const throwing = { ...waiting, shotKey: 'oracle_cast', flags: { cup_roll_sacred: true } };
  const second = createWorld({ state: throwing }, first);
  carryPropContinuity(first, second, 47);
  advance(second, 47);
  const reference = cups(throwing.flags, true);
  reference.children.forEach((cup) => cup.animate(0, 0));
  for (const cup of reference.children) assert.deepEqual(pose(find(second, cup.name)), pose(cup));
  advance(second, 47.7);
  const before = pose(find(second, 'cup_0'));
  const third = createWorld(
    { state: { ...throwing, flags: { ...throwing.flags, cup_cast_counted: true } } },
    second,
  );
  carryPropContinuity(second, third, 47.7);
  advance(third, 47.7);
  assert.deepEqual(pose(find(third, 'cup_0')), before);
  advance(third, 49);
  reference.children.forEach((cup) => cup.animate(2, 0));
  for (const cup of reference.children) assert.deepEqual(pose(find(third, cup.name)), pose(cup));
});

test('retaining the room updates candle light and interaction commands without replaying flame motion', () => {
  const unlit = state('mini_room', 'room_table');
  const first = createWorld({ state: unlit });
  const lit = { ...unlit, shotKey: 'room_candle', flags: { red_candle_lit: true } };
  const second = createWorld({ state: lit }, first);
  assert.equal(second.environment.root, first.environment.root);
  assert.equal(first.lighting.lamps.length, 0);
  assert.ok(second.lighting.lamps.some((light) => light.power === 6.5));
  carryPropContinuity(first, second, 12);
  advance(second, 12.6);
  const flame = pose(find(second, 'flame'));
  const third = createWorld({ state: { ...lit, shotKey: 'room_history' } }, second);
  carryPropContinuity(second, third, 12.6);
  advance(third, 12.6);
  assert.deepEqual(pose(find(third, 'flame')), flame);
  const waking = createWorld({ state: state('mini_wake_three_gongs', 'wake_candle') }, third);
  assert.equal(waking.environment.root, third.environment.root);
  assert.equal(find(waking, 'flame'), undefined);
  assert.equal(waking.lighting.lamps.length, 0);
  assert.equal(waking.hotspots.find((spot) => spot.id === 'candle').command, '续燃红烛');
});

test('rebuilt held props, contact lights and hotspots reference the current cast', () => {
  const game = state('mini_oracle', 'oracle_rescue', {
    flags: { cup_jiao_rescue: true },
    actors: [{ id: 'shangong', name: '神公', portrait: 'shangong', visible: true, status: '' }],
  });
  const first = createWorld({ state: game });
  const second = createWorld(
    { state: { ...game, flags: { ...game.flags, cup_cast_counted: true } } },
    first,
  );
  assert.equal(first.environment.root, second.environment.root);
  const currentNodes = new Set(nodes(second.root));
  const oldNodes = new Set(nodes(first.root));
  const attachments = [
    ...second.hotspots,
    ...second.lighting.lamps,
    ...(second.lighting.contacts || []),
  ].filter((item) => item.anchor);
  assert.ok(attachments.length > 0);
  for (const item of attachments) {
    assert.ok(currentNodes.has(item.anchor.node));
    assert.ok(!oldNodes.has(item.anchor.node), 'cast anchors cannot point into discarded rigs');
  }
});
