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
const { heavenlyKing } = await import('../src/scene/world_environment/guardian_sculpture.ts');

// The renderer reverses normals for back-facing triangles. An inward winding
// therefore creates dark stripes even though the authored normals are right.
function checkSurface(geometry, name) {
  const { vertices, indices } = geometry;
  assert.ok(vertices.every(Number.isFinite), `${name} has finite vertex attributes`);
  for (let offset = 0; offset < indices.length; offset += 3) {
    const ids = Array.from(indices.slice(offset, offset + 3));
    const [a, b, c] = ids.map((id) => vertices.slice(id * 16, id * 16 + 3));
    const ab = b.map((value, axis) => value - a[axis]);
    const ac = c.map((value, axis) => value - a[axis]);
    const face = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    const area = Math.hypot(...face);
    // Shared sphere and rotational primitives repeat their poles.
    if (area < 1e-10) continue;
    const alignment =
      face.reduce((sum, value, axis) => {
        const normal = ids.reduce((total, id) => total + vertices[id * 16 + 3 + axis], 0) / 3;
        return sum + value * normal;
      }, 0) / area;
    assert.ok(alignment > -0.1, `${name} triangle ${offset / 3} has outward winding`);
  }
}

test('四天王的曲线、手指、法器和雕塑表面保持法线与绕序一致', () => {
  for (const kind of ['pipa', 'sword', 'dragon', 'umbrella']) {
    const statue = heavenlyKing([0, 0, 0], kind);
    for (const part of statue.children) checkSurface(part.geometry, `${kind}/${part.name}`);
  }
});
