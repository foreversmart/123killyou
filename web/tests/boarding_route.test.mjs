import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { mat4, vec3 } from 'wgpu-matrix';

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

const { actorMovement, movementPosition } = await import('../src/scene/world/movement.ts');
const { visibleActors } = await import('../src/scene/world/scene_state.ts');
const { createWorld } = await import('../src/scene/world/create_world.ts');
const { cameraMatrix, project } = await import('../src/scene/renderer/frame.ts');
const { BOARDING_TRAVEL_SECONDS } = await import('../src/shared/lib/story_timing.ts');

const actor = (id, visible = true) => ({
  id,
  name: id,
  visible,
  portrait: id,
  position: '',
  status: '',
});
const state = () => ({
  sceneKey: 'mini_ending',
  shotKey: 'ending_bus',
  flags: {},
  actors: ['linlan', 'zhouyan', 'xuzhi', 'player'].map((id) => actor(id)),
  dialogue: { speaker: '', text: '' },
  inventory: [],
});

test('返程时四位游客同时走向大巴，在车门排队并逐个踏阶进入车厢', () => {
  const game = state();
  const movements = game.actors.map((person) => actorMovement(person, game, 'travel', [0, 0, 0]));
  for (const movement of movements) {
    assert.ok(movement, '每位游客都有专用返程路线');
    assert.ok(movement.from[2] >= 1.2, '从寺门外起步');
    assert.ok(movementPosition(movement, 0.5)[0] < movement.from[0], '一开始就向大巴移动');
    assert.ok(movement.duration < BOARDING_TRAVEL_SECONDS, '全部进入车厢后再切山路');
    assert.ok(movement.to[0] < -5.8 && movement.to[0] > -7, '终点在车厢内');
    assert.equal(movement.to[1], 1.08, '脚底与车厢地板对齐');
    assert.ok(movement.to[2] > 3, '进入车门后继续向车厢内走');
    for (const [index, point] of movement.path.entries()) {
      assert.ok(point[2] >= 1.2, '整条路线远离寺门及侧栏杆');
      assert.deepEqual(
        movementPosition(movement, movement.pathTimes[index]),
        point,
        '每个台阶采样落在对应踏步面上',
      );
      if (point[1] > 0 && point[0] > -6.1)
        assert.ok(Math.abs(point[2] - 2.09) < 0.001, '只从打开的车门进入');
    }
    assert.deepEqual(movementPosition(movement, 50), movement.to, '上车后不再倒退回寺门');
  }
  for (let time = 0; time < BOARDING_TRAVEL_SECONDS; time += 0.1) {
    const positions = movements.map((movement) => movementPosition(movement, time));
    for (let a = 0; a < positions.length; a++)
      for (let b = a + 1; b < positions.length; b++) {
        if (positions[a][0] < -5.8 || positions[b][0] < -5.8) continue;
        const distance = Math.hypot(...positions[a].map((v, axis) => v - positions[b][axis]));
        assert.ok(distance >= 0.55, '队伍在车外和台阶上不重叠');
      }
  }
});

test('结局转场显示主角与三位游客，上车后的山路镜头不显示车外人像', () => {
  const game = state();
  assert.deepEqual(
    visibleActors(game, 'travel').map(({ id }) => id),
    ['linlan', 'zhouyan', 'xuzhi', 'player'],
  );
  assert.deepEqual(visibleActors(game), []);
  game.actors[3].visible = false;
  assert.equal(
    visibleActors(game, 'travel').some(({ id }) => id === 'player'),
    false,
  );
  assert.equal(actorMovement(actor('luchen'), game, 'travel', [0, 0, 0]), undefined);
});

test('实际结局角色模型沿返程路线进入大巴，不再沿旧路径走向寺门', () => {
  const game = state();
  const world = createWorld({ state: game, mode: 'travel' });
  const coach = world.root.children.find(({ name }) => name === 'bus');
  assert.deepEqual(coach.position, [-6.4, 0, 6], '车门停在无栏杆遮挡的位置');
  for (const person of game.actors) {
    const rig = world.root.children.find(({ name }) => name === person.id);
    const movement = actorMovement(person, game, 'travel', [0, 0, 0]);
    assert.ok(rig?.animate, `${person.id} 的实际模型可见`);
    for (const time of [0, 2, 5, 7, 9, 12]) {
      rig.animate(time, 0.05);
      assert.deepEqual(rig.position, movementPosition(movement, time));
    }
  }
});

test('登车机位看清三级踏步和登车人物，车门不能提前遮住最后一级', () => {
  const world = createWorld({ state: state(), mode: 'travel' });
  const bus = world.root.children.find(({ name }) => name === 'bus');
  const transform = mat4.rotateY(mat4.translation(bus.position), bus.rotation[1]);
  const eye = vec3.transformMat4(world.camera.eye, mat4.inverse(transform));
  const meshes = bus.children.filter((node) => node.geometry && !node.shadowOnly);
  const view = cameraMatrix(world.camera, 16 / 9);
  for (let step = 0; step < 3; step++) {
    for (const height of [0.02, 0.85, 1.65]) {
      const point = [-1.47 + step * 0.36, 0.36 + step * 0.36 + height, 3.91];
      const screen = project(vec3.transformMat4(point, transform), view);
      assert.ok(screen && screen.x > 5 && screen.x < 95 && screen.y > 5 && screen.y < 95);
      const direction = vec3.subtract(point, eye);
      for (const mesh of meshes) {
        const { vertices, indices } = mesh.geometry;
        for (let i = 0; i < indices.length; i += 3) {
          const [a, b, c] = Array.from(indices.slice(i, i + 3), (index) =>
            vertices.slice(index * 16, index * 16 + 3),
          );
          const edge1 = vec3.subtract(b, a),
            edge2 = vec3.subtract(c, a),
            h = vec3.cross(direction, edge2),
            determinant = vec3.dot(edge1, h);
          if (Math.abs(determinant) < 1e-8) continue;
          const s = vec3.subtract(eye, a),
            u = vec3.dot(s, h) / determinant;
          if (u < 0 || u > 1) continue;
          const q = vec3.cross(s, edge1),
            v = vec3.dot(direction, q) / determinant;
          if (v < 0 || u + v > 1) continue;
          const distance = vec3.dot(edge2, q) / determinant;
          assert.ok(
            distance <= 0 || distance >= 0.999,
            `${mesh.name} 遮住了第 ${step + 1} 级踏步或其上方的人物`,
          );
        }
      }
    }
  }
});
