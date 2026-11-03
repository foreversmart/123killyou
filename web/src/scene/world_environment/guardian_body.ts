import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder, torus } from '@/scene/geometry/primitives';
import type { V3 } from '@/scene/world/types';
import {
  sculpt,
  tube,
  ribbon,
  leafPlate,
  scalePlate,
} from '@/scene/world_environment/guardian_forms';
import {
  ebony,
  gilt,
  ivory,
  shadowGold,
  type GuardianPalette,
} from '@/scene/world_environment/guardian_materials';

function beastMask(b: Builder, p: V3, size: number) {
  const mask = new Builder();
  sculpt(mask, [0, 0, 0], [0.18, 0.14, 0.1], gilt);
  for (const side of [-1, 1]) {
    sculpt(mask, [side * 0.09, 0.035, 0.08], [0.054, 0.022, 0.024], ebony, [0, 0, side * 0.2]);
    sculpt(mask, [side * 0.09, 0.035, 0.103], [0.01, 0.012, 0.007], ivory);
    tube(
      mask,
      [
        [side * 0.15, 0.08, 0.05],
        [side * 0.1, 0.1, 0.09],
        [side * 0.025, 0.065, 0.1],
      ],
      0.025,
      shadowGold,
    );
    tube(
      mask,
      [
        [side * 0.15, 0.08, 0],
        [side * 0.21, 0.16, 0],
        [side * 0.19, 0.21, 0.04],
      ],
      0.045,
      gilt,
      0.006,
    );
    tube(
      mask,
      [
        [side * 0.1, -0.04, 0.09],
        [side * 0.07, -0.13, 0.13],
        [side * 0.025, -0.1, 0.16],
      ],
      0.025,
      ivory,
      0.002,
    );
  }
  sculpt(mask, [0, -0.022, 0.12], [0.065, 0.045, 0.044], shadowGold);
  sculpt(mask, [0, -0.085, 0.085], [0.085, 0.045, 0.035], ebony);
  const geometry = mask.build();
  for (let i = 0; i < geometry.vertices.length; i += 16)
    for (let axis = 0; axis < 3; axis++) geometry.vertices[i + axis] *= size;
  b.merge(geometry, p);
}

