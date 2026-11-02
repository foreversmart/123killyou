import { Builder } from '@/scene/geometry/builder';
import { cylinder, lathe, sphere } from '@/scene/geometry/primitives';
import type { V3 } from '@/scene/world/types';
import { carvedLine, cloudScroll, lotusBoss } from '@/scene/world_environment/temple_carving';
import {
  templeCream,
  templeGold,
  templeInk,
  templeJade,
  templeRed,
} from '@/scene/world_environment/temple_palette';

const head = sphere(1, 8, 6);

function nicheFigure(b: Builder, x: number, y: number, size: number) {
  b.add(cylinder(size * 0.19, size * 0.26, size * 0.08, 10), templeJade, [x, y, 0.14]);
  b.add(
    lathe(
      [
        [0.22, 0],
        [0.25, 0.08],
        [0.16, 0.36],
        [0.15, 0.55],
        [0.09, 0.63],
        [0, 0.63],
      ],
      10,
    ),
    templeGold,
    [x, y + size * 0.04, 0.14],
    [size, size, size],
  );
  b.add(head, templeCream, [x, y + size * 0.77, 0.16], [size * 0.12, size * 0.16, size * 0.11]);
  b.add(cylinder(size * 0.005, size * 0.14, size * 0.23, 8), templeGold, [
    x,
    y + size * 0.98,
    0.14,
  ]);
  for (const side of [-1, 1]) {
    b.rod(
      [x + side * size * 0.13, y + size * 0.58, 0.14],
      [x + side * size * 0.24, y + size * 0.38, 0.2],
      size * 0.055,
      templeGold,
    );
    b.rod(
      [x + side * size * 0.24, y + size * 0.38, 0.2],
      [x + side * size * 0.1, y + size * 0.48, 0.27],
      size * 0.035,
      templeCream,
    );
  }
}

/** A pierced three-tier canopy with miniature gilded figures and upturned eaves. */
export function shrineCrown(b: Builder, p: V3, width: number, height: number, yaw = 0) {
  const local = new Builder();
  for (let tier = 0; tier < 3; tier++) {
    const span = width * (1 - tier * 0.16),
      y = (height * tier) / 3;
    const storey = height / 3;
    local.box([span, storey * 0.65, 0.13], [0, y + storey * 0.33, -0.16], templeInk);
    local.box([span + 0.13, 0.075, 0.45], [0, y, 0], templeRed);
    local.box([span + 0.13, 0.025, 0.47], [0, y + 0.05, 0.015], templeGold);
    const bays = Math.max(3, Math.min(7, Math.round(span / 0.75)));
    for (let bay = 0; bay <= bays; bay++) {
      const x = -span / 2 + (bay * span) / bays;
      local.box([0.055, storey * 0.73, 0.12], [x, y + storey * 0.4, 0.04], templeRed);
      if (bay < bays)
        nicheFigure(
          local,
          x + span / bays / 2,
          y + 0.06,
          Math.min(storey * 0.6, (span / bays) * 0.72),
        );
    }
    const roof: V3[] = Array.from({ length: 17 }, (_, i) => {
      const t = (i / 16) * 2 - 1;
      return [t * (span / 2 + 0.16), y + storey * 0.8 + Math.pow(Math.abs(t), 5) * 0.15, 0.18];
    });
    carvedLine(local, roof, 0.065, templeJade);
    carvedLine(
      local,
      roof.map(([x, y, z]) => [x, y - 0.06, z + 0.045]),
      0.023,
      templeGold,
    );
    for (let i = 0; i < roof.length - 1; i += 2) {
      const [x, ry] = roof[i];
      local.box([0.065, 0.045, 0.58], [x, ry + 0.04, -0.03], templeJade, [0.08, 0, 0]);
      lotusBoss(local, [x, ry - 0.09, 0.21], 0.055);
    }
    for (const side of [-1, 1])
      cloudScroll(local, [(side * span) / 2, y + storey * 0.52, 0.16], 0.36);
  }
  lotusBoss(local, [0, height, 0.05], 0.17);
  b.merge(local.build(), p, [0, yaw, 0]);
}
