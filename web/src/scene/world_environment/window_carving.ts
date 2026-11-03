import { Builder } from '@/scene/geometry/builder';
import { torus } from '@/scene/geometry/primitives';
import type { Material } from '@/scene/world/types';

type Point = readonly [number, number];

const recess: Material = { color: 0x262522, rough: 0.98, pattern: 1 };
const timber: Material = { color: 0x443e35, rough: 0.9, pattern: 1 };
const carving: Material = { color: 0x625a4e, rough: 0.91, pattern: 1 };
const edge: Material = { color: 0x827969, rough: 0.86, pattern: 1 };
const shadow: Material = { color: 0x302d28, rough: 0.96, pattern: 1 };

/** Centred, solid shutter: two round seals and a square knot above a deep recess. */
export function carvedWindowPanel(b: Builder, width: number, height: number, distant = false) {
  const w = Math.max(0.12, width);
  const h = Math.max(0.24, height);
  const t = Math.min(w * 0.027, h * 0.012);
  b.box([w, h, 0.045], [0, 0, -0.03], recess);

  const stroke = (points: readonly Point[], thickness = t, z = 0.025) => {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        c = points[i];
      const length = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (length < 0.00001) continue;
      const angle = Math.atan2(c[1] - a[1], c[0] - a[0]);
      const x = (a[0] + c[0]) / 2,
        y = (a[1] + c[1]) / 2;
      if (!distant)
        b.box([length + thickness, thickness * 1.55, 0.025], [x, y, z - 0.022], shadow, [
          0,
          0,
          angle,
        ]);
      b.box([length + thickness * 0.22, thickness, 0.028], [x, y, z], carving, [0, 0, angle]);
      if (!distant)
        b.box(
          [length, thickness * 0.24, 0.009],
          [
            x - Math.sin(angle) * thickness * 0.28,
            y + Math.cos(angle) * thickness * 0.28,
            z + 0.017,
          ],
          edge,
          [0, 0, angle],
        );
    }
  };
  const rectangle = (x: number, y: number, rw: number, rh: number, thickness = t) =>
    stroke(
      [
        [x - rw / 2, y - rh / 2],
        [x + rw / 2, y - rh / 2],
        [x + rw / 2, y + rh / 2],
        [x - rw / 2, y + rh / 2],
        [x - rw / 2, y - rh / 2],
      ],
      thickness,
    );

  // A broad rail has a narrow worn arris and a second sunken inner molding.
  for (const side of [-1, 1]) {
    b.box([w * 0.065, h, 0.075], [side * w * 0.4675, 0, 0.03], timber);
    b.box([w, h * 0.035, 0.075], [0, side * h * 0.4825, 0.03], timber);
    if (!distant) {
      b.box([t * 0.5, h * 0.935, 0.014], [side * w * 0.438, 0, 0.068], edge);
      b.box([w * 0.89, t * 0.5, 0.014], [0, side * h * 0.466, 0.068], edge);
    }
  }
  if (distant) {
    // At compound scale the frame, paired seals and square knot carry the
    // identity. Keep only their silhouettes instead of subpixel fretwork.
    const radius = Math.min(w * 0.245, h * 0.135);
    for (const side of [-1, 1]) {
      const cy = side * h * 0.285;
      b.add(torus(radius, t * 0.7, 10), carving, [0, cy, 0.029], [1, 1, 1], [Math.PI / 2, 0, 0]);
      stroke(
        [
          [-radius * 0.62, cy],
          [radius * 0.62, cy],
        ],
        t * 1.05,
      );
      stroke(
        [
          [0, cy - radius * 0.65],
          [0, cy + radius * 0.65],
        ],
        t * 1.05,
      );
    }
    const knot = Math.min(w * 0.23, h * 0.115);
    rectangle(0, 0, knot * 1.5, knot * 1.5, t * 1.1);
    stroke(
      [
        [-knot * 0.42, 0],
        [knot * 0.42, 0],
      ],
      t * 1.1,
    );
    stroke(
      [
        [0, -knot * 0.42],
        [0, knot * 0.42],
      ],
      t * 1.1,
    );
    return;
  }
  rectangle(0, 0, w * 0.815, h * 0.895, t * 0.75);

  // Continuous right-angle fret borders, with a hooked return inside each cell.
  const count = Math.max(3, Math.round((h / w) * 1.5));
  const cellH = (h * 0.85) / count;
  for (const side of [-1, 1]) {
    const x = side * w * 0.345;
    for (let row = 0; row < count; row++) {
      const y = -h * 0.425 + (row + 0.5) * cellH;
      const step = w * 0.081;
      stroke(
        [
          [x + (side * step) / 2, y - cellH * 0.4],
          [x - (side * step) / 2, y - cellH * 0.4],
          [x - (side * step) / 2, y + cellH * 0.3],
          [x + (side * step) / 2, y + cellH * 0.3],
          [x + (side * step) / 2, y - cellH * 0.04],
          [x, y - cellH * 0.04],
        ],
        t * (distant ? 0.9 : 0.67),
      );
    }
  }

  const radius = Math.min(w * 0.245, h * 0.135);
  for (const side of [-1, 1]) {
    const cy = side * h * 0.285;
    medallion(b, cy, radius, t, distant, stroke);
    // Square-ended arms connect each circular seal to the surrounding fretwork.
    for (const direction of [-1, 1]) {
      const x = direction * radius;
      stroke(
        [
          [x, cy],
          [direction * w * 0.285, cy],
          [direction * w * 0.285, cy + side * radius * 0.7],
          [direction * w * 0.2, cy + side * radius * 0.7],
          [direction * w * 0.2, cy + side * radius * 0.42],
        ],
        t * 0.8,
      );
    }
  }

  const knot = Math.min(w * 0.23, h * 0.115);
  rectangle(0, 0, knot * 1.1, knot * 1.1, t * 1.05);
  rectangle(0, 0, knot * 0.55, knot * 0.55, t * 0.7);
  // Four interlocking angular petals give the middle a square flower, not an X.
  const petal: Point[] = [
    [-0.18, 0.26],
    [-0.18, 0.64],
    [-0.6, 0.64],
    [-0.6, 1.02],
    [0.6, 1.02],
    [0.6, 0.64],
    [0.18, 0.64],
    [0.18, 0.26],
  ];
  for (let quarter = 0; quarter < 4; quarter++) {
    const angle = (quarter * Math.PI) / 2;
    stroke(
      petal.map(([x, y]): Point => [
        (x * Math.cos(angle) - y * Math.sin(angle)) * knot,
        (x * Math.sin(angle) + y * Math.cos(angle)) * knot,
      ]),
      t * 0.9,
    );
  }
  for (const side of [-1, 1]) {
    const y = side * h * 0.145;
    stroke(
      [
        [-w * 0.25, y],
        [-w * 0.12, y],
        [-w * 0.12, y + side * t * 3],
        [w * 0.12, y + side * t * 3],
        [w * 0.12, y],
        [w * 0.25, y],
      ],
      t * 0.75,
    );
    if (!distant) {
      const top = side * h * 0.414;
      stroke(
        [
          [-w * 0.25, top],
          [-w * 0.25, top - side * h * 0.035],
          [-w * 0.08, top - side * h * 0.035],
          [-w * 0.08, top],
          [w * 0.08, top],
          [w * 0.08, top - side * h * 0.035],
          [w * 0.25, top - side * h * 0.035],
          [w * 0.25, top],
        ],
        t * 0.7,
      );
    }
  }
}

