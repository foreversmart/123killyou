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
const { actorMovement, gateActivityPosition, CORRIDOR_TRAVEL_END_Z, CORRIDOR_TRAVEL_START_Z } =
  await import('../src/scene/world/movement.ts');
const { performanceKey } = await import('../src/scene/world/performance_key.ts');
const { performanceFor } = await import('../src/scene/world_character/performance.ts');
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

test('山门参观会沿当前活动持续换位，并保持在既有构图范围内', () => {
  const arrival = state('mini_arrival', {
    shotKey: 'arrival_weather',
    actors: ['linlan', 'zhouyan', 'xuzhi', 'luchen'].map((id) => actor(id)),
  });
  const baseById = {
    linlan: [-2.1, 0, 2.2],
    zhouyan: [2.25, 0, 1.2],
    xuzhi: [1.05, 0, 3],
    luchen: [-0.2, 0.24, -0.6],
  };
  const world = createWorld({ state: arrival });
  const roots = Object.fromEntries(
    arrival.actors.map(({ id }) => [id, world.root.children.find((node) => node.name === id)]),
  );
  const samples = [0, 2.1, 4.8].map((time) =>
    arrival.actors.map((person) => {
      const root = roots[person.id];
      assert.ok(root?.animate, `${person.id} has an animation callback`);
      root.animate(time, 0);
      return [...root.position];
    }),
  );
  for (let index = 0; index < arrival.actors.length; index++) {
    const id = arrival.actors[index].id;
    const positions = samples.map((sample) => sample[index]);
    const moved = Math.max(
      ...positions.map((position) =>
        Math.hypot(position[0] - baseById[id][0], position[2] - baseById[id][2]),
      ),
    );
    assert.ok(moved > 0.02, `${id} keeps moving while performing its activity`);
    assert.ok(moved < 0.5, `${id} stays inside the gate tableau`);
    assert.ok(
      positions.some(
        (position, sampleIndex) =>
          sampleIndex > 0 &&
          Math.hypot(
            position[0] - positions[sampleIndex - 1][0],
            position[2] - positions[sampleIndex - 1][2],
          ) > 0.01,
      ),
      `${id} changes position between observation beats`,
    );
  }
  assert.notDeepEqual(samples[1][0], samples[1][1], 'different visitors use different phases');

  const cameraAtStart = gateActivityPosition(
    actor('linlan'),
    arrival,
    'camera',
    0,
    baseById.linlan,
  );
  assert.notDeepEqual(
    gateActivityPosition(actor('linlan'), arrival, 'camera', 2.1, baseById.linlan),
    cameraAtStart,
  );
  assert.deepEqual(
    gateActivityPosition(actor('linlan'), state('mini_register'), 'camera', 2.1, baseById.linlan),
    baseById.linlan,
    'gate activity does not leak into interior scenes',
  );
});

test('山门连续镜头保留同一组活动键，便于渲染器延续动作时钟', () => {
  const actors = ['linlan', 'zhouyan', 'xuzhi', 'luchen'].map((id) => actor(id));
  const first = state('mini_arrival', { shotKey: 'arrival_gate', actors });
  const next = state('mini_arrival', { shotKey: 'arrival_weather', actors });
  assert.notEqual(performanceKey(first, 'story'), performanceKey(next, 'story'));
  assert.equal(scenePlace(first), 'gate');
  assert.equal(scenePlace(next), 'gate');
});

test('晚膳路线先沿回廊再横穿大殿，队伍在大殿从右向左行走', () => {
  const guest = actor('linlan');
  const corridor = actorMovement(guest, state('mini_refectory'), 'travel', [0.8, 0, -1]);
  const returnWalk = actorMovement(guest, state('mini_corridor_candle'), 'travel', [0.8, 0, 5.7]);
  const hall = actorMovement(guest, state('mini_refectory'), 'hall', [2, 0, 1.5]);
  assert.equal(corridor?.duration, 6.2);
  assert.ok((corridor?.to[2] ?? 0) < (corridor?.from[2] ?? 0), '偏房去大殿向外走');
  assert.ok((corridor?.to[2] ?? 0) < CORRIDOR_TRAVEL_END_Z + 0.5);
  assert.equal(returnWalk?.duration, 6);
  assert.ok((returnWalk?.to[2] ?? 0) > (returnWalk?.from[2] ?? 0), '回程沿原路返回');
  assert.ok((returnWalk?.to[2] ?? 0) > CORRIDOR_TRAVEL_START_Z - 0.5);
  assert.equal(hall?.duration, 7.6);
  assert.ok((hall?.to[0] ?? 0) < (hall?.from[0] ?? 0));
  assert.equal(hall?.to[2], hall?.from[2]);
});

