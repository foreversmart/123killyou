import { Builder } from '@/scene/geometry/builder';
import { torus } from '@/scene/geometry/primitives';
import { sculpt, tube, leafPlate } from '@/scene/world_environment/guardian_forms';
import {
  ebony,
  gilt,
  ivory,
  shadowGold,
  type GuardianPalette,
} from '@/scene/world_environment/guardian_materials';

export function guardianFace(b: Builder, c: GuardianPalette) {
  sculpt(b, [0, 2.52, 0], [0.245, 0.31, 0.22], ebony);
  sculpt(b, [0, 2.5, 0.035], [0.235, 0.28, 0.232], c.skin);
  sculpt(b, [0, 2.365, 0.071], [0.205, 0.15, 0.194], c.skin);
  for (const side of [-1, 1]) {
    sculpt(b, [side * 0.24, 2.49, -0.01], [0.055, 0.12, 0.06], c.skin);
    sculpt(b, [side * 0.255, 2.49, 0.035], [0.023, 0.065, 0.022], shadowGold);
    b.add(
      torus(0.067, 0.013, 16),
      gilt,
      [side * 0.266, 2.36, 0.023],
      [0.72, 1, 1.2],
      [Math.PI / 2, 0, 0],
    );
    // Z positions place every eye component beyond the facial shell.
    sculpt(b, [side * 0.1, 2.55, 0.248], [0.081, 0.036, 0.024], shadowGold, [0, 0, side * -0.18]);
    sculpt(b, [side * 0.1, 2.55, 0.273], [0.061, 0.018, 0.012], c.eyes, [0, 0, side * -0.18]);
    sculpt(b, [side * 0.095, 2.55, 0.287], [0.021, 0.016, 0.008], c.eyes);
    sculpt(b, [side * 0.094, 2.552, 0.294], [0.008, 0.013, 0.006], ebony);
    tube(
      b,
      [
        [side * 0.018, 2.57, 0.275],
        [side * 0.075, 2.605, 0.286],
        [side * 0.15, 2.625, 0.265],
        [side * 0.194, 2.68, 0.23],
      ],
      0.032,
      ebony,
      0.008,
    );
    tube(
      b,
      [
        [side * 0.035, 2.605, 0.26],
        [side * 0.095, 2.65, 0.27],
        [side * 0.17, 2.68, 0.24],
      ],
      0.013,
      ivory,
      0.004,
    );
    sculpt(b, [side * 0.145, 2.445, 0.185], [0.081, 0.074, 0.055], c.skin, [0, 0, -side * 0.3]);
    tube(
      b,
      [
        [side * 0.16, 2.505, 0.256],
        [side * 0.13, 2.475, 0.27],
        [side * 0.09, 2.45, 0.29],
      ],
      0.012,
      shadowGold,
    );
    tube(
      b,
      [
        [side * 0.035, 2.38, 0.298],
        [side * 0.09, 2.35, 0.29],
        [side * 0.15, 2.37, 0.25],
        [side * 0.182, 2.42, 0.229],
      ],
      0.024,
      ebony,
      0.006,
    );
    tube(
      b,
      [
        [side * 0.04, 2.373, 0.317],
        [side * 0.098, 2.347, 0.308],
        [side * 0.155, 2.38, 0.27],
      ],
      0.007,
      ivory,
      0.002,
    );
  }
  sculpt(b, [0, 2.495, 0.259], [0.04, 0.092, 0.056], c.skin);
  sculpt(b, [0, 2.443, 0.302], [0.066, 0.041, 0.044], c.skin);
  for (const side of [-1, 1]) sculpt(b, [side * 0.041, 2.426, 0.313], [0.02, 0.012, 0.012], ebony);
  sculpt(b, [0, 2.348, 0.258], [0.094, 0.039, 0.036], ebony);
  sculpt(b, [0, 2.327, 0.277], [0.08, 0.015, 0.015], { ...c.skin, color: 0x74352b });
  for (const side of [-1, 1])
    tube(
      b,
      [
        [side * 0.059, 2.363, 0.278],
        [side * 0.049, 2.327, 0.296],
      ],
      0.013,
      ivory,
      0.002,
    );
  sculpt(b, [0, 2.255, 0.188], [0.09, 0.12, 0.065], ebony);
  for (let i = -2; i <= 2; i++)
    tube(
      b,
      [
        [i * 0.026, 2.305, 0.237],
        [i * 0.022, 2.23, 0.247],
        [i * 0.01, 2.19, 0.211],
      ],
      0.008,
      shadowGold,
      0.003,
    );
  crown(b);
}

function crown(b: Builder) {
  b.add(torus(0.235, 0.027, 28), shadowGold, [0, 2.757, 0]);
  b.add(torus(0.24, 0.013, 28), gilt, [0, 2.804, 0]);
  for (let i = 0; i < 7; i++) {
    const angle = (i - 3) * 0.48;
    const x = Math.sin(angle) * 0.228,
      z = Math.cos(angle) * 0.228;
    const height = i === 3 ? 0.4 : 0.33;
    const plate = new Builder();
    plate.add(leafPlate, shadowGold, [0, 0, 0], [0.205, height, 1]);
    plate.add(
      leafPlate,
      { color: 0x354b4a, rough: 0.82 },
      [0, 0.035, 0.037],
      [0.164, height - 0.065, 0.6],
    );
    for (const side of [-1, 1])
      tube(
        plate,
        [
          [side * 0.09, 0.03, 0.05],
          [side * 0.082, height * 0.6, 0.05],
          [0, height - 0.012, 0.05],
        ],
        0.009,
        gilt,
      );
    // Tiny seated Buddha, raised from the blue recess in each crown petal.
    sculpt(plate, [0, height * 0.56, 0.073], [0.03, 0.035, 0.021], gilt);
    sculpt(plate, [0, height * 0.34, 0.075], [0.034, 0.053, 0.024], gilt);
    sculpt(plate, [0, height * 0.2, 0.078], [0.062, 0.023, 0.029], gilt);
    for (const side of [-1, 1])
      tube(
        plate,
        [
          [side * 0.031, height * 0.42, 0.075],
          [side * 0.052, height * 0.26, 0.08],
          [0, height * 0.26, 0.094],
        ],
        0.009,
        gilt,
      );
    b.merge(plate.build(), [x, 2.793, z], [0, angle, 0]);
  }
  sculpt(b, [0, 3.03, -0.035], [0.16, 0.14, 0.15], shadowGold);
  b.add(torus(0.111, 0.016, 18), gilt, [0, 3.12, -0.035]);
  sculpt(b, [0, 3.22, -0.035], [0.068, 0.13, 0.067], gilt);
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    sculpt(
      b,
      [Math.sin(angle) * 0.245, 2.782, Math.cos(angle) * 0.245],
      [0.022, 0.022, 0.022],
      gilt,
    );
  }
}