type Stroke = (points: readonly Point[], thickness?: number, z?: number) => void;

/** Stylised round longevity knot: doubled ring, horizontal bars and hooked stems. */
function medallion(
  b: Builder,
  y: number,
  radius: number,
  t: number,
  distant: boolean,
  stroke: Stroke,
) {
  b.add(
    torus(radius, t * 0.58, distant ? 16 : 32),
    carving,
    [0, y, 0.029],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
  );
  if (!distant)
    b.add(torus(radius * 0.8, t * 0.32, 28), edge, [0, y, 0.03], [1, 1, 1], [Math.PI / 2, 0, 0]);
  const line = (points: Point[], thickness = t * 0.78) =>
    stroke(
      points.map(([x, py]): Point => [x * radius, y + py * radius]),
      thickness,
      0.037,
    );
  line([
    [-0.57, 0.33],
    [0.57, 0.33],
  ]);
  line([
    [-0.67, 0],
    [0.67, 0],
  ]);
  line([
    [-0.52, -0.32],
    [0.52, -0.32],
  ]);
  line([
    [0, 0.72],
    [0, -0.65],
    [-0.24, -0.65],
  ]);
  line([
    [-0.4, 0.56],
    [-0.4, 0.34],
    [-0.2, 0.34],
    [-0.2, -0.13],
    [-0.52, -0.13],
  ]);
  line([
    [0.4, 0.56],
    [0.4, 0.34],
    [0.2, 0.34],
    [0.2, -0.13],
    [0.52, -0.13],
  ]);
  line([
    [-0.4, -0.32],
    [-0.4, -0.56],
    [-0.24, -0.56],
  ]);
  line([
    [0.4, -0.32],
    [0.4, -0.56],
    [0.24, -0.56],
  ]);
}
