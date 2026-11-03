import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder } from '@/scene/geometry/primitives';
import { compoundRoof } from '@/scene/world_environment/compound_roof';
import { bracket, templeStone, templeTimber } from '@/scene/world_environment/temple_facade';
import type { V3 } from '@/scene/world/types';
import { lotusBoss, paintedBeam } from '@/scene/world_environment/temple_ornament';
import { templeGold, templeJade, templeRed } from '@/scene/world_environment/temple_palette';

export function enclosureWall(b: Builder, from: V3, to: V3, height = 3.2, distant = false) {
  const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const yaw = -Math.atan2(to[2] - from[2], to[0] - from[0]);
  const local = new Builder();
  const plaster = { ...M.plaster, color: 0xafa184 };
  local.box([length, height, 0.46], [0, height / 2, 0], plaster);
  local.box([length, 0.52, 0.59], [0, 0.2, 0], templeStone);
  local.box([length + 0.12, 0.12, 0.6], [0, height - 0.07, 0], templeRed);
  for (const side of [-1, 1]) {
    paintedBeam(local, [0, height - 0.28, side * 0.25], length, 0.27, side < 0 ? Math.PI : 0);
    local.box([length + 0.2, 0.1, 0.51], [0, height + 0.08, side * 0.18], M.roof, [
      side * 0.28,
      0,
      0,
    ]);
    for (let x = -length / 2; x <= length / 2; x += distant ? 0.58 : 0.29)
      local.rod([x, height + 0.25, 0], [x, height + 0.14, side * 0.45], 0.06, {
        ...M.roof,
        color: 0x4b7468,
      });
  }
  local.box([length + 0.22, 0.1, 0.12], [0, height + 0.27, 0], M.roof);
  for (let x = -length / 2; x <= length / 2; x += 5.5) {
    local.box([0.64, height + 0.06, 0.66], [x, height / 2, 0], templeRed);
    local.box([0.82, 0.13, 0.84], [x, height + 0.13, 0], M.roof);
    for (const side of [-1, 1]) {
      local.box([0.4, height - 0.75, 0.025], [x, height / 2 + 0.08, side * 0.35], templeJade);
      lotusBoss(local, [x, height * 0.67, side * 0.38], 0.16, side < 0 ? Math.PI : 0);
      local.box([0.52, 0.04, 0.74], [x, 0.57, 0], templeGold);
    }
    if (!distant && x + 5.1 < length / 2)
      for (const side of [-1, 1]) {
        local.box([4.3, 1.4, 0.05], [x + 2.75, 1.55, side * 0.26], templeJade);
        for (const y of [0.85, 2.25])
          local.box([4.3, 0.04, 0.08], [x + 2.75, y, side * 0.27], templeGold);
        lotusBoss(local, [x + 2.75, 1.55, side * 0.31], 0.28, side < 0 ? Math.PI : 0);
      }
  }
  b.merge(local.build(), [(from[0] + to[0]) / 2, from[1], (from[2] + to[2]) / 2], [0, yaw, 0]);
}

export function compoundCloister(
  b: Builder,
  x: number,
  z: number,
  width: number,
  depth: number,
  distant = false,
) {
  const edge = x + (x < 0 ? width / 2 : -width / 2);
  b.box([2.7, 0.2, depth], [edge, 0.07, z], templeStone);
  for (const side of [-1, 1]) {
    b.box([0.24, 0.28, depth], [edge + side * 0.9, 3.37, z], templeTimber);
    paintedBeam(b, [edge + side * 1.02, 3.36, z], depth, 0.3, (side * Math.PI) / 2);
    for (let offset = -depth / 2 + 0.6; offset <= depth / 2; offset += 2.7) {
      b.box([0.24, 3.3, 0.24], [edge + side * 0.9, 1.82, z + offset], templeTimber);
      b.box([0.36, 0.36, 0.36], [edge + side * 0.9, 0.31, z + offset], templeStone);
      bracket(b, [edge + side * 0.9, 3.1, z + offset], Math.PI / 2, 0.7);
      b.box([0.29, 0.055, 0.29], [edge + side * 0.9, 0.61, z + offset], templeGold);
    }
  }
  // Rotate the roof so its ridge follows the long passage.
  const roof = new Builder();
  compoundRoof(roof, 0, 0, depth + 0.8, 3.4, 3.65, 0.8, distant);
  b.merge(roof.build(), [edge, 0, z], [0, Math.PI / 2, 0]);
}

export function compoundPaving(b: Builder, center: V3, width: number, depth: number, size = 1.25) {
  const cols = Math.max(1, Math.round(width / size));
  const rows = Math.max(1, Math.round(depth / 1.1));
  b.box([width + 0.14, 0.12, depth + 0.14], [center[0], center[1] - 0.055, center[2]], {
    ...templeStone,
    color: 0x505955,
  });
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++)
      b.box(
        [width / cols - 0.045, 0.1, depth / rows - 0.045],
        [
          center[0] - width / 2 + ((col + 0.5) * width) / cols,
          center[1],
          center[2] - depth / 2 + ((row + 0.5) * depth) / rows,
        ],
        {
          ...M.courtyardStone,
          color: [0x949f9c, 0xa8aeaa, 0x929c9a, 0x8d9692][(row * 7 + col * 11) % 4],
          rough: 0.56,
        },
      );
}

function grassBed(b: Builder, x: number, z: number, width: number, depth: number) {
  b.box([width + 0.22, 0.12, depth + 0.22], [x, 0.03, z], templeStone);
  b.box([width, 0.08, depth], [x, 0.08, z], { ...M.courtGrass, color: 0x3b492f });
}

export function compoundGardens(b: Builder) {
  for (const side of [-1, 1]) {
    grassBed(b, side * 6.5, -20.4, 5.3, 3.8);
    grassBed(b, side * 6.5, -39, 5.3, 3);
    for (const z of [-18.8, -21.8, -37.9, -40.1]) compoundLantern(b, side * 5.2, z);
  }
  b.box([8.5, 0.16, 5.2], [17.2, -0.02, -8.8], { ...M.stone, color: 0x717e76 });
  b.box([7.7, 0.06, 4.4], [17.2, 0.09, -8.8], { color: 0x526b66, rough: 0.18, metal: 0.12 });
  for (const [x, z] of [
    [14, -10.6],
    [20.4, -10.6],
    [14, -7],
    [20.4, -7],
  ])
    b.ball([0.45, 0.28, 0.32], [x, 0.23, z], { ...M.stone, color: 0x8a8f85 });
}

export function compoundLantern(b: Builder, x: number, z: number) {
  b.box([0.4, 0.1, 0.4], [x, 0.06, z], templeStone);
  b.box([0.13, 0.44, 0.13], [x, 0.3, z], templeTimber);
  b.box([0.3, 0.13, 0.3], [x, 0.58, z], { color: 0xffdfa2, rough: 0.6, glow: 0.4 });
  for (const side of [-1, 1]) {
    b.box([0.035, 0.2, 0.34], [x + side * 0.15, 0.58, z], templeTimber);
    b.box([0.34, 0.2, 0.035], [x, 0.58, z + side * 0.15], templeTimber);
  }
  b.add(
    cylinder(0.03, 0.3, 0.13, 4),
    { ...M.roof, color: 0x6f766f },
    [x, 0.73, z],
    [1, 1, 1],
    [0, Math.PI / 4, 0],
  );
}
