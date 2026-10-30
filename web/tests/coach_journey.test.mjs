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
    return nextResolve(specifier, context);
  },
});
const { journeyFrame, roadCenter } = await import('../src/scene/world_vehicle/journey.ts');
const { road } = await import('../src/scene/world_environment/road.ts');
const { cameraMatrix, project } = await import('../src/scene/renderer/frame.ts');
const { roundedBox } = await import('../src/scene/geometry/rounded_box.ts');
const { OPENING_ROAD_DURATION_MS, DEPARTURE_ROAD_DURATION_MS } =
  await import('../src/shared/lib/story_timing.ts');

const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const temple = [-8, 0, -21];

for (const departing of [false, true]) {
  test(`${departing ? '离寺' : '入寺'}大巴朝实际行进方向行驶、保持车道，镜头由近及远且完整保留车身`, () => {
    const duration = (departing ? DEPARTURE_ROAD_DURATION_MS : OPENING_ROAD_DURATION_MS) / 1000;
    assert.ok(duration >= 10);
    let previous = journeyFrame(0, departing);
    for (let t = 0.25; t <= duration; t += 0.25) {
      const frame = journeyFrame(t, departing);
      const movement = frame.position.map((v, i) => v - previous.position[i]);
      const forwards = [Math.sin(frame.yaw), 0, Math.cos(frame.yaw)];
      const dot = movement.reduce((sum, v, i) => sum + v * forwards[i], 0);
      assert.ok(dot / Math.hypot(...movement) > 0.999, '车头沿弯道前进，不倒着开');
      assert.ok(
        departing
          ? distance(frame.position, temple) > distance(previous.position, temple)
          : distance(frame.position, temple) < distance(previous.position, temple),
      );
      const lane = frame.position[0] - roadCenter(frame.position[2]);
      assert.ok(departing ? lane < -1.4 : lane > 1.4, '两次行车均靠各自行驶方向右侧');
      assert.ok(frame.distance > previous.distance);
      assert.ok(
        distance(frame.camera.eye, frame.position) >
          distance(previous.camera.eye, previous.position),
      );
      assert.ok(frame.camera.eye[1] > previous.camera.eye[1]);
      for (const aspect of [16 / 9, 320 / 740]) {
        const matrix = cameraMatrix(frame.camera, aspect);
        for (const x of [-1.3, 1.3])
          for (const y of [0, 3.35])
            for (const z of [-4.8, 4.8]) {
              const c = Math.cos(frame.yaw),
                s = Math.sin(frame.yaw);
              const corner = [
                frame.position[0] + x * c + z * s,
                y,
                frame.position[2] - x * s + z * c,
              ];
              assert.ok(project(corner, matrix), `t=${t}, aspect=${aspect}: 车身不被裁出画面`);
            }
      }
      previous = frame;
    }
    assert.deepEqual(
      journeyFrame(duration, departing),
      journeyFrame(duration + 30, departing),
      '最后停留不漂移',
    );
    assert.deepEqual(journeyFrame(-1, departing), journeyFrame(0, departing));
  });
}

test('道路场景使用同一行车轨迹更新车身、车轮和摄像机，停留时车轮也停止', () => {
  for (const departing of [false, true]) {
    const camera = { eye: [0, 0, 0], target: [0, 0, 0] };
    const root = road(departing, camera);
    const bus = root.children.find((n) => n.name === 'bus');
    const axles = bus.children.filter((n) => n.name.endsWith('_axle'));
    assert.equal(axles.length, 4);
    bus.animate(5, 0);
    const frame = journeyFrame(5, departing);
    assert.deepEqual(bus.position, frame.position);
    assert.equal(bus.rotation[1], frame.yaw);
    assert.deepEqual(camera, frame.camera);
    for (const axle of axles) {
      assert.ok(axle.children[0].rotation[0] > 0, '前后轮都向前滚动');
      assert.equal(axle.rotation[1], axle.name === 'front_axle' ? frame.steering : 0);
    }
    bus.animate(10, 0);
    const stopped = JSON.stringify([
      bus.position,
      camera,
      axles.map((n) => n.children[0].rotation),
    ]);
    bus.animate(30, 0);
    assert.equal(
      JSON.stringify([bus.position, camera, axles.map((n) => n.children[0].rotation)]),
      stopped,
    );
  }
});

test('客车圆角表面法线有限且朝外，避免车漆黑面和阴影破面', () => {
  for (const g of [roundedBox(2.5, 1.7, 9.6, 0.24), roundedBox(0.035, 1.12, 8.74, 0.017)]) {
    assert.ok(g.positions.every(Number.isFinite));
    assert.ok(g.normals.every(Number.isFinite));
    for (let i = 0; i < g.indices.length; i += 3) {
      const [a, b, c] = g.indices.slice(i, i + 3).map((n) => g.positions.slice(n * 3, n * 3 + 3));
      const u = b.map((v, j) => v - a[j]),
        v = c.map((value, j) => value - a[j]);
      const cross = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ];
      const normal = g.normals.slice(g.indices[i] * 3, g.indices[i] * 3 + 3);
      assert.ok(cross.reduce((sum, value, j) => sum + value * normal[j], 0) >= -1e-8);
    }
  }
});
