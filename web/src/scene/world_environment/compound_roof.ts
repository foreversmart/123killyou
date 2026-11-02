import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder, type Shape } from '@/scene/geometry/primitives';
import type { Material, V3 } from '@/scene/world/types';
import { cloudScroll } from '@/scene/world_environment/temple_ornament';
import { templeGold, templeJade, templeRed } from '@/scene/world_environment/temple_palette';

// Glazed roof tile picks up a blue-green patina in the references; the deep
// red fascia keeps the roofline legible against the smoke-dark interior.
const slate = { ...M.roof, color: 0x3f5553, rough: 0.68 };
const fascia = templeRed;

function triangle(g: Shape, a: V3, b: V3, c: V3, underside = false) {
  const u = b.map((v, i) => v - a[i]),
    v = c.map((value, i) => value - a[i]);
  let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  if (n[1] < 0 !== underside) {
    [b, c] = [c, b];
    n = n.map((value) => -value);
  }
  const length = Math.hypot(...n);
  if (length < 0.00001) return;
  const start = g.positions.length / 3;
  for (const p of [a, b, c]) {
    g.positions.push(...p);
    g.normals.push(...n.map((value) => value / length));
    g.uv.push(p[0] * 0.65, p[2] * 0.65);
  }
  g.indices.push(start, start + 1, start + 2);
}