export function guardianBody(b: Builder, c: GuardianPalette) {
  b.box([1.52, 0.16, 1.08], [0, 0.08, 0], { ...M.stone, color: 0x716d61 });
  b.box([1.37, 0.1, 0.96], [0, 0.2, 0], shadowGold);
  b.box([1.28, 0.09, 0.88], [0, 0.29, 0], { ...M.darkWood, color: 0x3d3430 });
  for (const side of [-1, 1]) {
    // The planted and bent legs have different depths, so the figure has a
    // real weight-bearing stance from the travelling side view.
    const x = side * 0.31,
      z = side < 0 ? 0.14 : -0.03;
    sculpt(b, [x, 0.45, z + 0.13], [0.19, 0.13, 0.25], ebony, [0, side * -0.19, 0]);
    sculpt(b, [x, 0.48, z + 0.2], [0.19, 0.08, 0.2], gilt);
    tube(
      b,
      [
        [x, 0.6, z],
        [x - side * 0.035, 0.88, z],
        [x - side * 0.08, 1.2, z - 0.025],
      ],
      0.174,
      c.robe,
      0.21,
    );
    sculpt(b, [x, 0.81, z + 0.12], [0.185, 0.27, 0.105], shadowGold);
    for (let row = 0; row < 4; row++)
      b.add(torus(0.174, 0.015, 18), gilt, [x, 0.63 + row * 0.1, z], [1, 1, 0.87]);
    beastMask(b, [x - side * 0.03, 1.03, z + 0.13], 0.85);
  }
  sculpt(b, [0, 1.34, -0.015], [0.42, 0.38, 0.26], c.robe);
  // Separate flared lamellar skirts, with individual gilded scales and an
  // open centre that exposes the bent knees and greaves.
  for (const side of [-1, 1]) {
    const skirt = new Builder();
    skirt.add(
      leafPlate,
      { color: 0xd3bc96, rough: 0.82, metal: 0.3, pattern: 38 },
      [0, 0, 0],
      [0.47, 0.64, 1],
      [0, 0, Math.PI],
    );
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 5; col++) {
        const x = (col - 2) * 0.079 + (row % 2) * 0.018;
        const y = -0.08 - row * 0.084;
        skirt.add(scalePlate, row % 2 ? gilt : shadowGold, [x, y - 0.05, 0.044], [0.076, 0.095, 1]);
        sculpt(skirt, [x, y + 0.02, 0.06], [0.008, 0.008, 0.006], gilt);
      }
    }
    b.merge(skirt.build(), [side * 0.29, 1.56, 0.22], [0, side * 0.25, side * 0.22]);
  }
  sculpt(b, [0, 1.83, 0], [0.48, 0.43, 0.29], c.trim);
  sculpt(b, [0, 1.64, 0.1], [0.44, 0.28, 0.31], shadowGold);
  for (const side of [-1, 1]) {
    const x = side * 0.22;
    sculpt(b, [x, 1.98, 0.235], [0.237, 0.235, 0.105], gilt);
    b.add(torus(0.195, 0.014, 24), shadowGold, [x, 1.98, 0.317], [1, 1, 1], [Math.PI / 2, 0, 0]);
    // A convex gilt mirror with shallow scroll relief, not a flat radial badge.
    sculpt(b, [x, 1.98, 0.321], [0.177, 0.177, 0.067], shadowGold);
    for (const curl of [-1, 1])
      tube(
        b,
        [
          [x + curl * 0.13, 1.91, 0.353],
          [x + curl * 0.105, 2.035, 0.365],
          [x + curl * 0.026, 2.066, 0.377],
          [x - curl * 0.025, 2.018, 0.39],
          [x + curl * 0.018, 1.99, 0.393],
        ],
        0.008,
        gilt,
        0.005,
      );
    sculpt(b, [side * 0.51, 2.12, 0], [0.25, 0.19, 0.24], c.trim);
    beastMask(b, [side * 0.54, 2.13, 0.19], 1.18);
    for (let row = 0; row < 4; row++) {
      sculpt(
        b,
        [side * (0.57 + row * 0.025), 1.98 - row * 0.065, 0.04],
        [0.17, 0.07, 0.2],
        row % 2 ? c.trim : gilt,
        [0, 0, side * 0.25],
      );
    }
  }
  b.add(torus(0.37, 0.04, 28), gilt, [0, 1.53, 0], [1.1, 1, 0.82]);
  beastMask(b, [0, 1.52, 0.31], 0.9);
  tube(
    b,
    [
      [-0.42, 1.85, 0.18],
      [-0.19, 1.65, 0.34],
      [0.19, 1.61, 0.34],
      [0.44, 1.79, 0.18],
    ],
    0.045,
    c.trim,
  );
  b.add(cylinder(0.13, 0.2, 0.18, 16), gilt, [0, 2.25, 0]);
  for (const side of [-1, 1]) {
    ribbon(
      b,
      [
        [side * 0.16, 2.56, -0.19],
        [side * 0.51, side < 0 ? 2.84 : 2.66, -0.16],
        [side * 0.78, side < 0 ? 2.85 : 2.5, -0.08],
        [side * 0.88, side < 0 ? 2.68 : 2.36, 0.02],
        [side * 0.71, side < 0 ? 2.47 : 2.28, 0.09],
      ],
      side < 0 ? 0.042 : 0.034,
      c.trim,
    );
    ribbon(
      b,
      [
        [side * 0.31, 1.54, -0.13],
        [side * 0.65, side < 0 ? 1.23 : 1.34, -0.08],
        [side * 0.76, side < 0 ? 0.86 : 1.04, 0.1],
        [side * 0.64, side < 0 ? 0.59 : 0.83, 0.16],
        [side * 0.5, side < 0 ? 0.65 : 0.88, 0.2],
      ],
      0.046,
      c.trim,
    );
  }
}
