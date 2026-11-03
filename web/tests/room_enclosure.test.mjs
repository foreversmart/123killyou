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

const { roomShell } = await import('../src/scene/world_environment/room_shell.ts');
const { Builder } = await import('../src/scene/geometry/builder.ts');
const { corridor } = await import('../src/scene/world_environment/exterior.ts');

test('客房壳体在转身方向闭合到后墙和天花板', () => {
  const b = new Builder();
  roomShell(b, false);
  const geometry = b.build();
  const { min, max } = depthBounds(geometry.vertices);
  assert.ok(max > 5, '后墙延伸到房间后方');
  assert.ok(min < -4, '门墙保留在前方');
});

test('偏房回廊另一端接入有墙体和屋顶的偏殿空间', () => {
  const root = corridor(false);
  const portal = root.children.find((child) => child.name === 'corridor_to_side_hall');
  assert.ok(portal);
  const vertices = portal.geometry?.vertices || new Float32Array();
  const { min, max } = depthBounds(vertices);
  assert.ok(max > 10.5, '偏殿后墙封住天空缺口');
  assert.ok(min < 7, '偏殿从门楼后开始');
});

function depthBounds(vertices) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 2; i < vertices.length; i += 16) {
    min = Math.min(min, vertices[i]);
    max = Math.max(max, vertices[i]);
  }
  return { min, max };
}
