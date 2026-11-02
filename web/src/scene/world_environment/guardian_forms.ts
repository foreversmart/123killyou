import { Builder } from '@/scene/geometry/builder';
import { sphere, type Shape } from '@/scene/geometry/primitives';
import type { Material, V3 } from '@/scene/world/types';

const rounded = sphere(1, 12, 8);
const largeRounded = sphere(1, 24, 16);
export const sculpt = (b: Builder, p: V3, size: V3, m: Material, r: V3 = [0, 0, 0]) =>
  b.add(Math.max(...size) > 0.16 ? largeRounded : rounded, m, p, size, r);
const normalize = (p: V3): V3 => {
  const length = Math.hypot(...p) || 1;
  return p.map((v) => v / length) as V3;
};

/** Catmull-Rom carved outlines: ribbons and whiskers have a continuous silhouette. */
export function smoothPath(points: V3[], steps = 6): V3[] {
  const path: V3[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(0, i - 1)],
      b = points[i];
    const c = points[i + 1],
      d = points[Math.min(points.length - 1, i + 2)];
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      path.push(
        b.map(
          (v, k) =>
            0.5 *
            (2 * v +
              (-a[k] + c[k]) * t +
              (2 * a[k] - 5 * v + 4 * c[k] - d[k]) * t * t +
              (-a[k] + 3 * v - 3 * c[k] + d[k]) * t * t * t),
        ) as V3,
      );
    }
  }
  path.push(points[points.length - 1]);
  return path;
}

export function tube(b: Builder, points: V3[], radius: number, m: Material, end = radius) {
  const path = smoothPath(points);
  const g: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const sides = radius > 0.03 ? 10 : 7;
  let previousFrame: V3 | undefined;
  let previousRadius = radius;
  path.forEach((p, j) => {
    const before = path[Math.max(0, j - 1)],
      after = path[Math.min(path.length - 1, j + 1)];
    const tangent = normalize(after.map((v, k) => v - before[k]) as V3);
    // Transport the previous ring frame along the curve. Choosing a new axis
    // for each ring twists the forearms and whiskers at steep Z tangents.
    const projection = previousFrame?.reduce((sum, value, k) => sum + value * tangent[k], 0);
    const transported = previousFrame?.map((value, k) => value - tangent[k] * projection!) as
      V3 | undefined;
    const u = normalize(
      transported && Math.hypot(...transported) > 0.01
        ? transported
        : Math.abs(tangent[2]) < 0.9
          ? [-tangent[1], tangent[0], 0]
          : [0, -tangent[2], tangent[1]],
    );
    previousFrame = u;
    const v: V3 = [
      tangent[1] * u[2] - tangent[2] * u[1],
      tangent[2] * u[0] - tangent[0] * u[2],
      tangent[0] * u[1] - tangent[1] * u[0],
    ];
    const desiredRadius = radius + ((end - radius) * j) / (path.length - 1);
    const incoming = p.map((value, k) => value - before[k]) as V3;
    const outgoing = after.map((value, k) => value - p[k]) as V3;
    const inLength = Math.hypot(...incoming),
      outLength = Math.hypot(...outgoing);
    const bend =
      inLength && outLength
        ? Math.acos(
            Math.max(
              -1,
              Math.min(
                1,
                incoming.reduce((sum, value, k) => sum + value * outgoing[k], 0) /
                  (inLength * outLength),
              ),
            ),
          )
        : 0;
    // Fingers and small cloud curls can turn more tightly than a full tube
    // radius. Limit the inner sweep to avoid folded, inverted triangles.
    const curvatureRadius = bend > 0.001 ? (inLength + outLength) / (2 * bend) : Infinity;
    const r = Math.min(
      desiredRadius,
      curvatureRadius * 0.4,
      j === path.length - 1 ? previousRadius : Infinity,
    );
    previousRadius = r;
    for (let k = 0; k <= sides; k++) {
      const angle = (k / sides) * Math.PI * 2;
      const n = u.map((a, axis) => a * Math.cos(angle) + v[axis] * Math.sin(angle));
      g.positions.push(...p.map((a, axis) => a + n[axis] * r));
      g.normals.push(...n);
      g.uv.push(k / sides, j / (path.length - 1));
      if (j < path.length - 1 && k < sides) {
        const id = j * (sides + 1) + k;
        g.indices.push(id, id + 1, id + sides + 1, id + 1, id + sides + 2, id + sides + 1);
      }
    }
  });
  for (const endpoint of [0, path.length - 1]) {
    const neighbour = path[endpoint === 0 ? 1 : path.length - 2];
    const outward = normalize(path[endpoint].map((value, k) => value - neighbour[k]) as V3);
    const base = g.positions.length / 3;
    g.positions.push(...path[endpoint]);
    g.normals.push(...outward);
    g.uv.push(0.5, 0.5);
    for (let k = 0; k <= sides; k++) {
      const index = (endpoint * (sides + 1) + k) * 3;
      g.positions.push(...g.positions.slice(index, index + 3));
      g.normals.push(...outward);
      g.uv.push(
        0.5 + Math.cos((k / sides) * Math.PI * 2) * 0.5,
        0.5 + Math.sin((k / sides) * Math.PI * 2) * 0.5,
      );
      if (k < sides)
        g.indices.push(
          base,
          base + k + (endpoint === 0 ? 2 : 1),
          base + k + (endpoint === 0 ? 1 : 2),
        );
    }
  }
  b.add(g, m);
}