/** A curved hip roof with raised roll tiles, exposed rafters and a deep timber soffit. */
export function compoundRoof(
  b: Builder,
  x: number,
  z: number,
  width: number,
  depth: number,
  y: number,
  rise = 1.8,
  distant = false,
) {
  const rod = (a: V3, c: V3, radius: number, material: Material, endRadius = radius) => {
    if (!distant) {
      b.rod(a, c, radius, material, endRadius);
      return;
    }
    const dx = c[0] - a[0],
      dy = c[1] - a[1],
      dz = c[2] - a[2];
    const length = Math.hypot(dx, dy, dz);
    b.add(
      cylinder(endRadius, radius, length, 4),
      material,
      [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2],
      [1, 1, 1],
      [Math.acos(dy / length), Math.atan2(dx, dz), 0],
    );
  };
  const skin: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const under: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const rolls: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const rows = distant ? 4 : 10;
  const arcs = distant ? 2 : 4;
  const tileSpacing = distant ? 0.87 : 0.29;
  const eaveSegments = distant ? 8 : 12;
  const ridge = Math.max(width * 0.23, width / 2 - depth * 0.35);
  const height = (t: number) => y + rise * (1 - t) ** 1.55 + 0.22 * t ** 8;
  const cornerLift = Math.min(0.48, depth * 0.08);
  const point = (side: number, hip: boolean, t: number, u: number): V3 => {
    const roofY = height(t) + cornerLift * t ** 5 * Math.abs(u) ** 6;
    return hip
      ? [x + side * (ridge + (width / 2 - ridge) * t), roofY, z + (u * t * depth) / 2]
      : [x + u * (ridge + (width / 2 - ridge) * t), roofY, z + (side * t * depth) / 2];
  };
  for (const side of [-1, 1]) {
    for (const hip of [false, true]) {
      for (let row = 0; row < rows; row++) {
        const t = row / rows,
          next = (row + 1) / rows;
        for (let col = 0; col < rows; col++) {
          const u = (col * 2) / rows - 1,
            v = ((col + 1) * 2) / rows - 1;
          const a = point(side, hip, t, u),
            c = point(side, hip, next, u),
            d = point(side, hip, t, v),
            e = point(side, hip, next, v);
          triangle(skin, a, c, d);
          triangle(skin, d, c, e);
          const low = (p: V3): V3 => [p[0], p[1] - 0.19, p[2]];
          triangle(under, low(a), low(c), low(d), true);
          triangle(under, low(d), low(c), low(e), true);
        }
      }
      // Real half-round rolls stay visible in backlight instead of looking
      // like stripes painted on an otherwise smooth roof plane.
      const count = Math.max(4, Math.ceil((hip ? depth : width) / tileSpacing));
      for (let col = 0; col <= count; col++) {
        const u = (col / count) * 2 - 1;
        const firstRow = hip ? Math.ceil(rows * 0.3) : 0;
        const start = rolls.positions.length / 3;
        for (let row = firstRow; row <= rows; row++) {
          const t = row / rows;
          const p = point(side, hip, t, u);
          const dy = -rise * 1.55 * Math.max(0, 1 - t) ** 0.55 + 1.76 * t ** 7;
          const run = hip ? width / 2 - ridge : depth / 2;
          const len = Math.hypot(dy, run);
          const normal = hip
            ? [(-side * dy) / len, run / len, 0]
            : [0, run / len, (-side * dy) / len];
          for (let arc = 0; arc <= arcs; arc++) {
            const angle = (arc * Math.PI) / arcs;
            const along = Math.cos(angle),
              up = Math.sin(angle);
            rolls.positions.push(
              p[0] + (hip ? 0 : along * 0.075) + normal[0] * up * 0.062,
              p[1] + 0.014 + normal[1] * up * 0.062,
              p[2] + (hip ? along * 0.075 : 0) + normal[2] * up * 0.062,
            );
            rolls.normals.push(
              (hip ? 0 : along) + normal[0] * up,
              normal[1] * up,
              (hip ? along : 0) + normal[2] * up,
            );
            rolls.uv.push(arc / arcs, t);
          }
        }
        for (let row = 0; row < rows - firstRow; row++)
          for (let arc = 0; arc < arcs; arc++) {
            const a = start + row * (arcs + 1) + arc,
              c = a + arcs + 1;
            if (side > 0 === hip) rolls.indices.push(a, c, a + 1, a + 1, c, c + 1);
            else rolls.indices.push(a, a + 1, c, a + 1, c + 1, c);
          }
      }
    }
  }
  b.add(skin, { ...slate, color: 0x4d6462 });
  b.add(under, fascia);
  b.add(rolls, slate);
  for (const side of [-1, 1]) {
    const eaveY = height(1) - 0.14;
    // Raised corners carry all three fascia bands, rather than floating above
    // a straight box. Gold drip beads trace the roof's carved silhouette.
    for (const hip of [false, true])
      for (let i = 0; i < eaveSegments; i++) {
        const a = point(side, hip, 1, -1 + (i * 2) / eaveSegments);
        const c = point(side, hip, 1, -1 + ((i + 1) * 2) / eaveSegments);
        for (const [offset, radius, material] of [
          [-0.1, 0.11, fascia],
          [-0.18, 0.055, templeGold],
          [-0.26, 0.06, templeJade],
        ] as const)
          rod([a[0], a[1] + offset, a[2]], [c[0], c[1] + offset, c[2]], radius, material);
      }
    for (let offset = -width / 2 + 0.16; offset < width / 2; offset += distant ? 0.84 : 0.42)
      b.box(
        [0.09, 0.13, Math.min(1.3, depth * 0.23)],
        [x + offset, eaveY - 0.14, z + side * (depth / 2 - Math.min(0.54, depth * 0.09))],
        templeJade,
        [side * 0.15, 0, 0],
      );
    for (const across of [-1, 1]) {
      for (let step = 0; step < rows; step++) {
        const a = point(side, false, step / rows, across),
          c = point(side, false, (step + 1) / rows, across);
        rod([a[0], a[1] + 0.08, a[2]], [c[0], c[1] + 0.08, c[2]], 0.105, slate);
      }
      rod(
        [x + across * width * 0.5, eaveY + cornerLift + 0.22, z + side * depth * 0.5],
        [
          x + across * (width * 0.5 + 0.28),
          eaveY + cornerLift + 0.7,
          z + side * (depth * 0.5 + 0.2),
        ],
        0.09,
        templeGold,
        0.045,
      );
      if (!distant && width > 10 && depth > 8)
        cloudScroll(
          b,
          [x + across * (width * 0.5 - 0.12), eaveY + cornerLift + 0.23, z + side * depth * 0.5],
          0.28,
          side < 0 ? Math.PI : 0,
        );
    }
  }
  b.box([ridge * 2 + 0.35, 0.22, 0.25], [x, y + rise + 0.1, z], slate);
  rod([x - ridge - 0.2, y + rise + 0.24, z], [x + ridge + 0.2, y + rise + 0.24, z], 0.09, slate);
  for (const side of [-1, 1]) {
    b.box([0.16, 0.44, 0.23], [x + side * (ridge + 0.17), y + rise + 0.36, z], templeGold, [
      0,
      0,
      -side * 0.18,
    ]);
    if (!distant && width > 10 && depth > 8)
      cloudScroll(b, [x + side * (ridge - 0.08), y + rise + 0.24, z], 0.44);
  }
}
