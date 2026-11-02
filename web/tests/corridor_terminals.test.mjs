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

const { corridor } = await import('../src/scene/world_environment/exterior.ts');

test('东院回廊两端保留通往大殿与偏殿的古朴门楼', () => {
  for (const daylight of [true, false]) {
    const root = corridor(daylight);
    const terminals = root.children.filter((child) => child.name.startsWith('corridor_to_'));
    assert.deepEqual(terminals.map((child) => child.name).sort(), [
      'corridor_to_maha_vira',
      'corridor_to_side_hall',
    ]);
    for (const terminal of terminals) {
      assert.ok(terminal.geometry?.indices.length > 0, terminal.name);
      assert.ok(terminal.children.some((child) => child.name.endsWith('_portal_lantern')));
      const values = terminal.geometry.vertices;
      assert.ok(values.every(Number.isFinite), terminal.name);
    }
  }
});
