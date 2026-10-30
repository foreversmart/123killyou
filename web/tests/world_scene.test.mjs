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
const { scenePlace, visibleActors, isDaylight } = await import('../src/scene/world/scene_state.ts');
const { box, sphere, cylinder, torus } = await import('../src/scene/geometry/primitives.ts');
const { roofTile } = await import('../src/scene/geometry/roof_tile.ts');
const { cameraMatrix, project } = await import('../src/scene/renderer/frame.ts');

const actor = (id, extra = {}) => ({
  id,
  name: id,
  visible: true,
  portrait: id,
  position: '',
  status: '',
  ...extra,
});
const state = (sceneKey, extra = {}) => ({
  sceneKey,
  shotKey: '',
  flags: {},
  actors: [],
  dialogue: { speaker: '', text: '' },
  inventory: [],
  ...extra,
});

test('3D camera never exposes hidden speakers, the abbot behind a closed curtain, or danger during travel', () => {
  const game = state('mini_refectory', {
    actors: [
      actor('player'),
      actor('unknown'),
      actor('companion_voice'),
      actor('linlan'),
      actor('huipu'),
      actor('xuzhi', { visible: false }),
    ],
  });
  assert.deepEqual(
    visibleActors(game).map((a) => a.id),
    ['linlan'],
  );
  game.shotKey = 'refectory_curtain';
  assert.deepEqual(
    visibleActors(game).map((a) => a.id),
    ['linlan', 'huipu'],
  );
  assert.deepEqual(
    visibleActors(game, 'travel').map((a) => a.id),
    ['linlan'],
  );
  game.sceneKey = 'mini_listen';
  assert.deepEqual(
    visibleActors(game).map((a) => a.id),
    ['linlan'],
  );
  game.flags.skin_seen = true;
  assert.deepEqual(
    visibleActors(game).map((a) => a.id),
    ['linlan', 'huipu'],
  );
  assert.deepEqual(visibleActors({ ...game, sceneKey: 'mini_death' }), []);
});

test('peephole, false dawn, the gate and the departure shot follow existing story states', () => {
  assert.equal(scenePlace(state('mini_four_knocks', { shotKey: 'four_peephole' })), 'corridor');
  assert.equal(isDaylight(state('mini_dawn_trap')), false);
  assert.equal(isDaylight(state('mini_dawn')), true);
  assert.equal(scenePlace(state('mini_dawn', { shotKey: 'dawn_gate' })), 'gate');
  assert.equal(scenePlace(state('mini_ending'), 'travel'), 'gate');
  assert.equal(scenePlace(state('mini_ending')), 'road');
  assert.equal(scenePlace(state('mini_death', { retryScene: 'mini_oracle' })), 'oracle');
  assert.equal(scenePlace(state('mini_death', { shotKey: 'death_mini_listen' })), 'listen');
  const ending = state('mini_ending', { actors: [actor('linlan')] });
  assert.equal(visibleActors(ending).length, 0);
  assert.equal(visibleActors(ending, 'travel').length, 1);
});

test('oracle results keep cups on the floor and a single candle attached to the guide', () => {
  const world = createWorld({
    state: state('mini_oracle', {
      shotKey: 'oracle_rescue',
      flags: { cup_cast_counted: true, cup_jiao_rescue: true, cup_roll_sacred: true },
      actors: [actor('shangong')],
    }),
  });
  const nodes = [];
  const visit = (n) => {
    nodes.push(n);
    n.children.forEach(visit);
  };
  visit(world.root);
  assert.equal(nodes.filter((n) => n.name === 'red_candle').length, 1);
  assert.ok(world.hotspots.find((n) => n.id === 'cups').position[1] < 0.2);
  assert.equal(world.lighting.lamps[0].anchor.node.name, 'red_candle');
  const candle = world.hotspots.find((n) => n.id === 'candle');
  assert.equal(candle.anchor.node, world.lighting.lamps[0].anchor.node);
});

