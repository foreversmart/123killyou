import type { Shape } from '@/scene/geometry/primitives';

// y, half-width, half-depth, forward offset. A continuous cloth surface, not stacked solids.
type Section = [number, number, number, number?];
export function garment(profile: Section[], folds = 0.005, start = 0, end = Math.PI * 2): Shape {
  const g: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const columns = 56,
    rows = (profile.length - 1) * 5;
  const at = (t: number, angle: number): [number, number, number] => {
    const f = Math.max(0, Math.min(profile.length - 1.00001, t * (profile.length - 1)));
    const i = Math.floor(f),
      v = f - i;
    const a = profile[Math.max(0, i - 1)],
      b = profile[i];
    const c = profile[i + 1],
      d = profile[Math.min(profile.length - 1, i + 2)];
    const p = [0, 1, 2, 3].map(
      (j) =>
        0.5 *
        (2 * (b[j] || 0) +
          (-(a[j] || 0) + (c[j] || 0)) * v +
          (2 * (a[j] || 0) - 5 * (b[j] || 0) + 4 * (c[j] || 0) - (d[j] || 0)) * v * v +
          (-(a[j] || 0) + 3 * (b[j] || 0) - 3 * (c[j] || 0) + (d[j] || 0)) * v * v * v),
    );
    const wrinkle =
      folds * (Math.sin(angle * 7 + p[0] * 4) + 0.3 * Math.sin(angle * 17 - p[0] * 8));
    return [Math.sin(angle) * (p[1] + wrinkle), p[0], Math.cos(angle) * (p[2] + wrinkle) + p[3]];
  };
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= columns; i++) {
      const t = j / rows,
        angle = start + (i / columns) * (end - start);
      const p = at(t, angle),
        a = at(t, angle + 0.001),
        b = at(Math.min(1, t + 0.001), angle);
      const c = at(Math.max(0, t - 0.001), angle);
      const u = a.map((v, k) => v - p[k]),
        v = b.map((n, k) => n - c[k]);
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const length = Math.hypot(...n) || 1;
      g.positions.push(...p);
      g.normals.push(...n.map((v) => v / length));
      g.uv.push(i / columns, 1 - t);
      if (j < rows && i < columns) {
        const a = j * (columns + 1) + i,
          b = a + columns + 1;
        g.indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  return g;
}
