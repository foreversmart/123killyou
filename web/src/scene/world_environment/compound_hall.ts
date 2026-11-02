import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder, lathe, torus } from '@/scene/geometry/primitives';
import { compoundRoof } from '@/scene/world_environment/compound_roof';
import { compoundPediment } from '@/scene/world_environment/compound_pediment';
import { distantCrown } from '@/scene/world_environment/compound_crown';
import {
  balustrade,
  bracket,
  ceremonialDoor,
  templeStone,
  templeTimber,
  timberBay,
} from '@/scene/world_environment/temple_facade';
import type { TempleBuilding } from '@/scene/world_environment/temple_layout';
import { cloudScroll, paintedBeam, shrineCrown } from '@/scene/world_environment/temple_ornament';
import { templeGold, templeJade } from '@/scene/world_environment/temple_palette';

function storey(
  b: Builder,
  x: number,
  z: number,
  width: number,
  depth: number,
  base: number,
  height: number,
  open = true,
  detailed = true,
) {
  const front = z + depth / 2;
  const bays = Math.max(3, Math.round(width / 2.6));
  const bayWidth = width / bays;
  for (let i = 0; i < bays; i++) {
    const mid = x - width / 2 + (i + 0.5) * bayWidth;
    timberBay(b, [mid, base, z - depth / 2], bayWidth, height, Math.PI);
    if (!open || Math.abs(mid - x) > width * 0.23)
      timberBay(b, [mid, base, front - 0.12], bayWidth, height, 0, open);
    else {
      paintedBeam(b, [mid, base + height * 0.9, front + 0.05], bayWidth, height * 0.19);
      ceremonialDoor(
        b,
        [mid - bayWidth * 0.31, base + 0.08, front + 0.14],
        bayWidth * 0.43,
        height * 0.8,
        -0.53,
        !detailed,
      );
      ceremonialDoor(
        b,
        [mid + bayWidth * 0.31, base + 0.08, front + 0.14],
        bayWidth * 0.43,
        height * 0.8,
        0.53,
        !detailed,
      );
    }
  }
  const sideBays = Math.max(2, Math.round(depth / 2.7));
  for (const side of [-1, 1])
    for (let i = 0; i < sideBays; i++)
      timberBay(
        b,
        [x + (side * width) / 2, base, z - depth / 2 + ((i + 0.5) * depth) / sideBays],
        depth / sideBays,
        height,
        (side * Math.PI) / 2,
        true,
      );
  for (const face of [-1, 1]) {
    for (let i = 0; i <= bays; i++) {
      const px = x - width / 2 + i * bayWidth;
      b.add(cylinder(0.16, 0.2, height, 12), templeTimber, [
        px,
        base + height / 2,
        z + face * (depth / 2 + 0.42),
      ]);
      b.box([0.46, 0.26, 0.46], [px, base + 0.12, z + face * (depth / 2 + 0.42)], templeStone);
      for (const y of [base + 0.35, base + height - 0.65])
        b.add(cylinder(0.215, 0.215, 0.085, 12), templeGold, [
          px,
          y,
          z + face * (depth / 2 + 0.42),
        ]);
      bracket(
        b,
        [px, base + height - 0.42, z + face * (depth / 2 + 0.48)],
        0,
        height > 4 ? 1.3 : 1,
        !detailed,
      );
      if (detailed && i < bays) {
        bracket(
          b,
          [px + bayWidth / 2, base + height - 0.4, z + face * (depth / 2 + 0.52)],
          face < 0 ? Math.PI : 0,
          0.65,
        );
        if (i === 0 || i === bays - 1)
          cloudScroll(
            b,
            [px + bayWidth / 2, base + height - 0.78, z + face * (depth / 2 + 0.48)],
            0.28,
            face < 0 ? Math.PI : 0,
          );
      }
      if (i < bays)
        for (const side of [-1, 1])
          b.box(
            [bayWidth * 0.27, 0.12, 0.17],
            [
              px + bayWidth / 2 + side * bayWidth * 0.24,
              base + height - 0.52,
              z + face * (depth / 2 + 0.4),
            ],
            templeTimber,
            [0, 0, side * 0.68],
          );
    }
    paintedBeam(
      b,
      [x, base + height - 0.1, z + face * (depth / 2 + 0.57)],
      width + 0.5,
      0.3,
      face < 0 ? Math.PI : 0,
    );
    paintedBeam(
      b,
      [x, base + height - 0.54, z + face * (depth / 2 + 0.55)],
      width + 0.35,
      0.2,
      face < 0 ? Math.PI : 0,
    );
    b.box(
      [width + 0.5, 0.07, 0.3],
      [x, base + height + 0.08, z + face * (depth / 2 + 0.43)],
      templeJade,
    );
  }
}

