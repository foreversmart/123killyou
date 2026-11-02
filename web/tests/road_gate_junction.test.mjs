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

const { roadSurface } = await import('../src/scene/world_environment/road_surface.ts');
const { ROAD_LENGTH, ROAD_HALF_WIDTH, roadSample } =
  await import('../src/scene/world_environment/road_path.ts');
const { templeEntrance } = await import('../src/scene/world_environment/temple_entrance.ts');
const { roadForecourt } = await import('../src/scene/world_environment/road_forecourt.ts');

function positions(geometry) {
  return Array.from({ length: geometry.vertices.length / 16 }, (_, index) => [
    geometry.vertices[index * 16],
    geometry.vertices[index * 16 + 1],
    geometry.vertices[index * 16 + 2],
  ]);
}

test('道路过渡在山门台阶前收口，不穿入山门台基', () => {
  const road = positions(roadSurface().geometry);
  const entrance = positions(templeEntrance(true).geometry);
  const entranceMinX = Math.min(...entrance.map(([x]) => x));
  const entranceMaxX = Math.max(...entrance.map(([x]) => x));
  const conflicts = road.filter(
    ([x, y, z]) =>
      x > entranceMinX && x < entranceMaxX && z > -4.2 && z < -0.2 && y < 0.32 && y > -0.08,
  );
  assert.equal(conflicts.length, 0);
  assert.ok(
    road.some(([, , z]) => z > -0.2 && z < 2),
    '道路仍应在台阶前保留连续的到达面',
  );
});

test('前场过渡与山门台阶保持深度间隙，避免两处共面接缝', () => {
  const road = positions(roadSurface().geometry);
  const end = roadSample(ROAD_LENGTH, ROAD_HALF_WIDTH + 0.65).position;
  assert.ok(
    road.some(
      ([x, y, z]) => Math.hypot(x - end[0], z - end[2]) < 0.0001 && Math.abs(y - 0.02) < 0.0001,
    ),
    '前场过渡起点应比主路末端抬高，避免共面竞争',
  );
  const oldGateEdge = road.filter(
    ([, y, z]) => Math.abs(y - 0.12) < 0.0001 && Math.abs(z - 1.3) < 0.0001,
  );
  assert.equal(oldGateEdge.length, 0, '过渡面不应再与第一层台阶的前沿共面');
  assert.ok(
    road.some(([, y, z]) => z > 1.2 && z < 1.5 && y > 0.1 && y < 0.12),
    '前场过渡应在台阶前保留低于台阶顶面的独立高度',
  );
});

function triangleCoverage(geometry) {
  const vertices = positions(geometry);
  return Array.from({ length: geometry.indices.length / 3 }, (_, i) => {
    const [a, b, c] = Array.from(geometry.indices.slice(i * 3, i * 3 + 3), (n) => vertices[n]);
    const area = (b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0]);
    return {
      area,
      contains(x, z) {
        const u = ((x - a[0]) * (c[2] - a[2]) - (z - a[2]) * (c[0] - a[0])) / area;
        const v = ((b[0] - a[0]) * (z - a[2]) - (b[2] - a[2]) * (x - a[0])) / area;
        return u > 1e-6 && v > 1e-6 && u + v < 1 - 1e-6;
      },
    };
  });
}

test('前场和碎石带不折叠，同一点仅由一个三角形覆盖', () => {
  const triangles = triangleCoverage(roadForecourt());
  assert.ok(
    triangles.every(({ area }) => area < -1e-5),
    '所有三角形保持向上且不退化',
  );
  // The former swept apron covered points near (14, 9.25) three times with
  // coplanar triangles, producing the radiating flicker seen during a pan.
  for (let x = -22; x <= 23; x += 0.25)
    for (let z = 1.5; z <= 23; z += 0.25)
      assert.ok(
        triangles.filter((triangle) => triangle.contains(x, z)).length <= 1,
        `前场不能自交或让碎石带重复覆盖：${x}, ${z}`,
      );
  for (const [x, z] of [
    [14, 9.25],
    [12.5, 9.5],
    [11, 9.75],
    [0, 2],
  ])
    assert.equal(triangles.filter((triangle) => triangle.contains(x, z)).length, 1);
});

test('前场沿实际主路边缘收口，不穿入行驶车道', () => {
  const apron = triangleCoverage(roadForecourt());
  for (let d = ROAD_LENGTH - 20; d < ROAD_LENGTH; d += 0.2)
    // The road's outer shoulder and the apron share their boundary. Sample
    // just inside the paved shoulder so a shared edge is not counted as an
    // overlap caused by floating point winding tests.
    for (const lane of [-4.8, 0, 4.8]) {
      const [x, , z] = roadSample(d, lane).position;
      assert.equal(
        apron.filter((triangle) => triangle.contains(x, z)).length,
        0,
        `前场与主路只共边，不覆盖实际车道：${d}, ${lane}`,
      );
    }
});
