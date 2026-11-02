import { Builder } from '@/scene/geometry/builder';
import { sphere, type Shape } from '@/scene/geometry/primitives';
import type { Material, V3 } from '@/scene/world/types';
import {
  templeCream,
  templeGold,
  templeJade,
  templeRed,
} from '@/scene/world_environment/temple_palette';

const bead = sphere(1, 8, 6);

/** One continuous carved moulding, with a round cross section and shared rings. */
export function carvedLine(b: Builder, points: V3[], radius: number, material: Material) {
  const g: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const sides = 6;
  for (let i = 0; i < points.length; i++) {
    const before = points[Math.max(0, i - 1)],
      after = points[Math.min(points.length - 1, i + 1)];
    const dx = after[0] - before[0],
      dy = after[1] - before[1];
    const length = Math.hypot(dx, dy) || 1;
    for (let j = 0; j <= sides; j++) {
      const t = (j * Math.PI * 2) / sides;
      const n: V3 = [(-dy / length) * Math.cos(t), (dx / length) * Math.cos(t), Math.sin(t)];
      g.positions.push(...points[i].map((v, axis) => v + n[axis] * radius));
      g.normals.push(...n);
      g.uv.push(i / (points.length - 1), j / sides);
      if (i < points.length - 1 && j < sides) {
        const a = i * (sides + 1) + j,
          c = a + sides + 1;
        g.indices.push(a, a + 1, c, a + 1, c + 1, c);
      }
    }
  }
  b.add(g, material);
}

/** Raised red ruyi clouds with ivory and gold outlines, not flat decals. */
export function cloudScroll(b: Builder, p: V3, size = 1, yaw = 0) {
  const local = new Builder();
  for (const side of [-1, 1]) {
    const points: V3[] = Array.from({ length: 25 }, (_, i) => {
      const t = i / 24,
        angle = t * Math.PI * 2.15;
      const r = (0.25 - t * 0.19) * size;
      return [side * (0.2 * size + Math.cos(angle) * r), Math.sin(angle) * r, 0];
    });
    carvedLine(local, points, size * 0.065, templeCream);
    carvedLine(
      local,
      points.map(([x, y, z]) => [x, y, z + 0.048 * size]),
      size * 0.042,
      templeRed,
    );
    carvedLine(
      local,
      points.map(([x, y, z]) => [x, y, z + 0.084 * size]),
      size * 0.009,
      templeGold,
    );
  }
  local.add(bead, templeRed, [0, -0.11 * size, 0], [0.16 * size, 0.095 * size, 0.08 * size]);
  b.merge(local.build(), p, [0, yaw, 0]);
}

export function lotusBoss(b: Builder, p: V3, radius = 0.12, yaw = 0) {
  const local = new Builder();
  for (let petal = 0; petal < 8; petal++) {
    const angle = (petal * Math.PI) / 4;
    local.add(
      bead,
      petal % 2 ? templeCream : templeJade,
      [Math.sin(angle) * radius * 0.64, Math.cos(angle) * radius * 0.64, 0],
      [radius * 0.31, radius * 0.62, radius * 0.28],
      [0, 0, -angle],
    );
  }
  local.add(bead, templeGold, [0, 0, radius * 0.24], [radius * 0.38, radius * 0.38, radius * 0.31]);
  b.merge(local.build(), p, [0, yaw, 0]);
}
