import type { Shape } from '@/scene/geometry/primitives';

// Project the edges of a subdivided box onto a rounded core. Flat panels keep
// flat normals; the bevels give painted coachwork a continuous highlight.
export function roundedBox(w: number, h: number, d: number, radius: number): Shape {
  const g: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const half = [w / 2, h / 2, d / 2];
  const r = Math.min(radius, ...half);
  const coordinates = (extent: number) => [
    -extent,
    -extent + r * 0.15,
    -extent + r * 0.5,
    -extent + r,
    extent - r,
    extent - r * 0.5,
    extent - r * 0.15,
    extent,
  ];
  for (let axis = 0; axis < 3; axis++) {
    const a = (axis + 1) % 3,
      b = (axis + 2) % 3;
    for (const sign of [-1, 1]) {
      const base = g.positions.length / 3;
      const u = coordinates(half[a]),
        v = coordinates(half[b]);
      for (let j = 0; j < v.length; j++) {
        for (let i = 0; i < u.length; i++) {
          const p = [0, 0, 0];
          p[axis] = sign * half[axis];
          p[a] = u[i];
          p[b] = v[j];
          const core = p.map((value, k) => Math.max(-half[k] + r, Math.min(half[k] - r, value)));
          const delta = p.map((value, k) => value - core[k]);
          const length = Math.hypot(...delta);
          const normal = delta.map((value) => value / length);
          g.positions.push(...core.map((value, k) => value + normal[k] * r));
          g.normals.push(...normal);
          g.uv.push((u[i] / half[a] + 1) / 2, (1 - v[j] / half[b]) / 2);
          if (i < u.length - 1 && j < v.length - 1) {
            const n = base + j * u.length + i,
              next = n + u.length;
            g.indices.push(
              ...(sign > 0
                ? [n, n + 1, next, n + 1, next + 1, next]
                : [n, next, n + 1, n + 1, next, next + 1]),
            );
          }
        }
      }
    }
  }
  return g;
}
