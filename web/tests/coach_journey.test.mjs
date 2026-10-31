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
const { journeyFrame, ARRIVAL_START, JOURNEY_START, JOURNEY_END } =
  await import('../src/scene/world_vehicle/journey.ts');
const { roadSample, roadNearest, ROAD_HALF_WIDTH, ROAD_LENGTH } =
  await import('../src/scene/world_environment/road_path.ts');
const { roadSurface } = await import('../src/scene/world_environment/road_surface.ts');
const { WHEEL_RADIUS } = await import('../src/scene/world_vehicle/coach.ts');
const { road } = await import('../src/scene/world_environment/road.ts');
const { cameraMatrix, project } = await import('../src/scene/renderer/frame.ts');
const { roundedBox } = await import('../src/scene/geometry/rounded_box.ts');
const { OPENING_ROAD_DURATION_MS, DEPARTURE_ROAD_DURATION_MS } =
  await import('../src/shared/lib/story_timing.ts');

const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
function vehiclePoint(frame, [x, y, z]) {
  const c = Math.cos(frame.yaw),
    s = Math.sin(frame.yaw),
    p = Math.cos(frame.pitch),
    q = Math.sin(frame.pitch),
    r = Math.cos(frame.roll || 0),
    v = Math.sin(frame.roll || 0);
  const rx = x * r - y * v,
    ry = x * v + y * r,
    py = ry * p - z * q,
    pz = ry * q + z * p;
  return [
    frame.position[0] + rx * c + pz * s,
    frame.position[1] + py,
    frame.position[2] - rx * s + pz * c,
  ];
}

// Intersect the actual triangulated road, independently of its spline lookup.
const pavement = roadSurface().geometry;
const triangles = [];
for (let i = 0; i < pavement.indices.length; i += 3) {
  const [a, b, c] = Array.from(pavement.indices.slice(i, i + 3), (index) =>
    pavement.vertices.slice(index * 16, index * 16 + 3),
  );
  const determinant = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
  if (Math.abs(determinant) < 1e-7) continue;
  triangles.push({
    a,
    b,
    c,
    determinant,
    minX: Math.min(a[0], b[0], c[0]),
    maxX: Math.max(a[0], b[0], c[0]),
    minZ: Math.min(a[2], b[2], c[2]),
    maxZ: Math.max(a[2], b[2], c[2]),
  });
}
function roadHeight(x, z) {
  let height = -Infinity;
  for (const { a, b, c, determinant, minX, maxX, minZ, maxZ } of triangles) {
    if (x < minX || x > maxX || z < minZ || z > maxZ) continue;
    const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / determinant;
    const v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / determinant;
    if (u >= -1e-5 && v >= -1e-5 && u + v <= 1.00001)
      height = Math.max(height, u * a[1] + v * b[1] + (1 - u - v) * c[1]);
  }
  return height;
}

