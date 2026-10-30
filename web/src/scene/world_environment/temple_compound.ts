import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder } from '@/scene/geometry/primitives';
import { compoundRoof } from '@/scene/world_environment/compound_roof';
import type { V3, WorldNode } from '@/scene/world/types';

const wallPlaster = { ...M.plaster, color: 0xbcbba9 };
const foundation = { ...M.stone, color: 0x72776c };

function wall(b: Builder, from: V3, to: V3, height = 3.2) {
  const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const rotation: V3 = [0, -Math.atan2(to[2] - from[2], to[0] - from[0]), 0];
  const center: V3 = [(from[0] + to[0]) / 2, from[1], (from[2] + to[2]) / 2];
  b.box(
    [length, height, 0.68],
    [center[0], center[1] + height / 2, center[2]],
    wallPlaster,
    rotation,
  );
  b.box([length + 0.1, 0.7, 0.84], [center[0], center[1] + 0.26, center[2]], foundation, rotation);
  b.box(
    [length + 0.18, 0.15, 0.86],
    [center[0], center[1] + height - 0.13, center[2]],
    M.roof,
    rotation,
  );
  // Two low pitched caps read as a continuous tiled wall crown.
  for (const side of [-1, 1]) {
    const nx = Math.sin(rotation[1]),
      nz = Math.cos(rotation[1]);
    b.box(
      [length + 0.22, 0.13, 0.57],
      [center[0] + nx * side * 0.23, center[1] + height + 0.04, center[2] + nz * side * 0.23],
      M.roof,
      [side * 0.4, rotation[1], 0],
    );
  }
  for (let distance = 0; distance <= length; distance += 5.5) {
    const t = distance / length,
      x = from[0] + (to[0] - from[0]) * t,
      z = from[2] + (to[2] - from[2]) * t;
    b.box([0.78, height + 0.08, 0.83], [x, from[1] + height / 2, z], wallPlaster, rotation);
    b.box([0.9, 0.14, 1.03], [x, from[1] + height + 0.14, z], M.roof, rotation);
  }
}

function hall(
  b: Builder,
  x: number,
  z: number,
  width: number,
  depth: number,
  base: number,
  tall = false,
) {
  const eave = base + (tall ? 5.3 : 3.8);
  b.box([width + 1.8, 0.95, depth + 1.9], [x, base - 0.415, z], foundation);
  b.box(
    [width - 0.5, eave - base - 0.35, depth - 1.8],
    [x, (eave + base) / 2 - 0.2, z - 0.5],
    wallPlaster,
  );
  const front = z + depth / 2 - 0.72;
  b.box(
    [width - 1, eave - base - 0.65, 0.14],
    [x, (eave + base) / 2 - 0.22, front - 0.3],
    M.darkWood,
  );
  const bays = tall ? 6 : 4;
  for (let i = 0; i <= bays; i++) {
    const px = x - width / 2 + (width * i) / bays;
    b.add(cylinder(0.17, 0.21, eave - base, 12), M.redWood, [px, (eave + base) / 2, front + 0.32]);
    b.box([0.5, 0.3, 0.55], [px, base + 0.05, front + 0.32], M.stone);
    b.box([0.75, 0.19, 0.9], [px, eave - 0.13, front + 0.25], M.redWood);
    if (i === bays) continue;
    const mid = px + width / bays / 2;
    for (let slat = -2; slat <= 2; slat++)
      b.box([0.06, 2.1, 0.12], [mid + slat * 0.24, base + 1.6, front - 0.18], M.redWood);
    b.box([width / bays - 0.16, 0.12, 0.2], [mid, base + 2.7, front - 0.16], M.redWood);
  }
  b.box([width + 0.4, 0.27, 0.36], [x, eave - 0.22, front + 0.3], M.redWood);
  compoundRoof(b, x, z, width + 2.4, depth + 2.8, eave, tall ? 2.4 : 1.6);
  if (tall) compoundRoof(b, x, z, width + 0.6, depth + 0.8, eave + 1.6, 1.9);
  for (let step = 0; step < 4; step++)
    b.box(
      [Math.min(width - 1, 7), 0.16, 1.8 - step * 0.35],
      [x, base - 0.55 + step * 0.16, z + depth / 2 + 0.9 - step * 0.17],
      M.stone,
    );
}

function pavilion(b: Builder, x: number, z: number) {
  b.box([5.8, 0.75, 5.8], [x, 0.24, z], foundation);
  for (const px of [-2, 2])
    for (const pz of [-2, 2]) b.add(cylinder(0.16, 0.2, 5, 12), M.redWood, [x + px, 3.1, z + pz]);
  compoundRoof(b, x, z, 6.4, 6.4, 4.1, 1.7);
  compoundRoof(b, x, z, 5.6, 5.6, 6, 1.7);
  b.box([4, 1.5, 4], [x, 5.4, z], M.darkWood);
  for (const side of [-1, 1]) b.box([4.5, 0.15, 0.16], [x, 1.7, z + side * 2.1], M.redWood);
}

export function templeCompound(): WorldNode {
  const b = new Builder();
  // A complete enclosure, broad forecourt and two successive courtyards make
  // the gate part of a hillside monastery rather than a standalone facade.
  b.box([64, 0.26, 60], [0, -0.2, -32], { ...M.stone, color: 0x8c8d79 });
  b.box([41, 0.18, 17], [0, -0.15, 6.6], foundation);
  for (const side of [-1, 1]) {
    wall(b, [side * 7.05, 0, -2.4], [side * 32, 0, -2.4]);
    wall(b, [side * 32, 0, -2.4], [side * 32, 0, -62]);
    pavilion(b, side * 24, -9);
    hall(b, side * 22, -28, 10, 18, 0.45);
    hall(b, side * 22, -49, 10, 12, 1.1);
    wall(b, [side * 8, 0, -37], [side * 16, 0, -37], 2.5);
    // The raised rear courtyard sits on a masonry terrace.
    b.box([22, 1.05, 20], [side * 21, 0.35, -51], foundation);
  }
  wall(b, [-32, 0, -62], [32, 0, -62], 3.5);
  b.box([21, 1.05, 22], [0, 0.35, -51], foundation);
  for (const z of [-10, -17, -24, -31, -38, -44])
    b.box([7, 0.1, 6.7], [0, z < -38 ? 0.93 : -0.02, z], { ...M.stone, color: 0x9b9b89 });
  hall(b, 0, -23, 16, 9, 0.65);
  hall(b, 0, -51, 21, 13, 1.45, true);
  for (let step = 0; step < 6; step++)
    b.box([8, 0.16, 2.5 - step * 0.34], [0, step * 0.16, -39 - step * 0.17], M.stone);
  return b.mesh('temple_compound');
}
