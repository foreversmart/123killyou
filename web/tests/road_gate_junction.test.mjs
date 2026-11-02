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
const { templeEntrance } = await import('../src/scene/world_environment/temple_entrance.ts');

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