for (const departing of [false, true]) {
  test(`${departing ? '离寺' : '入寺'}大巴沿盘山路靠右行驶、随坡俯仰，中段横竖屏完整保留车身`, () => {
    const duration = (departing ? DEPARTURE_ROAD_DURATION_MS : OPENING_ROAD_DURATION_MS) / 1000;
    const direction = departing ? -1 : 1;
    assert.ok(duration >= 10);
    let previous = journeyFrame(0, departing),
      travelled = 0,
      pitched = false;
    assert.equal(previous.along, departing ? JOURNEY_END : ARRIVAL_START);
    assert.equal(previous.distance, 0);
    for (let step = 1; step <= 200; step++) {
      const t = (duration * step) / 200,
        frame = journeyFrame(t, departing),
        middle = journeyFrame(t - duration / 400, departing);
      const movement = frame.position.map((v, i) => v - previous.position[i]);
      const dot = movement[0] * Math.sin(middle.yaw) + movement[2] * Math.cos(middle.yaw);
      assert.ok(dot / Math.hypot(movement[0], movement[2]) > 0.998, '车头沿实际行进方向');
      assert.ok((frame.along - previous.along) * direction > 0, '沿路线入寺或离寺');
      const center = roadSample(frame.along),
        offset = frame.position.map((v, i) => v - center.position[i]);
      const right = offset[0] * Math.cos(center.yaw) - offset[2] * Math.sin(center.yaw);
      assert.ok(right * direction > 1.4 && right * direction < 1.9, '按行进方向靠右');
      assert.ok(Math.abs(frame.position[1] - center.position[1]) < 0.35, '车身由轮轴下方路面支承');
      pitched ||= Math.abs(frame.pitch) > 0.04;
      for (const x of [-1.14, 1.14])
        for (const z of [-2.85, 2.75]) {
          const tyre = vehiclePoint(frame, [x, WHEEL_RADIUS + 0.02, z]);
          assert.ok(roadNearest(tyre[0], tyre[2]).distance < ROAD_HALF_WIDTH, '轮胎保持在路面内');
          const clearance = tyre[1] - WHEEL_RADIUS - roadHeight(tyre[0], tyre[2]);
          assert.ok(
            Math.abs(clearance) < 0.1,
            `四轮贴合实际路面：t=${t}, wheel=${x},${z}, gap=${clearance}`,
          );
        }
      travelled += Math.hypot(...movement);
      assert.ok(frame.distance > previous.distance);
      assert.ok(Math.abs(frame.distance - travelled) < 0.18, '车轮按实际三维路程滚动');
      assert.ok(frame.camera.eye.every(Number.isFinite));
      assert.ok(frame.camera.target.every(Number.isFinite));
      // The coach is deliberately staged outside the opening and closing
      // frames. During the middle of the road shot the entire body must still
      // remain readable in both wide and portrait compositions.
      for (const aspect of [16 / 9, 320 / 740]) {
        const matrix = cameraMatrix(frame.camera, aspect);
        if (step >= 40 && step <= 160)
          for (const x of [-1.3, 1.3])
            for (const y of [0, 3.35])
              for (const z of [-4.8, 4.8])
                assert.ok(
                  project(vehiclePoint(frame, [x, y, z]), matrix),
                  `t=${t}, aspect=${aspect}: 中段车身不应被裁出画面`,
                );
      }
      previous = frame;
    }
    assert.ok(pitched, '实际经过有坡度的路段');
    const startFrame = journeyFrame(0, departing);
    const endFrame = journeyFrame(duration, departing);
    for (const aspect of [16 / 9, 320 / 740]) {
      for (const [frame, matrix] of [
        [startFrame, cameraMatrix(startFrame.camera, aspect)],
        [endFrame, cameraMatrix(endFrame.camera, aspect)],
      ])
        assert.equal(
          [-1.3, 1.3].some((x) =>
            [0, 3.35].some((y) =>
              [-4.8, 4.8].some((z) => project(vehiclePoint(frame, [x, y, z]), matrix)),
            ),
          ),
          false,
          '大巴首尾应从画外进入或驶出',
        );
    }
    for (const aspect of [16 / 9, 320 / 740]) {
      const middle = journeyFrame(duration * 0.5, departing);
      const matrix = cameraMatrix(middle.camera, aspect);
      for (const x of [-1.3, 1.3])
        for (const y of [0, 3.35])
          for (const z of [-4.8, 4.8])
            assert.ok(project(vehiclePoint(middle, [x, y, z]), matrix), '中段大巴完整入画');
    }
    assert.equal(previous.along, departing ? JOURNEY_START : JOURNEY_END);
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
    assert.equal(bus.rotation[0], frame.pitch);
    assert.equal(bus.rotation[2], frame.roll);
    assert.deepEqual(camera, frame.camera);
    for (const axle of axles) {
      assert.equal(axle.children[0].rotation[0], frame.distance / WHEEL_RADIUS, '前后轮按行程滚动');
      assert.equal(axle.rotation[1], axle.name === 'front_axle' ? frame.steering : 0);
    }
    const paused = JSON.stringify([
      bus.position,
      bus.rotation,
      camera,
      axles.map((n) => n.children[0].rotation),
    ]);
    bus.animate(5, 0);
    assert.equal(
      JSON.stringify([
        bus.position,
        bus.rotation,
        camera,
        axles.map((n) => n.children[0].rotation),
      ]),
      paused,
      '暂停在同一时间不会积累轮转',
    );
    bus.animate(2, 0);
    bus.animate(5, 0);
    assert.equal(
      JSON.stringify([
        bus.position,
        bus.rotation,
        camera,
        axles.map((n) => n.children[0].rotation),
      ]),
      paused,
      '恢复或回看直接重建同一帧',
    );
    const duration = (departing ? DEPARTURE_ROAD_DURATION_MS : OPENING_ROAD_DURATION_MS) / 1000;
    bus.animate(duration, 0);
    const stopped = JSON.stringify([
      bus.position,
      bus.rotation,
      camera,
      axles.map((n) => n.children[0].rotation),
    ]);
    bus.animate(duration + 30, 0);
    assert.equal(
      JSON.stringify([
        bus.position,
        bus.rotation,
        camera,
        axles.map((n) => n.children[0].rotation),
      ]),
      stopped,
    );
  }
});

test('入寺镜头收尾保持车辆相对机位，避免最后一拍向右急拉', () => {
  const duration = OPENING_ROAD_DURATION_MS / 1000;
  // `progress` is eased, so the final camera handoff is effectively complete
  // by 98% of wall-clock time. Compare inside that settled window so the
  // assertion measures a sudden lateral pull rather than the deliberate
  // establishing-shot move leading into the handoff.
  const previous = journeyFrame(duration * 0.98, false);
  const ending = journeyFrame(duration, false);
  assert.ok(Math.abs(ending.camera.eye[0] - ending.position[0] - 17) < 1e-6);
  assert.ok(Math.abs(ending.camera.eye[2] - ending.position[2] - 23) < 1e-6);
  const previousOffset = previous.camera.eye.map((v, i) => v - previous.position[i]);
  const endingOffset = ending.camera.eye.map((v, i) => v - ending.position[i]);
  assert.ok(
    distance(previousOffset, endingOffset) < 0.05,
    '收尾应保持车辆相对机位，不应额外把镜头拉向右侧',
  );
  assert.deepEqual(ending.camera.target, [0, 45, -55]);
});

test('连续盘山路面在折返弯与两侧车道都有可通行表面', () => {
  assert.ok(pavement.vertices.every(Number.isFinite));
  for (let d = 0.5; d < ROAD_LENGTH - 0.5; d += 4.1)
    for (const lane of [-3.1, 0, 3.1]) {
      const [x, y, z] = roadSample(d, lane).position;
      assert.ok(
        Math.abs(roadHeight(x, z) - y) < 0.04,
        `道路不能在弯道拼接处漏面：distance=${d}, lane=${lane}`,
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
