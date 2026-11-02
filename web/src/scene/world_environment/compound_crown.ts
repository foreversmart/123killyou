import { Builder } from '@/scene/geometry/builder';
import { cylinder } from '@/scene/geometry/primitives';
import { paintedBeam, reliefSurface } from '@/scene/world_environment/temple_ornament';
import { templeGold, templeJade, templeRed } from '@/scene/world_environment/temple_palette';
import type { V3 } from '@/scene/world/types';

/** The same stepped crown silhouette; small figures resolve through the relief atlas. */
export function distantCrown(b: Builder, p: V3, width: number, height: number) {
  for (let tier = 0; tier < 3; tier++) {
    const span = width * (1 - tier * 0.16),
      bottom = p[1] + (height * tier) / 3,
      h = height / 3;
    b.box([span, h * 0.65, 0.13], [p[0], bottom + h * 0.33, p[2] - 0.16], templeRed);
    reliefSurface(b, [p[0], bottom + 0.04, p[2] + 0.13], span, h * 0.65);
    paintedBeam(b, [p[0], bottom + 0.025, p[2]], span + 0.13, 0.075);
    for (let i = 0; i < 8; i++) {
      const a = i / 4 - 1,
        c = (i + 1) / 4 - 1;
      const ya = bottom + h * 0.8 + Math.abs(a) ** 5 * 0.15;
      const yc = bottom + h * 0.8 + Math.abs(c) ** 5 * 0.15;
      const w = span / 2 + 0.16,
        dx = (c - a) * w,
        dy = yc - ya;
      b.box(
        [Math.hypot(dx, dy) + 0.03, 0.13, 0.58],
        [p[0] + ((a + c) * w) / 2, (ya + yc) / 2, p[2]],
        templeJade,
        [0, 0, Math.atan2(dy, dx)],
      );
      b.box(
        [Math.hypot(dx, dy) + 0.03, 0.025, 0.045],
        [p[0] + ((a + c) * w) / 2, (ya + yc) / 2 - 0.06, p[2] + 0.31],
        templeGold,
        [0, 0, Math.atan2(dy, dx)],
      );
    }
  }
  b.add(cylinder(0.12, 0.15, 0.23, 6), templeGold, [p[0], p[1] + height, p[2]]);
}
