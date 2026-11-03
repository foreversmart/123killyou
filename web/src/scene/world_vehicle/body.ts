import { Builder } from '@/scene/geometry/builder';
import { roundedBox } from '@/scene/geometry/rounded_box';
import type { Shape } from '@/scene/geometry/primitives';
import type { Material, V3 } from '@/scene/world/types';

export const finish = {
  paint: { color: 0xd8d5c7, rough: 0.3, metal: 0.18 },
  teal: { color: 0x315c5c, rough: 0.34, metal: 0.2 },
  glass: { color: 0x263e49, rough: 0.12, metal: 0.5 },
  rubber: { color: 0x191d20, rough: 0.85 },
  trim: { color: 0x303638, rough: 0.45, metal: 0.25 },
  chrome: { color: 0xa4adb0, rough: 0.24, metal: 0.85 },
} satisfies Record<string, Material>;

export function panel(
  b: Builder,
  size: V3,
  at: V3,
  material: Material,
  radius = 0.06,
  rotation: V3 = [0, 0, 0],
) {
  b.add(roundedBox(...size, radius), material, at, [1, 1, 1], rotation);
}

// The lower sides really stop at the wheel arches: no solid box intersects
// the tyres. Local +Z is the nose of this 9.6 m, two-axle touring coach.
function skirt(b: Builder, side: number, doorOpen: boolean) {
  const g: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const samples = 240;
  for (let i = 0; i <= samples; i++) {
    const z = -4.64 + (i / samples) * 9.28;
    let lower = 0.49;
    for (const axle of [-2.85, 2.75]) {
      const distance = Math.abs(z - axle);
      if (distance < 0.69) lower = Math.max(lower, 0.57 + Math.sqrt(0.69 ** 2 - distance ** 2));
    }
    for (const y of [lower, 1.52]) {
      g.positions.push(side * 1.246, y, z);
      g.normals.push(side, 0, 0);
      g.uv.push(i / samples, y / 1.52);
    }
    const inDoorway = doorOpen && side === -1 && z > 3.4 && z < 4.4;
    if (i < samples && !inDoorway) {
      const n = i * 2;
      g.indices.push(
        ...(side > 0
          ? [n, n + 1, n + 2, n + 1, n + 3, n + 2]
          : [n, n + 2, n + 1, n + 1, n + 2, n + 3]),
      );
    }
  }
  b.add(g, finish.paint);
  for (const axle of [-2.85, 2.75]) {
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI,
        next = ((i + 1) / 28) * Math.PI;
      b.rod(
        [side * 1.252, 0.57 + Math.sin(a) * 0.69, axle + Math.cos(a) * 0.69],
        [side * 1.252, 0.57 + Math.sin(next) * 0.69, axle + Math.cos(next) * 0.69],
        0.028,
        finish.trim,
      );
    }
  }
}

export function coachBody(b: Builder, doorOpen = false) {
  if (doorOpen) {
    // Build around the entrance instead of placing an open door over the
    // closed, solid coach hull. The recess stays clear all the way to the aisle.
    panel(b, [2.5, 1.7, 8.22], [0, 2.32, -0.69], finish.paint, 0.24);
    panel(b, [2.5, 1.7, 0.38], [0, 2.32, 4.61], finish.paint, 0.1);
    panel(b, [2.5, 0.22, 1.04], [0, 3.06, 3.92], finish.paint, 0.07);
    panel(b, [0.18, 1.7, 1.04], [1.16, 2.32, 3.92], finish.paint, 0.06);
    panel(b, [2.46, 0.24, 8.13], [0, 1.51, -0.675], finish.teal, 0.09);
    panel(b, [2.46, 0.24, 0.33], [0, 1.51, 4.575], finish.teal, 0.06);
    panel(b, [0.16, 0.24, 1.02], [1.15, 1.51, 3.91], finish.teal, 0.04);
  } else {
    panel(b, [2.5, 1.7, 9.6], [0, 2.32, 0], finish.paint, 0.24);
    panel(b, [2.46, 0.24, 9.48], [0, 1.51, 0], finish.teal, 0.09);
  }
  b.box([1.88, 0.42, doorOpen ? 7.72 : 8.6], [0, 0.94, doorOpen ? -0.44 : 0], finish.rubber);
  for (const side of [-1, 1]) {
    skirt(b, side, doorOpen);
    const openSide = doorOpen && side === -1;
    const glazingEnd = openSide ? 3.4 : 4.32;
    panel(
      b,
      [0.035, 1.12, glazingEnd + 4.42],
      [side * 1.254, 2.41, (glazingEnd - 4.42) / 2],
      finish.rubber,
      0.017,
    );
    for (let i = 0; i < 7; i++) {
      const z = -3.73 + i * 1.17;
      const end = Math.min(z + 0.55, glazingEnd);
      const start = z - 0.55;
      const width = end - start;
      panel(b, [0.039, 0.99, width], [side * 1.274, 2.42, (end + start) / 2], finish.glass, 0.019);
      // A restrained sun visor and rubber seals break up the continuous glass band.
      b.box([0.012, 0.08, width - 0.05], [side * 1.296, 2.87, (end + start) / 2], finish.trim);
    }
    b.box(
      [0.028, 0.038, openSide ? 7.88 : 8.92],
      [side * 1.265, 1.76, openSide ? -0.54 : -0.02],
      finish.chrome,
    );
    for (const z of [-1.56, -0.12, 1.3]) {
      panel(b, [0.022, 0.62, 1.35], [side * 1.26, 0.92, z], finish.trim, 0.01);
      panel(b, [0.027, 0.59, 1.32], [side * 1.278, 0.93, z], finish.paint, 0.013);
      b.box([0.035, 0.045, 0.21], [side * 1.3, 1.12, z], finish.chrome);
    }
    for (const z of [-4.28, -1.9, 1.8, 4.37])
      panel(
        b,
        [0.045, 0.06, 0.13],
        [side * 1.27, 1.4, z],
        { color: 0xd88828, rough: 0.3, glow: 0.15 },
        0.02,
      );
  }
  // Slightly raked, wrapped windshield; a separate rear screen and engine cover.
  panel(b, [2.22, 1.34, 0.13], [0, 2.37, 4.81], finish.rubber, 0.06, [-0.08, 0, 0]);
  panel(b, [2.1, 1.21, 0.13], [0, 2.38, 4.865], finish.glass, 0.06, [-0.08, 0, 0]);
  panel(b, [2.22, 0.93, 0.1], [0, 2.46, -4.72], finish.rubber, 0.045);
  panel(b, [2.08, 0.8, 0.11], [0, 2.47, -4.76], finish.glass, 0.05);
  for (const end of [-1, 1]) {
    panel(b, [2.47, 0.94, 0.32], [0, 1.04, end * 4.61], finish.paint, 0.14);
    panel(b, [2.46, 0.25, 0.37], [0, 0.6, end * 4.62], finish.teal, 0.11);
    panel(b, [2.1, 0.055, 0.04], [0, 0.78, end * 4.81], finish.chrome, 0.02);
  }
  panel(b, [1.63, 0.2, 2.2], [0, 3.2, -0.55], finish.paint, 0.09);
  for (const z of [-0.95, -0.2]) panel(b, [1.1, 0.035, 0.42], [0, 3.31, z], finish.trim, 0.016);
  panel(b, [0.74, 0.055, 0.65], [0, 3.18, 2.25], finish.chrome, 0.026);
}