test('人物移动时镜头固定为远景监控机位，不随队伍推进或翻转', () => {
  const outward = createWorld({ state: state('mini_refectory'), mode: 'travel' });
  const inward = createWorld({ state: state('mini_corridor_candle'), mode: 'travel' });
  const outwardShot = { eye: [...outward.camera.eye], target: [...outward.camera.target] };
  const inwardShot = { eye: [...inward.camera.eye], target: [...inward.camera.target] };
  assert.equal(outward.root.animate, undefined, '去程不绑定跟随人物的镜头动画');
  assert.equal(inward.root.animate, undefined, '回程不绑定跟随人物的镜头动画');
  assert.ok(outward.camera.eye[1] > 2, '去程使用高位远景');
  assert.ok(inward.camera.eye[1] > 2, '回程使用高位远景');
  assert.ok(
    Math.hypot(...outward.camera.eye.map((value, index) => value - outward.camera.target[index])) >
      8,
  );
  assert.ok(
    Math.hypot(...inward.camera.eye.map((value, index) => value - inward.camera.target[index])) > 8,
  );
  for (const time of [0, 3.1, 6.2]) {
    outward.root.animate?.(time, 0);
    inward.root.animate?.(time, 0);
    assert.deepEqual(outward.camera.eye, outwardShot.eye);
    assert.deepEqual(outward.camera.target, outwardShot.target);
    assert.deepEqual(inward.camera.eye, inwardShot.eye);
    assert.deepEqual(inward.camera.target, inwardShot.target);
  }
  const hall = createWorld({ state: state('mini_refectory'), mode: 'hall' });
  const hallShot = { eye: [...hall.camera.eye], target: [...hall.camera.target] };
  assert.equal(hall.root.animate, undefined, '大殿横移也保持固定机位');
  hall.root.animate?.(7.6, 0);
  assert.deepEqual(hall.camera.eye, hallShot.eye);
  assert.deepEqual(hall.camera.target, hallShot.target);
  const ending = createWorld({ state: state('mini_ending'), mode: 'travel' });
  assert.equal(ending.root.animate, undefined, '返程山门也保持固定远景');
  assert.ok(ending.camera.eye[1] > 3, '返程使用山门外的高位远景');
});

test('回廊队伍在侧门前停步并转向，镜头目标留在尽头墙前', () => {
  const world = createWorld({
    state: state('mini_register', { actors: [actor('linlan'), actor('zhouyan')] }),
    mode: 'travel',
  });
  const linlan = world.root.children.find((node) => node.name === 'linlan');
  assert.ok(linlan?.animate);
  linlan.animate(7, 0);
  assert.ok(linlan.position[2] > -7.8, '角色停在尽头墙前');
  assert.ok(Math.abs(linlan.rotation[1] + Math.PI / 2) < 0.08, '角色转向侧门');
  const cameraAtStart = { eye: [...world.camera.eye], target: [...world.camera.target] };
  world.root.animate?.(7, 0);
  assert.ok(world.camera.target[2] > -7.8, '镜头目标没有穿过尽头墙');
  assert.deepEqual(world.camera.eye, cameraAtStart.eye, '镜头抵达前不翻转');
  assert.deepEqual(world.camera.target, cameraAtStart.target, '镜头抵达前保持原取景');
  assert.ok(CORRIDOR_TRAVEL_END_Z > -7.8);
});

test('东院回廊门间墙面挂有六块矿物颜料佛教壁画', () => {
  const world = createWorld({ state: state('mini_register', { shotKey: 'register_rooms' }) });
  const names = [];
  const visit = (node) => {
    names.push(node.name);
    node.children.forEach(visit);
  };
  visit(world.root);
  assert.equal(names.filter((name) => name === 'hall_buddhist_mural').length, 6);
});