test('a calmed double kneels at the bed while deaths retain their original room without living actors', () => {
  const world = createWorld({
    state: state('mini_double', {
      shotKey: 'double_calm',
      flags: { double_calm: true, red_candle_lit: true },
      actors: [actor('skin_double', { portrait: 'linlan' })],
    }),
  });
  const rig = world.root.children.find((n) => n.name === 'linlan');
  assert.equal(rig.children.filter((n) => n.name === 'kneeling_leg').length, 2);
  assert.equal(rig.rotation[0], 0);
  const scripture = createWorld({
    state: state('mini_double', {
      shotKey: 'double_scripture_4',
      flags: { double_calm: true, double_scripture_4: true, red_candle_lit: true },
      actors: [actor('skin_double', { portrait: 'linlan' })],
    }),
  });
  const calmed = scripture.root.children.find((n) => n.name === 'linlan');
  assert.equal(calmed.children.filter((n) => n.name === 'kneeling_leg').length, 2);
  const death = createWorld({
    state: state('mini_death', {
      retryScene: 'mini_oracle',
      flags: { story_dead: true, red_candle_lit: true },
    }),
  });
  assert.ok(death.root.children.some((n) => n.name === 'oracle'));
  assert.ok(death.root.children.some((n) => n.name === 'intrusion_shadow'));
  assert.equal(death.hotspots.length, 0);
  const nodes = [];
  const visit = (n) => {
    nodes.push(n);
    n.children.forEach(visit);
  };
  visit(death.root);
  assert.equal(nodes.filter((n) => n.name === 'flame').length, 0);
});

test('all story rooms build finite indexed meshes and preserve backend commands without mutating saves', () => {
  for (const scene of [
    'arrival',
    'register',
    'refectory',
    'corridor_candle',
    'room',
    'wake_three_gongs',
    'four_knocks',
    'three_knocks',
    'listen',
    'oracle',
    'double',
    'dawn_trap',
    'dawn',
    'ending',
    'death',
  ]) {
    const input = state('mini_' + scene, { actors: [actor('linlan'), actor('luchen')] });
    const before = JSON.stringify(input),
      world = createWorld({ state: input });
    const visit = (n) => {
      if (n.geometry) {
        assert.ok(n.geometry.vertices.every(Number.isFinite), scene + ':' + n.name);
        assert.equal(n.geometry.vertices.length % 16, 0);
        assert.ok(n.geometry.indices.every((i) => i < n.geometry.vertices.length / 16));
      }
      n.children.forEach(visit);
    };
    visit(world.root);
    assert.equal(JSON.stringify(input), before);
    assert.equal(new Set(world.hotspots.map((p) => p.id)).size, world.hotspots.length);
    world.hotspots.forEach((p) => assert.ok(p.command.length));
  }
  const room = createWorld({ state: state('mini_wake_three_gongs') });
  assert.equal(room.hotspots.find((p) => p.id === 'candle').command, '续燃红烛');
  assert.equal(room.lighting.lamps.length, 0);
  const relit = createWorld({
    state: state('mini_wake_three_gongs', { flags: { red_candle_lit: true } }),
  });
  assert.equal(relit.lighting.lamps.length, 1);
});

test('procedural primitives face outward for back-face culling and real shadow maps', () => {
  for (const shape of [
    box(1, 1, 1),
    sphere(),
    cylinder(0.2, 0.3, 1),
    torus(0.2, 0.03),
    roofTile(0.4),
    roofTile(0.4, true),
  ]) {
    for (let i = 0; i < shape.indices.length; i += 3) {
      const [a, b, c] = shape.indices
        .slice(i, i + 3)
        .map((j) => shape.positions.slice(j * 3, j * 3 + 3));
      const u = b.map((v, j) => v - a[j]),
        v = c.map((v, j) => v - a[j]);
      const cross = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ];
      const n = shape.normals.slice(shape.indices[i] * 3, shape.indices[i] * 3 + 3);
      assert.ok(cross.reduce((s, v, j) => s + v * n[j], 0) >= -1e-8);
    }
  }
});

test('3D hotspots project to the visible object and hide behind the camera', () => {
  const vp = cameraMatrix({ eye: [0, 1, 5], target: [0, 1, 0] }, 1.6);
  const screen = project([0, 1, 0], vp);
  assert.ok(Math.abs(screen.x - 50) < 0.001 && Math.abs(screen.y - 50) < 0.001);
  assert.equal(project([0, 1, 6], vp), null);
});
