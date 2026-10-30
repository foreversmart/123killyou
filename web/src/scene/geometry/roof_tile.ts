import type { Shape } from '@/scene/geometry/primitives';

/** A fired-clay half tile, including its lip and underside. */
export function roofTile(length: number, concave = false): Shape {
  const g: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const sections = 12,
    sign = concave ? -1 : 1;
  for (let layer = 0; layer < 2; layer++)
    for (const end of [-1, 1])
      for (let i = 0; i <= sections; i++) {
        const a = (i / sections) * Math.PI;
        const radius = 0.108 - layer * 0.016;
        g.positions.push(Math.cos(a) * radius, Math.sin(a) * radius * sign, (end * length) / 2);
        g.normals.push(Math.cos(a) * (layer ? -1 : 1), Math.sin(a) * sign * (layer ? -1 : 1), 0);
        g.uv.push(i / sections, end > 0 ? 1 : 0);
      }
  const n = sections + 1;
  const quad = (a: number, b: number, c: number, d: number) => g.indices.push(a, b, c, b, d, c);
  const edge = (a: number, b: number, c: number, d: number, normal: number[]) => {
    const start = g.positions.length / 3;
    for (const index of [a, b, c, d]) {
      g.positions.push(...g.positions.slice(index * 3, index * 3 + 3));
      g.normals.push(...normal);
      g.uv.push(...g.uv.slice(index * 2, index * 2 + 2));
    }
    quad(start, start + 1, start + 2, start + 3);
  };
  for (let i = 0; i < sections; i++) {
    quad(i, i + 1, i + n, i + n + 1);
    quad(i + 2 * n, i + 3 * n, i + 2 * n + 1, i + 3 * n + 1);
    edge(i, i + 2 * n, i + 1, i + 2 * n + 1, [0, 0, -1]);
    edge(i + n, i + n + 1, i + 3 * n, i + 3 * n + 1, [0, 0, 1]);
  }
  edge(0, n, 2 * n, 3 * n, [0, -sign, 0]);
  edge(n - 1, 3 * n - 1, 2 * n - 1, 4 * n - 1, [0, -sign, 0]);
  if (concave)
    for (let i = 0; i < g.indices.length; i += 3)
      [g.indices[i + 1], g.indices[i + 2]] = [g.indices[i + 2], g.indices[i + 1]];
  return g;
}