test('登记时三位游客围桌看和尚，许栀朝院景并保持动作', () => {
  const actors = ['linlan', 'zhouyan', 'xuzhi', 'luchen'].map((id) => actor(id));
  const world = createWorld({
    state: state('mini_register', { shotKey: 'register_desk', actors }),
  });
  const roots = Object.fromEntries(
    actors.map(({ id }) => [id, world.root.children.find((node) => node.name === id)]),
  );
  assert.deepEqual(roots.linlan.position, [-1.15, 0, 0.28]);
  assert.deepEqual(roots.zhouyan.position, [1.05, 0, 0.18]);
  assert.deepEqual(roots.xuzhi.position, [1.32, 0, 0.72]);
  // The glance is head-led. Once the short settle finishes, every guest's
  // torso still faces the keeper behind the desk rather than turning toward
  // the window or back toward the player.
  for (const id of ['linlan', 'zhouyan', 'xuzhi']) {
    const root = roots[id];
    root.animate(1.2, 0);
    const [x, , z] = root.position;
    const expected = Math.atan2(-x, -0.7 - z);
    const delta = Math.atan2(
      Math.sin(root.rotation[1] - expected),
      Math.cos(root.rotation[1] - expected),
    );
    assert.ok(Math.abs(delta) < 0.08, `${id} faces the keeper at the desk`);
  }
  assert.equal(
    performanceFor(actors[0], state('mini_register', { shotKey: 'register_desk' })),
    'camera',
  );
  assert.equal(
    performanceFor(actors[1], state('mini_register', { shotKey: 'register_desk' })),
    'inspect',
  );
  assert.equal(
    performanceFor(actors[2], state('mini_register', { shotKey: 'register_desk' })),
    'glance',
  );
  const zhouyanBody = roots.zhouyan.children.find((node) => node.name === 'body');
  const zhouyanBefore = [...zhouyanBody.rotation];
  roots.zhouyan.animate(2, 0);
  assert.notDeepEqual(zhouyanBody.rotation, zhouyanBefore, '周砚会随笔尖持续换重心');
  const linlanCamera = roots.linlan.children
    .find((node) => node.name === 'body')
    .children.find((node) => node.name === 'held_camera');
  const cameraBefore = [...linlanCamera.position];
  roots.linlan.animate(4, 0);
  assert.notDeepEqual(linlanCamera.position, cameraBefore, '林岚会抬放相机检查取景');
  const before = roots.xuzhi.children.find((node) => node.name === 'body').rotation.slice();
  roots.xuzhi.animate(2, 0);
  const after = roots.xuzhi.children.find((node) => node.name === 'body').rotation;
  assert.notDeepEqual(after, before, '许栀持续观察院景时身体会有轻微回看');
});

test('质疑拖痕时登记队伍仍面向陆沉并留在桌边', () => {
  const actors = ['linlan', 'zhouyan', 'xuzhi', 'luchen'].map((id) => actor(id));
  const world = createWorld({
    state: state('mini_register', { shotKey: 'register_drag_mark', actors }),
  });
  const roots = Object.fromEntries(
    actors.map(({ id }) => [id, world.root.children.find((node) => node.name === id)]),
  );
  for (const id of ['linlan', 'zhouyan', 'xuzhi']) {
    const root = roots[id];
    root.animate(1.2, 0);
    const [x, , z] = root.position;
    const expected = Math.atan2(-x, -0.7 - z);
    const delta = Math.atan2(
      Math.sin(root.rotation[1] - expected),
      Math.cos(root.rotation[1] - expected),
    );
    assert.ok(Math.abs(delta) < 0.08, `${id} faces Lu Chen during the drag-mark question`);
  }
  assert.deepEqual(roots.zhouyan.position, [1.05, 0, 0.18]);
  assert.deepEqual(roots.luchen.position, [0, 0, -0.85]);
});

test('大殿保留两尊主像并新增四大天王与四幅壁画', () => {
  const world = createWorld({ state: state('mini_refectory'), mode: 'hall' });
  const names = [];
  const visit = (node) => {
    names.push(node.name);
    node.children.forEach(visit);
  };
  visit(world.root);
  assert.equal(names.filter((name) => name === 'bodhisattva').length, 2);
  assert.equal(names.filter((name) => name.startsWith('heavenly_king_')).length, 4);
  assert.equal(names.filter((name) => name === 'hall_buddhist_mural').length, 4);
});

test('不同寺院房间使用符合用途的佛教器物，而不是统一堆放佛像', () => {
  const namesFor = (sceneKey) => {
    const names = [];
    const visit = (node) => {
      names.push(node.name);
      node.children.forEach(visit);
    };
    visit(createWorld({ state: state(sceneKey) }).root);
    return names;
  };
  assert.ok(namesFor('mini_register').includes('incense_burner'));
  assert.ok(namesFor('mini_refectory').includes('wood_fish'));
  assert.ok(namesFor('mini_oracle').includes('incense_burner'));
  assert.ok(namesFor('mini_room').every((name) => name !== 'wood_fish'));
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

test('sleep shots lower the eye onto the bed and settle on the ceiling beams', () => {
  const world = createWorld({
    state: state('mini_wake_three_gongs', { shotKey: 'room_sleep_wait' }),
  });
  world.root.animate?.(0, 0);
  const standingHeight = world.camera.eye[1];
  world.root.animate?.(0.8, 0);
  const transitionHeight = world.camera.eye[1];
  world.root.animate?.(1.8, 0);
  assert.ok(transitionHeight > world.camera.eye[1]);
  assert.ok(world.camera.eye[1] < standingHeight);
  assert.ok(world.camera.target[1] > 3);
  assert.ok([...world.camera.eye, ...world.camera.target].every(Number.isFinite));
});
