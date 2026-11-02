import { Builder } from '@/scene/geometry/builder';
import type { V3 } from '@/scene/world/types';
import { templeGold, templeJade, templeRed } from '@/scene/world_environment/temple_palette';

/** Open octagons and the small diamonds between them; every opening is geometry. */
export function octagonalLattice(b: Builder, position: V3, width: number, height: number, yaw = 0) {
  const local = new Builder();
  const frame = templeJade;
  const columns = Math.max(2, Math.round(width / 0.4));
  const rows = Math.max(2, Math.round(height / 0.4));
  const w = width / columns;
  const h = height / rows;
  const segments = new Set<string>();
  const edge = (a: number[], c: number[]) => {
    const keys = [a, c].map((p) => p.map((v) => v.toFixed(4)).join(',')).sort();
    const key = keys.join(':');
    if (segments.has(key)) return;
    segments.add(key);
    local.box(
      [Math.hypot(c[0] - a[0], c[1] - a[1]) + 0.012, 0.032, 0.075],
      [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, 0],
      frame,
      [0, 0, Math.atan2(c[1] - a[1], c[0] - a[0])],
    );
  };
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      const x = -width / 2 + column * w;
      const y = -height / 2 + row * h;
      const points = [
        [0.29, 0],
        [0.71, 0],
        [1, 0.29],
        [1, 0.71],
        [0.71, 1],
        [0.29, 1],
        [0, 0.71],
        [0, 0.29],
      ].map(([px, py]) => [x + px * w, y + py * h]);
      points.forEach((p, i) => edge(p, points[(i + 1) % 8]));
    }
  for (const side of [-1, 1]) {
    local.box([0.095, height + 0.2, 0.13], [side * (width / 2 + 0.045), 0, 0], templeRed);
    local.box([width, 0.095, 0.13], [0, side * (height / 2 + 0.045), 0], templeRed);
    local.box([0.019, height + 0.12, 0.15], [side * (width / 2 + 0.017), 0, 0.01], templeGold);
    local.box([width + 0.06, 0.019, 0.15], [0, side * (height / 2 + 0.017), 0.01], templeGold);
  }
  b.merge(local.build(), position, [0, yaw, 0]);
}
