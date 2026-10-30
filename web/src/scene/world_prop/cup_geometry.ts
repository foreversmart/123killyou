import type { Shape } from '@/scene/geometry/primitives';

// A moon-shaped wooden half: one flat reading face and one curved face.
export function cupGeometry(): Shape {
  const shape: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const rows = 24,
    columns = 8;
  for (const top of [true, false]) {
    const base = shape.positions.length / 3;
    for (let u = 0; u <= rows; u++)
      for (let v = 0; v <= columns; v++) {
        const angle = (u / rows) * Math.PI,
          across = v / columns;
        shape.positions.push(
          Math.cos(angle) * 0.16,
          top ? Math.sin(angle) * Math.sin(across * Math.PI) * 0.065 : 0,
          Math.sin(angle) * (0.012 + across * 0.09),
        );
        shape.normals.push(0, 0, 0);
        shape.uv.push(u / rows, across);
      }
    for (let u = 0; u < rows; u++)
      for (let v = 0; v < columns; v++) {
        const a = base + u * (columns + 1) + v,
          b = a + columns + 1;
        shape.indices.push(
          ...(top ? [a, b, a + 1, a + 1, b, b + 1] : [a, a + 1, b, a + 1, b + 1, b]),
        );
      }
  }
  for (let i = 0; i < shape.indices.length; i += 3) {
    const [a, b, c] = shape.indices.slice(i, i + 3).map((index) => index * 3);
    const p = shape.positions;
    const u = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
    const v = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    for (const index of [a, b, c])
      n.forEach((value, axis) => {
        shape.normals[index + axis] += value;
      });
  }
  for (let i = 0; i < shape.normals.length; i += 3) {
    const length = Math.hypot(...shape.normals.slice(i, i + 3));
    if (length < 1e-10) shape.normals[i + 1] = i < shape.normals.length / 2 ? 1 : -1;
    else for (let axis = 0; axis < 3; axis++) shape.normals[i + axis] /= length;
  }
  return shape;
}
