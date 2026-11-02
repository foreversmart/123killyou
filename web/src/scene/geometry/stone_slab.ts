import type { Shape } from '@/scene/geometry/primitives';

/** A low-poly dressed slab: the bevel catches light without rounding the paving. */
export function stoneSlab(width: number, depth: number, height = 0.08): Shape {
  const shape: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const bevel = Math.min(0.018, height * 0.22);
  const corners = (inset: number, y: number) => [
    [-width / 2 + inset, y, -depth / 2 + inset],
    [-width / 2 + inset, y, depth / 2 - inset],
    [width / 2 - inset, y, depth / 2 - inset],
    [width / 2 - inset, y, -depth / 2 + inset],
  ];
  const top = corners(bevel, height / 2);
  const rim = corners(0, height / 2 - bevel);
  const bottom = corners(0, -height / 2);
  const quad = (points: number[][], normal: number[]) => {
    const start = shape.positions.length / 3;
    points.forEach((point) => {
      shape.positions.push(...point);
      shape.normals.push(...normal);
      shape.uv.push(point[0] / width + 0.5, point[2] / depth + 0.5);
    });
    shape.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  };
  quad(top, [0, 1, 0]);
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    const nx = i === 0 ? -1 : i === 2 ? 1 : 0;
    const nz = i === 1 ? 1 : i === 3 ? -1 : 0;
    quad(
      [top[i], rim[i], rim[next], top[next]],
      [nx * Math.SQRT1_2, Math.SQRT1_2, nz * Math.SQRT1_2],
    );
    quad([rim[i], bottom[i], bottom[next], rim[next]], [nx, 0, nz]);
  }
  return shape;
}
