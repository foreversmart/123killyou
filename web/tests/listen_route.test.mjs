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
const { visibleActors, scenePlace } = await import('../src/scene/world/scene_state.ts');
const { actorMovement, movementPosition } = await import('../src/scene/world/movement.ts');
const { CORRIDOR_TRAVEL_LISTEN_SECONDS } = await import('../src/shared/lib/story_timing.ts');
const { cameraMatrix, project } = await import('../src/scene/renderer/frame.ts');
const { createPlayerControls, updateMouseLook, updatePlayerView } =
  await import('../src/scene/world_view/player_controls.ts');
const { PLAYER_RADIUS } = await import('../src/scene/world_view/player_bounds.ts');

const companions = ['linlan', 'zhouyan', 'xuzhi'];
const actor = (id, extra = {}) => ({
  id,
  name: id,
  visible: true,
  portrait: id,
  position: '',
  status: '',
  ...extra,
});
const listenState = (companion, extra = {}) => ({
  sceneKey: 'mini_listen',
  shotKey: 'listen_door',
  flags: {
    companion_present: Boolean(companion),
    ...Object.fromEntries(companions.map((id) => [`meal_${id}_ate`, id !== companion])),
  },
  actors: [
    actor('player'),
    ...(companion ? [actor(companion)] : []),
    actor('huipu'),
    actor('victim', { portrait: companion === 'zhouyan' ? 'xuzhi' : 'zhouyan' }),
  ],
  dialogue: { speaker: '', text: '' },
  inventory: [],
  ...extra,
});

const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

function assertClearPassage([x, , z], label) {
  assert.ok(Math.abs(x) < 5.3, `${label}: 留在客房门槛外`);
  assert.ok(z > -6.6 && z < -1, `${label}: 路线连接门房与后排客房`);
  for (const side of [-1, 1]) {
    for (const [centerZ, depth] of [
      [-4.05, 1.87],
      [-7.03, 0.77],
    ]) {
      const inBed = Math.abs(x - side * 3.57) < 0.825 && Math.abs(z - centerZ) < depth / 2;
      assert.equal(inBed, false, `${label}: 不穿过花坛`);
    }
    for (const columnZ of [-7.35, -4.1, 0.35, 6.5])
      assert.ok(Math.hypot(x - side * 4.65, z - columnZ) > 0.38, `${label}: 避开廊柱`);
  }
}

for (const companion of companions) {
  test(`夜间跟随${companion}时主角与同伴一起走到对应房门外，并在门前停稳`, () => {
    const state = listenState(companion);
    const people = [state.actors[0], state.actors[1]];
    const expectedIds = ['player', companion];
    assert.deepEqual(
      visibleActors(state, 'travel').map(({ id }) => id),
      expectedIds,
    );
    assert.deepEqual(
      visibleActors(state).map(({ id }) => id),
      expectedIds,
    );
    assert.equal(scenePlace(state, 'travel'), 'corridor');
    assert.equal(scenePlace(state), 'corridor', '到达后仍在门外');

    const movements = people.map((person) => actorMovement(person, state, 'travel', [0, 0, 0]));
    for (const movement of movements) {
      assert.ok(movement, '两人各自有实际步行路线');
      assert.ok(movement.duration < CORRIDOR_TRAVEL_LISTEN_SECONDS, '抵达后留出站定时间');
      assert.ok(movement.from[0] > 4.3 && movement.from[0] < 5.3, '从主角的门房外起步');
      assert.ok(Math.abs(movement.from[2] + 2) < 0.8, '起点紧邻门房');
      const side = companion === 'zhouyan' ? 1 : -1;
      assert.ok(movement.to[0] * side > 4.3, '按房内游客选择纸房或灯房');
      assert.ok(movement.to[0] * side < 5.3, '站定位置未跨入房内');
      assert.ok(Math.abs(movement.to[2] + 6) < 0.8, '终点紧邻目标房门');
    }

    for (let time = 0; time <= CORRIDOR_TRAVEL_LISTEN_SECONDS; time += 0.1) {
      const positions = movements.map((movement) => movementPosition(movement, time));
      positions.forEach((position, index) =>
        assertClearPassage(position, `${expectedIds[index]} ${time}`),
      );
      assert.ok(distance(...positions) >= 0.55, '两人沿途保持各自空间');
    }

    const travel = createWorld({ state, mode: 'travel' });
    const doorway = createWorld({ state });
    for (const aspect of [16 / 9, 4 / 3, 9 / 16]) {
      const matrix = cameraMatrix(travel.camera, aspect);
      for (const movement of movements)
        for (const point of movement.path)
          for (const height of [0, 1.9])
            assert.ok(project([point[0], height, point[2]], matrix), '横竖屏完整容纳两人路线');
    }
    for (const id of expectedIds) {
      const walking = travel.root.children.find((node) => node.name === id);
      const arrived = doorway.root.children.find((node) => node.name === id);
      assert.ok(walking?.animate && arrived?.animate, `${id} 在转场与门口正片都可见`);
      walking.animate(CORRIDOR_TRAVEL_LISTEN_SECONDS, 0);
      arrived.animate(0, 0);
      assert.deepEqual(walking.position, arrived.position, '转场与正片承接同一站位');
      const endPosition = [...walking.position];
      walking.animate(CORRIDOR_TRAVEL_LISTEN_SECONDS + 3, 0);
      assert.deepEqual(walking.position, endPosition, '完成后保持停稳');
      const doorFacing = companion === 'zhouyan' ? Math.PI / 2 : -Math.PI / 2;
      assert.ok(
        Math.abs(angleDifference(walking.rotation[1], doorFacing)) < 0.1,
        '行走结束转向房门',
      );
      assert.ok(
        Math.abs(angleDifference(arrived.rotation[1], doorFacing)) < 0.1,
        '门口正片仍朝向房门',
      );
    }
    for (const world of [travel, doorway]) {
      assert.equal(
        world.root.children.some((node) => node.name === 'huipu'),
        false,
      );
      assert.equal(
        world.root.children.some((node) => node.name === 'victim'),
        false,
      );
    }
  });
}

