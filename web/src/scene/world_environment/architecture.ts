import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder, plane } from '@/scene/geometry/primitives';
import { labelTile } from '@/scene/renderer/atlas';
import { doorway } from '@/scene/world_environment/doors';
import type { V3 } from '@/scene/world/types';
import { roofTile } from '@/scene/geometry/roof_tile';

export function plaque(b: Builder, text: string, p: V3, width = 0.24, height = 0.35, yaw = 0) {
  b.box([width + 0.04, height + 0.04, 0.055], [p[0], p[1] + height / 2, p[2] - 0.03], M.darkWood, [
    0,
    yaw,
    0,
  ]);
  b.add(
    plane(width, height),
    { color: 0xffffff, rough: 0.85 },
    p,
    [1, 1, 1],
    [0, yaw, 0],
    labelTile(text),
  );
}

export function floor(b: Builder, width = 12, depth = 12) {
  b.box([width, 0.15, depth], [0, -0.16, -1], M.darkWood);
  for (let x = -width / 2; x < width / 2; x += 0.85)
    for (let z = -depth / 2; z < depth / 2; z += 0.85) {
      const tint = Math.floor(112 + (Math.sin(x * 34 + z * 18) + 1) * 9);
      b.box([0.83, 0.09, 0.83], [x + 0.425, -0.05, z - 1], {
        ...M.stone,
        color: tint * 0x010101 + 0x040400,
      });
    }
}

export function table(b: Builder, p: V3, width = 2.5, depth = 1.1, height = 0.82) {
  for (let i = 0; i < 5; i++)
    b.box(
      [width, 0.1, depth / 5 - 0.006],
      [p[0], p[1] + height, p[2] - depth / 2 + ((i + 0.5) * depth) / 5],
      M.wood,
    );
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      b.box(
        [0.12, height, 0.12],
        [p[0] + x * (width / 2 - 0.14), p[1] + height / 2, p[2] + z * (depth / 2 - 0.1)],
        M.darkWood,
      );
    }
  b.box(
    [width - 0.2, 0.18, 0.08],
    [p[0], p[1] + height - 0.15, p[2] + depth / 2 - 0.1],
    M.darkWood,
  );
}

export function windowLattice(
  b: Builder,
  x: number,
  y: number,
  z: number,
  width = 1.8,
  height = 1.65,
  lit = false,
) {
  b.box([width, height, 0.04], [x, y, z], {
    color: lit ? 0xb4b5a0 : 0x8b958b,
    rough: 1,
    glow: lit ? 0.35 : 0.06,
  });
  for (let i = 0; i <= 6; i++)
    b.box([0.045, height + 0.12, 0.06], [x - width / 2 + (width * i) / 6, y, z + 0.04], M.darkWood);
  for (let i = 0; i <= 5; i++)
    b.box([width, 0.045, 0.06], [x, y - height / 2 + (height * i) / 5, z + 0.05], M.darkWood);
}

export function door(b: Builder, p: V3, label = '门', open = false) {
  doorway(b, p, open);
  plaque(b, label, [p[0], p[1] + 2.61, p[2] + 0.1]);
}

export function roof(b: Builder, x: number, z: number, width: number, depth: number, y: number) {
  for (const side of [-1, 1])
    for (let r = 0; r < 7; r++) {
      const v = r / 7,
        next = (r + 1) / 7;
      const py = y + (1 - v) ** 1.8 * 1.05 + Math.max(0, v - 0.75) * 1.1;
      const ny = y + (1 - next) ** 1.8 * 1.05 + Math.max(0, next - 0.75) * 1.1;
      const dz = depth / 14;
      for (let c = -width / 2; c <= width / 2; c += 0.22) {
        const pitch = side * Math.atan2(py - ny, dz);
        const span = Math.hypot(py - ny, dz) + 0.07;
        const tone = (Math.sin(c * 41 + r * 13) + 1) * 0.5;
        const material = { ...M.roof, color: tone > 0.7 ? 0x535951 : 0x454b46 };
        b.add(
          roofTile(span),
          material,
          [x + c, (py + ny) / 2, z + (side * (v + next) * depth) / 4],
          [1, 1, 1],
          [pitch, 0, 0],
        );
        b.add(
          roofTile(span, true),
          material,
          [x + c + 0.11, (py + ny) / 2 + 0.07, z + (side * (v + next) * depth) / 4],
          [1, 0.45, 1],
          [pitch, 0, 0],
        );
      }
      b.box(
        [width + 0.25, 0.1, dz + 0.06],
        [x, (py + ny) / 2 - 0.05, z + (side * (v + next) * depth) / 4],
        M.roof,
        [side * Math.atan2(py - ny, dz), 0, 0],
      );
    }
  b.rod([x - width / 2 - 0.15, y + 1.1, z], [x + width / 2 + 0.15, y + 1.1, z], 0.13, M.roof);
}

export function roomShell(b: Builder, daylight: boolean) {
  floor(b, 11, 12);
  // Wall openings are real gaps, including the space behind swinging doors.
  for (const [left, right] of [
    [-5, -3.5],
    [-1.3, 1.62],
    [3.18, 5],
  ])
    b.box([right - left, 3.7, 0.25], [(left + right) / 2, 1.85, -4], M.plaster);
  b.box([2.2, 1.05, 0.25], [-2.4, 0.525, -4], M.plaster);
  b.box([2.2, 0.95, 0.25], [-2.4, 3.225, -4], M.plaster);
  b.box([1.56, 1.15, 0.25], [2.4, 3.125, -4], M.plaster);
  for (const x of [-5, 5]) {
    b.box([0.2, 3.7, 8], [x, 1.85, -0.2], M.plaster);
    for (const z of [-4, -1, 2]) b.add(cylinder(0.11, 0.14, 3.7), M.darkWood, [x * 0.98, 1.85, z]);
  }
  for (const z of [-3.7, -0.5, 2.5]) b.box([10, 0.24, 0.22], [0, 3.5, z], M.darkWood);
  for (let x = -4.75; x < 5; x += 0.5)
    b.box([0.495, 0.13, 10], [x, 3.73, 0.6], { ...M.wood, color: 0x554c3d });
  windowLattice(b, -2.4, 1.9, -3.83, 2.1, 1.7, daylight);
  b.box([10, 0.22, 0.3], [0, 0.12, -3.8], M.darkWood);
}
