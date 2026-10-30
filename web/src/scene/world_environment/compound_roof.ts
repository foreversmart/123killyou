import { Builder, materials as M } from '@/scene/geometry/builder';
import type { Shape } from '@/scene/geometry/primitives';
import type { V3 } from '@/scene/world/types';

// Distant halls use curved roof surfaces rather than thousands of individual
// tiles. The silhouette, hips and raised ridge remain visible from the road.
export function compoundRoof(
  b: Builder,
  x: number,
  z: number,
  width: number,
  depth: number,
  y: number,
  rise = 1.8,
) {
  const g: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const height = (t: number) => y + rise * (1 - t) ** 1.7 + 0.27 * t ** 8;
  const triangle = (a: V3, c: V3, d: V3) => {
    const u = c.map((v, i) => v - a[i]),
      v = d.map((value, i) => value - a[i]);
    let normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (normal[1] < 0) {
      [c, d] = [d, c];
      normal = normal.map((value) => -value);
    }
    const length = Math.hypot(...normal);
    if (length < 1e-6) return;
    const start = g.positions.length / 3;
    for (const p of [a, c, d]) {
      g.positions.push(...p);
      g.normals.push(...normal.map((value) => value / length));
      g.uv.push(p[0] * 0.6, p[2] * 0.6);
    }
    g.indices.push(start, start + 1, start + 2);
  };
  for (const side of [-1, 1]) {
    for (const hip of [false, true]) {
      const point = (t: number, across: number): V3 =>
        hip
          ? [x + side * width * (0.35 + t * 0.15), height(t), z + (across * t * depth) / 2]
          : [x + across * width * (0.35 + t * 0.15), height(t), z + (side * t * depth) / 2];
      for (let row = 0; row < 7; row++) {
        const t = row / 7,
          next = (row + 1) / 7;
        for (let column = 0; column < 8; column++) {
          const u = column / 4 - 1,
            v = (column + 1) / 4 - 1;
          triangle(point(t, u), point(next, u), point(t, v));
          triangle(point(t, v), point(next, u), point(next, v));
        }
      }
    }
  }
  b.add(g, M.roof);
  const underside = {
    ...g,
    positions: g.positions.map((value, i) => value - (i % 3 === 1 ? 0.18 : 0)),
    normals: g.normals.map((value) => -value),
    indices: g.indices.map((_, i, all) => all[i - (i % 3) + (2 - (i % 3))]),
  };
  b.add(underside, M.darkWood);
  for (const side of [-1, 1]) {
    b.rod(
      [x - width / 2, height(1) - 0.06, z + (side * depth) / 2],
      [x + width / 2, height(1) - 0.06, z + (side * depth) / 2],
      0.11,
      M.roof,
    );
    b.rod(
      [x + (side * width) / 2, height(1) - 0.06, z - depth / 2],
      [x + (side * width) / 2, height(1) - 0.06, z + depth / 2],
      0.11,
      M.roof,
    );
    b.rod(
      [x + side * width * 0.32, y + rise + 0.12, z],
      [x + side * width * 0.39, y + rise + 0.46, z],
      0.13,
      M.roof,
      0.08,
    );
  }
  b.rod(
    [x - width * 0.35, y + rise + 0.12, z],
    [x + width * 0.35, y + rise + 0.12, z],
    0.15,
    M.roof,
  );
}
