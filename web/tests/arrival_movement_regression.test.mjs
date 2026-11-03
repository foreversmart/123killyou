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
const { scenePlace } = await import('../src/scene/world/scene_state.ts');
const { actorPositions } = await import('../src/scene/world/placement.ts');
const { performanceFor } = await import('../src/scene/world_character/performance.ts');
const { gateActivityPosition } = await import('../src/scene/world/movement.ts');
const { characterModel } = await import('../src/scene/world_character/model.ts');
const { animateCharacter } = await import('../src/scene/world_character/animation.ts');

const actor = (id) => ({
  id,
  name: id,
  portrait: id,
  visible: true,
  position: '',
  status: '',
});

const actors = ['linlan', 'zhouyan', 'xuzhi', 'luchen'].map(actor);
const state = (shotKey, sceneKey = 'mini_arrival') => ({
  sceneKey,
  shotKey,
  flags: {},
  actors,
  dialogue: { speaker: '', text: '' },
  inventory: [],
});

test('opening gate walk animates both legs and covers the wider entrance distance', () => {
  const world = createWorld({ state: state('arrival_gate'), mode: 'alighting' });
  const distances = [];
  for (const person of actors) {
    const root = world.root.children.find((node) => node.name === person.id);
    assert.ok(root?.animate, `${person.id} has a movement callback`);
    const legs = root.children.filter((node) => node.name === 'leg');
    assert.equal(legs.length, 2, `${person.id} has two legs in the gate rig`);
    root.animate(0, 0);
    const start = [...root.position];
    const lifted = [false, false];
    let alternating = false;
    for (let frame = 1; frame <= 180; frame++) {
      root.animate(frame / 60, 1 / 60);
      const bends = legs.map((leg) => leg.bend?.angle || 0);
      bends.forEach((bend, side) => {
        lifted[side] ||= bend > 0.02;
      });
      alternating ||= Math.abs(bends[0] - bends[1]) > 0.02;
    }
    assert.ok(lifted.every(Boolean), `${person.id} lifts both legs while crossing the gate`);
    assert.ok(
      alternating,
      `${person.id} alternates the two legs instead of translating as one piece`,
    );
    const duration = [4.65, 5.55, 6.225, 5.1][actors.findIndex(({ id }) => id === person.id)];
    root.animate(duration, 0);
    distances.push(Math.hypot(...root.position.map((value, index) => value - start[index])));
    root.animate(duration + 0.2, 0);
    assert.ok(
      legs.every(
        (leg) => Math.abs(leg.rotation[0]) < 0.001 && Math.abs(leg.bend?.angle || 0) < 0.001,
      ),
      `${person.id} settles both feet before the gate scene continues`,
    );
  }
  assert.ok(
    distances.reduce((sum, distance) => sum + distance, 0) / distances.length > 2.15,
    'the gate walk spans enough of the entrance tableau',
  );
});

test('arrival shot changes keep everyone at the gate and preserve active companion actions', () => {
  const gateScenes = [
    ['mini_arrival', 'arrival_gate'],
    ['mini_arrival', 'arrival_gate_beauty'],
    ['mini_arrival', 'arrival_weather'],
    ['mini_arrival', 'arrival_zhouyan'],
    ['mini_arrival', 'arrival_unload'],
    ['mini_dawn', 'dawn_gate'],
  ];
  for (const [sceneKey, shotKey] of gateScenes) {
    const game = state(shotKey, sceneKey);
    assert.equal(scenePlace(game), 'gate', `${shotKey} remains at the temple gate`);
    const world = createWorld({ state: game });
    for (const person of actors) {
      const root = world.root.children.find((node) => node.name === person.id);
      assert.ok(root, `${person.id} remains visible at ${shotKey}`);
      const expected = actorPositions.gate[person.id];
      assert.deepEqual(
        root.position,
        expected,
        `${person.id} keeps the authored gate position at ${shotKey}`,
      );
      assert.notEqual(
        performanceFor(person, game),
        'idle',
        `${person.id} keeps an active gate task at ${shotKey}`,
      );
    }
  }
});

test('gate drift only lifts feet while the authored position is actually changing', () => {
  const game = state('arrival_weather');
  const rig = characterModel('linlan');
  animateCharacter(rig, actor('linlan'), game);
  const root = rig.root;
  root.animate(2, 0);
  const standing = root.children
    .filter((node) => node.name === 'leg')
    .map((leg) => [leg.rotation[0], leg.bend?.angle || 0]);
  assert.ok(
    standing.every(([rotation, bend]) => Math.abs(rotation) < 0.001 && Math.abs(bend) < 0.001),
  );

  root.position[0] += 0.04;
  root.animate(2.1, 0);
  const stepping = root.children
    .filter((node) => node.name === 'leg')
    .map((leg) => [leg.rotation[0], leg.bend?.angle || 0]);
  assert.ok(
    stepping.some(([rotation, bend]) => Math.abs(rotation) > 0.02 || Math.abs(bend) > 0.02),
  );
  root.animate(2.2, 0);
  assert.ok(
    rig.legs.every((leg) => Math.abs(leg.rotation[0]) < 0.001 && Math.abs(leg.bend.angle) < 0.001),
    'feet settle when time advances without another displacement',
  );
});

test('gate activity uses a wider but bounded walking radius', () => {
  const game = state('arrival_weather');
  const base = actorPositions.gate.linlan;
  const action = performanceFor(actor('linlan'), game);
  let maxDistance = 0;
  for (let i = 0; i <= 240; i++) {
    const position = gateActivityPosition(actor('linlan'), game, action, i / 20, base);
    maxDistance = Math.max(maxDistance, Math.hypot(position[0] - base[0], position[2] - base[2]));
  }
  assert.ok(maxDistance > 0.5, `gate movement radius should exceed 0.5m, got ${maxDistance}`);
  assert.ok(
    maxDistance < 3.2,
    `gate movement stays inside the authored tableau, got ${maxDistance}`,
  );
});
