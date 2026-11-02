import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder } from '@/scene/geometry/primitives';
import { roofTile } from '@/scene/geometry/roof_tile';
import { compoundRoof } from '@/scene/world_environment/compound_roof';
import { templeGold } from '@/scene/world_environment/temple_palette';

/** Curved glazed tiles and gilt end bosses continue along the cloister eaves. */
export function roof(b: Builder, x: number, z: number, width: number, depth: number, y: number) {
  const rise = Math.min(1.25, Math.max(0.42, depth * 0.27));
  compoundRoof(b, x, z, width, depth, y, rise);
  const columns = Math.ceil(width / 0.29);
  const cornerLift = Math.min(0.48, depth * 0.08);
  for (const side of [-1, 1])
    for (let i = 0; i <= columns; i++) {
      const u = (i * 2) / columns - 1;
      const px = x - width / 2 + (i * width) / columns;
      const py = y + 0.234 + cornerLift * Math.abs(u) ** 6;
      b.add(
        roofTile(0.14),
        { ...M.roof, color: i % 4 ? 0x506663 : 0x3f5553 },
        [px, py, z + side * (depth / 2 - 0.03)],
        [0.7, 0.58, 1],
        [side * -0.12, 0, 0],
      );
      if (i % 2 === 0)
        b.add(
          cylinder(0.045, 0.045, 0.018, 8),
          templeGold,
          [px, py - 0.05, z + side * (depth / 2 + 0.055)],
          [1, 1, 1],
          [Math.PI / 2, 0, 0],
        );
    }
}