export function compoundHall(b: Builder, hall: TempleBuilding, distant = false) {
  const { x, z, width, depth, base, tall } = hall;
  const main = hall.kind === 'hall';
  const height = tall ? 5.2 : main ? 4.2 : 3.4;
  const front = z + depth / 2;
  b.box([width + 1.8, base + 0.24, depth + 2], [x, (base - 0.24) / 2, z], templeStone);
  b.box([width + 2, 0.16, depth + 2.2], [x, base - 0.04, z], { ...templeStone, color: 0xa5aaa4 });
  storey(b, x, z, width, depth - 1.4, base + 0.05, height, true, !distant);
  if (main) paintedBeam(b, [x, base + height - 0.53, z + depth / 2 - 0.18], width - 0.45, 0.3);
  compoundRoof(
    b,
    x,
    z,
    width + (hall.kind === 'service' ? 1.6 : 3.2),
    depth + (hall.kind === 'service' ? 1.8 : 3.4),
    base + height,
    tall ? 2.1 : 1.5,
    distant,
  );
  if (tall) {
    // The upper timber storey emerges above the lower roof, rather than a
    // second floating roof intersecting the first one.
    const upperBase = base + height + 0.85;
    storey(b, x, z, width * 0.74, depth * 0.65, upperBase, 2.8, false, !distant);
    compoundRoof(b, x, z, width * 0.74 + 4.6, depth * 0.65 + 4.6, upperBase + 2.8, 2.05, distant);
  }
  if (main && hall.id !== 'maha_vira_hall')
    (distant ? distantCrown : shrineCrown)(
      b,
      [x, base + height - 0.08, front + 0.83],
      Math.min(5.2, width * 0.4),
      1.25,
    );
  if (hall.id === 'maha_vira_hall')
    compoundPediment(b, [x, base + height + 0.27, front + 1.58], 4.6, 1.55, distant);
  const stairsWidth = main ? width * 0.55 : Math.min(4, width * 0.6);
  const steps = Math.max(3, Math.ceil(base / 0.14));
  const run = steps * 0.36;
  for (let i = 0; i < steps; i++) {
    const top = (base * (i + 1)) / steps;
    b.box(
      [stairsWidth, top + 0.04, run - i * 0.36],
      [x, top / 2 - 0.02, front + 1 + (run - i * 0.36) / 2],
      { ...templeStone, color: i % 2 ? 0x8b9290 : 0x959b96 },
    );
  }
  for (const side of [-1, 1]) {
    balustrade(
      b,
      [x + side * (stairsWidth / 2 + 0.35), base, front + 1.06],
      [x + side * (width / 2 + 0.84), base, front + 1.06],
      distant,
    );
    balustrade(
      b,
      [x + side * (width / 2 + 0.84), base, front + 1.06],
      [x + side * (width / 2 + 0.84), base, z - depth / 2],
      distant,
    );
  }
}

export function compoundTower(
  b: Builder,
  x: number,
  z: number,
  artifact: 'bell' | 'drum',
  distant = false,
) {
  b.box([6, 0.72, 6], [x, 0.25, z], templeStone);
  for (let level = 0; level < 3; level++) {
    const span = 4.5 - level * 0.48;
    const base = 0.64 + level * 2.85;
    if (level === 0) {
      for (const px of [-1, 1])
        for (const pz of [-1, 1]) {
          b.box(
            [0.3, 2.8, 0.3],
            [x + (px * span) / 2, base + 1.4, z + (pz * span) / 2],
            templeTimber,
          );
          bracket(b, [x + (px * span) / 2, base + 2.35, z + (pz * span) / 2], 0, 1, distant);
        }
    } else storey(b, x, z, span, span, base, 2.5, false, !distant);
    compoundRoof(b, x, z, span + 2.4, span + 2.4, base + 2.5, 1.15, distant);
  }
  const bronze = { ...M.brass, color: 0x97865b, rough: 0.65 };
  if (artifact === 'bell') {
    b.add(
      lathe([
        [0.04, 1.45],
        [0.66, 1.45],
        [0.7, 1.6],
        [0.5, 2.55],
        [0.24, 2.77],
        [0, 2.82],
      ]),
      bronze,
      [x, 0, z],
    );
    b.add(torus(0.6, 0.04, 20), bronze, [x, 1.55, z]);
    b.rod([x, 2.7, z], [x, 3.1, z], 0.04, templeTimber);
  } else {
    b.add(
      cylinder(0.7, 0.7, 0.9, 20),
      { ...M.wood, color: 0x533d31 },
      [x, 1.95, z],
      [1, 1, 1],
      [0, 0, Math.PI / 2],
    );
    for (const side of [-1, 1])
      b.add(
        cylinder(0.66, 0.66, 0.035, 20),
        { ...M.paper, color: 0xb3a78c },
        [x + side * 0.46, 1.95, z],
        [1, 1, 1],
        [0, 0, Math.PI / 2],
      );
    b.box([1.6, 0.12, 0.9], [x, 1.22, z], templeTimber);
  }
}
