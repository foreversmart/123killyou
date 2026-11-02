import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { vec3 } from 'wgpu-matrix';

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

const { cameraMatrix, shadowMatrix, SHADOW_MAP_SIZE } =
  await import('../src/scene/renderer/frame.ts');
const { sceneLighting } = await import('../src/scene/world/lighting.ts');
const { journeyFrame } = await import('../src/scene/world_vehicle/journey.ts');
const game = { sceneKey: 'mini_arrival', flags: {} };

test('远景能分清厘米级地表，近景仍保留眼前道具', () => {
  const aerial = cameraMatrix({ eye: [0, 50, 0], target: [0, 0, 0.01] }, 1.8);
  const ground = vec3.transformMat4([0, 0, 0], aerial);
  const above = vec3.transformMat4([0, 0.01, 0], aerial);
  assert.ok(
    Math.abs(ground[2] - above[2]) * 2 ** 24 > 30,
    '俯视镜头的1厘米高度差应跨过足够多的24位深度层',
  );
  const close = cameraMatrix({ eye: [0, 1, 5], target: [0, 1, 0] }, 1.8);
  const prop = vec3.transformMat4([0, 1, 4.94], close);
  assert.ok(prop[2] > 0 && prop[2] < 1, '距眼睛6厘米的近景道具仍在裁切范围内');
});

test('阴影中心在光源纹素内移动时保持采样网格不变', () => {
  const lighting = sceneLighting(game, 'road', true);
  const direction = vec3.normalize(lighting.direction);
  const right = vec3.normalize(vec3.cross([0, 1, 0], direction));
  const texel = (lighting.shadowRadius * 2) / SHADOW_MAP_SIZE;
  const origin = shadowMatrix(lighting, [0, 0, 0]);
  const moved = shadowMatrix(lighting, [...vec3.mulScalar(right, texel * 0.2)]);
  const crossed = shadowMatrix(lighting, [...vec3.mulScalar(right, texel * 1.2)]);
  const point = [4, 2, 5];
  const a = vec3.transformMat4(point, origin);
  const b = vec3.transformMat4(point, moved);
  const c = vec3.transformMat4(point, crossed);
  assert.ok(Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7);
  assert.ok(Math.abs(Math.abs(c[0] - a[0]) - 2 / SHADOW_MAP_SIZE) < 1e-7);
});

test('整段山路行车的大巴与近旁高处树冠留在阴影体积内', () => {
  const lighting = sceneLighting(game, 'road', true);
  const direction = vec3.normalize(lighting.direction);
  for (const departing of [false, true]) {
    for (let seconds = 0; seconds <= (departing ? 10 : 36); seconds += 0.5) {
      const frame = journeyFrame(seconds, departing);
      const matrix = shadowMatrix(lighting, frame.camera.target);
      for (const point of [
        frame.position,
        vec3.add(frame.position, [8, 12, 6]),
        vec3.add(frame.camera.target, vec3.mulScalar(direction, 35)),
      ]) {
        const p = vec3.transformMat4(point, matrix);
        assert.ok(Math.abs(p[0]) < 0.87 && Math.abs(p[1]) < 0.87, '车辆与树冠在完整阴影区内');
        assert.ok(p[2] > 0 && p[2] < 1, '高处投影物不被阴影近裁面截去');
      }
    }
  }
  assert.equal(sceneLighting(game, 'register', true).shadowRadius, 16);
});