test('夜间转场即使收到已揭示状态也不提前显示房内人物', () => {
  const state = listenState('linlan', {
    shotKey: 'listen_skin',
    flags: { companion_present: true, skin_seen: true },
  });
  assert.deepEqual(
    visibleActors(state, 'travel').map(({ id }) => id),
    ['player', 'linlan'],
  );
  const world = createWorld({ state, mode: 'travel' });
  assert.equal(
    world.root.children.some((node) => ['huipu', 'victim'].includes(node.name)),
    false,
  );
});

test('独自到门口时不凭空增加同行者，也不显示不可见角色', () => {
  const state = listenState(null);
  state.actors.push(actor('linlan', { visible: false }));
  for (const mode of ['story', 'travel']) {
    assert.deepEqual(
      visibleActors(state, mode).map(({ id }) => id),
      ['player'],
    );
    const world = createWorld({ state, mode });
    assert.equal(
      world.root.children.some((node) => companions.includes(node.name)),
      false,
    );
  }
  state.actors[0].visible = false;
  assert.deepEqual(visibleActors(state, 'travel'), [], '主角显隐仍遵守后端状态');
});

test('门口与道具近景的持续移动停在门外，不穿过花坛或廊柱，观察视角仍可转动', () => {
  for (const companion of ['linlan', 'zhouyan']) {
    for (const shotKey of ['listen_door', 'listen_cat', 'listen_bird']) {
      const state = listenState(companion, { shotKey });
      const scene = createWorld({ state });
      const initial = structuredClone(scene.camera);
      const idle = createPlayerControls();
      updatePlayerView(idle, scene, state, 0.05, true);
      assert.deepEqual(scene.camera.eye, initial.eye, '启用移动不会把初始镜头夹到别处');
      assertCameraOnPassage(scene.camera.eye);

      for (const keys of [['w'], ['s'], ['a'], ['d'], ['w', 'd'], ['s', 'a']]) {
        scene.camera = structuredClone(initial);
        const controls = createPlayerControls();
        keys.forEach((key) => controls.keys.add(key));
        for (let frame = 0; frame < 300; frame++) {
          updatePlayerView(controls, scene, state, 0.05, true);
          assertCameraOnPassage(scene.camera.eye);
        }
        assert.ok(distance(scene.camera.eye, initial.eye) > 0.1, '保留正常移动');
        controls.keys.clear();
        controls.velocity = [0, 0];
        const position = [...scene.camera.eye];
        const target = [...scene.camera.target];
        updateMouseLook(controls, 80, -20);
        updatePlayerView(controls, scene, state, 0, true);
        assert.deepEqual(scene.camera.eye, position, '转头不改变位置');
        assert.notDeepEqual(scene.camera.target, target, '仍可转头观察');
      }
    }
  }
});

function assertCameraOnPassage([x, , z]) {
  assert.ok(Math.abs(x) <= 5.5 - 0.1 - PLAYER_RADIUS + 1e-8, '身体留在客房墙和门槛外');
  assert.ok(z >= -6.645 + PLAYER_RADIUS && z <= -1.2 + 1e-8, '身体不进入后端花坛');
  for (const side of [-1, 1]) {
    const touchesGarden =
      Math.abs(x - side * 3.57) < 0.825 + PLAYER_RADIUS &&
      z > -4.985 - PLAYER_RADIUS &&
      z < -3.115 + PLAYER_RADIUS;
    assert.equal(touchesGarden, false, '身体不穿过花坛边框');
    const touchesColumn =
      Math.abs(x - side * 4.65) < 0.225 + PLAYER_RADIUS &&
      z > -4.325 - PLAYER_RADIUS &&
      z < -3.875 + PLAYER_RADIUS;
    assert.equal(touchesColumn, false, '身体不穿过廊柱基座');
  }
}
