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

const { templeAxis, templeLayout } =
  await import('../src/scene/world_environment/temple_layout.ts');
const { templeCompound } = await import('../src/scene/world_environment/temple_compound.ts');

test('寺院平面遵循南向中轴并把服务院落放在东西两翼', () => {
  const byId = new Map(templeLayout.map((building) => [building.id, building]));
  assert.equal(byId.size, templeLayout.length);
  assert.deepEqual(
    templeAxis.slice(1).map((id) => byId.get(id)?.label),
    ['天王殿', '大雄宝殿', '藏经楼'],
  );
  assert.ok(byId.get('bell_tower').x < 0);
  assert.ok(byId.get('drum_tower').x > 0);
  assert.ok(byId.get('guest_courtyard').x < 0);
  assert.ok(byId.get('guest_hall').x < 0);
  assert.ok(byId.get('refectory').x > 0);
  assert.ok(byId.get('monk_quarters').x > 0);
  assert.equal(byId.get('toilet_block').label, '净房');
  assert.ok(byId.get('abbot_quarters').z < byId.get('sutra_library').z);
});

test('渲染寺院保留一个合并建筑网格并挂载可寻址的建筑节点', () => {
  const compound = templeCompound();
  assert.ok(compound.geometry?.indices.length > 0);
  const markers = new Map(compound.children.map((child) => [child.name, child]));
  for (const building of templeLayout) {
    const marker = markers.get(building.id);
    assert.ok(marker, building.id);
    assert.deepEqual(marker.position, [building.x, building.base, building.z]);
    assert.equal(marker.geometry, undefined);
  }
  const values = compound.geometry.vertices;
  assert.ok(values.every(Number.isFinite));
});