export function ribbon(b: Builder, points: V3[], width: number, m: Material) {
  const path = smoothPath(points, 8);
  const g: Shape = { positions: [], normals: [], uv: [], indices: [] };
  path.forEach((p, j) => {
    const a = path[Math.max(0, j - 1)],
      c = path[Math.min(path.length - 1, j + 1)];
    const n = normalize([-(c[1] - a[1]), c[0] - a[0], 0]);
    const taper = 0.18 + 0.82 * Math.sin(Math.PI * (0.1 + (j / path.length) * 0.8));
    for (const side of [-1, 1]) {
      g.positions.push(
        p[0] + n[0] * width * side * taper,
        p[1] + n[1] * width * side * taper,
        p[2],
      );
      g.normals.push(0, 0, 1);
      g.uv.push((side + 1) / 2, j / path.length);
    }
    if (j < path.length - 1)
      g.indices.push(j * 2, j * 2 + 2, j * 2 + 1, j * 2 + 1, j * 2 + 2, j * 2 + 3);
  });
  b.add(g, m);
  tube(
    b,
    path.filter((_, i) => i % 4 === 0),
    0.009,
    { ...m, color: 0xad8952 },
  );
}

/** A bevelled, solid ornamental plate, specified in its local XY outline. */
export function relief(outline: [number, number][], depth = 0.06): Shape {
  const g: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const add = (p: V3, n: V3) => {
    g.positions.push(...p);
    g.normals.push(...n);
    g.uv.push(p[0] + 0.5, 1 - p[1]);
  };
  for (const face of [-1, 1]) {
    const base = g.positions.length / 3;
    add([0, 0.5, (face * depth) / 2], [0, 0, face]);
    outline.forEach(([x, y]) => add([x, y, (face * depth) / 2], [0, 0, face]));
    for (let i = 0; i < outline.length; i++) {
      const next = (i + 1) % outline.length;
      if (face > 0) g.indices.push(base, base + 1 + i, base + 1 + next);
      else g.indices.push(base, base + 1 + next, base + 1 + i);
    }
  }
  outline.forEach((p, i) => {
    const q = outline[(i + 1) % outline.length];
    const n = normalize([q[1] - p[1], p[0] - q[0], 0]);
    const base = g.positions.length / 3;
    for (const [a, z] of [
      [p, -depth / 2],
      [q, -depth / 2],
      [q, depth / 2],
      [p, depth / 2],
    ] as [[number, number], number][])
      add([a[0], a[1], z], n);
    g.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  return g;
}

export const leafPlate = relief([
  [-0.5, 0],
  [0.5, 0],
  [0.46, 0.6],
  [0, 1],
  [-0.46, 0.6],
]);

export const scalePlate = relief(
  [
    [-0.3, 0],
    [0.3, 0],
    [0.5, 0.16],
    [0.5, 1],
    [-0.5, 1],
    [-0.5, 0.16],
  ],
  0.04,
);
