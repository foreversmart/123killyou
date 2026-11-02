import { Builder } from '@/scene/geometry/builder';
import { lathe, torus } from '@/scene/geometry/primitives';
import type { V3 } from '@/scene/world/types';
import { sculpt, tube, relief } from '@/scene/world_environment/guardian_forms';
import {
  ebony,
  gilt,
  ivory,
  shadowGold,
  type GuardianKind,
  type GuardianPalette,
} from '@/scene/world_environment/guardian_materials';

function hand(b: Builder, p: V3, c: GuardianPalette, open = false) {
  sculpt(b, p, [0.085, 0.1, 0.055], c.skin, [0, 0, open ? -0.2 : 0.4]);
  for (let i = 0; i < 4; i++) {
    const x = p[0] + (i - 1.5) * 0.035;
    const y = p[1] + (open ? 0.045 : 0.01);
    tube(
      b,
      [
        [x, y, p[2] + 0.035],
        [x + 0.006, y + (open ? 0.13 : 0.03), p[2] + 0.052],
        [x + 0.01, y + (open ? 0.15 : 0.02), p[2] + (open ? 0.047 : 0.07)],
      ],
      0.018,
      c.skin,
      0.011,
    );
  }
  tube(
    b,
    [
      [p[0] - 0.07, p[1] - 0.03, p[2]],
      [p[0] - 0.105, p[1] + 0.02, p[2] + 0.065],
      [p[0] - 0.065, p[1] + 0.045, p[2] + 0.08],
    ],
    0.027,
    c.skin,
    0.016,
  );
}

function arm(b: Builder, side: number, elbow: V3, palm: V3, c: GuardianPalette, open = false) {
  const shoulder: V3 = [side * 0.51, 2.07, 0.02];
  tube(b, [shoulder, elbow], 0.16, c.robe, 0.13);
  sculpt(b, elbow, [0.145, 0.145, 0.145], c.trim);
  tube(b, [elbow, palm], 0.11, shadowGold, 0.075);
  const wrist: V3 = palm.map((v, i) => v * 0.82 + elbow[i] * 0.18) as V3;
  const direction = palm.map((v, i) => v - elbow[i]);
  const length = Math.hypot(...direction);
  b.add(
    torus(0.082, 0.014, 14),
    gilt,
    wrist,
    [1, 1, 1],
    [Math.acos(direction[1] / length), Math.atan2(direction[0], direction[2]), 0],
  );
  tube(
    b,
    [
      elbow.map((v, i) => v + (i === 2 ? 0.12 : 0)) as V3,
      wrist.map((v, i) => v + (i === 2 ? 0.078 : 0)) as V3,
    ],
    0.024,
    gilt,
  );
  hand(b, palm, c, open);
}

function pipa(b: Builder, c: GuardianPalette) {
  const instrument = new Builder();
  const outline: [number, number][] = [
    [0, 0],
    [0.16, 0.035],
    [0.25, 0.16],
    [0.265, 0.31],
    [0.21, 0.48],
    [0.12, 0.66],
    [0.065, 0.82],
    [-0.065, 0.82],
    [-0.12, 0.66],
    [-0.21, 0.48],
    [-0.265, 0.31],
    [-0.25, 0.16],
    [-0.16, 0.035],
  ];
  instrument.add(relief(outline, 0.11), { color: 0x976637, rough: 0.68, pattern: 1 });
  instrument.add(
    relief(outline, 0.025),
    { color: 0xc99a56, rough: 0.72 },
    [0, 0, 0.066],
    [0.94, 0.97, 1],
  );
  tube(instrument, [...outline.map(([x, y]) => [x, y, 0.08] as V3), [0, 0, 0.08]], 0.009, gilt);
  instrument.box([0.105, 0.47, 0.075], [0, 0.95, 0], { color: 0x6c4229, rough: 0.75 });
  tube(
    instrument,
    [
      [0, 1.16, 0],
      [0, 1.3, -0.035],
      [0, 1.38, -0.1],
    ],
    0.065,
    shadowGold,
    0.045,
  );
  for (let row = 0; row < 14; row++) {
    const y = 0.27 + row * 0.061;
    instrument.box([y > 0.8 ? 0.11 : 0.17 - row * 0.004, 0.014, 0.025], [0, y, 0.095], ivory);
  }
  instrument.box([0.17, 0.043, 0.035], [0, 0.17, 0.1], ebony);
  for (const x of [-0.027, -0.009, 0.009, 0.027])
    tube(
      instrument,
      [
        [x, 0.17, 0.12],
        [x, 0.8, 0.12],
        [x, 1.27, 0.06],
      ],
      0.003,
      ivory,
    );
  for (const side of [-1, 1])
    for (let i = 0; i < 2; i++) {
      instrument.rod(
        [side * 0.04, 1.19 + i * 0.09, -0.01],
        [side * 0.125, 1.19 + i * 0.09, -0.01],
        0.018,
        ebony,
      );
      sculpt(instrument, [side * 0.135, 1.19 + i * 0.09, -0.01], [0.018, 0.04, 0.025], gilt);
    }
  b.merge(instrument.build(), [-0.34, 1.16, 0.44], [0.03, -0.12, -0.57]);
  arm(b, -1, [-0.63, 1.72, 0.13], [-0.23, 1.58, 0.61], c);
  arm(b, 1, [0.73, 1.88, 0.16], [0.25, 2.17, 0.59], c);
}

function sword(b: Builder, c: GuardianPalette) {
  const sword = new Builder();
  const blade = relief(
    [
      [-0.06, 0],
      [0.06, 0],
      [0.064, 0.83],
      [0, 1.08],
      [-0.064, 0.83],
    ],
    0.032,
  );
  sword.add(blade, { color: 0xadb6ae, rough: 0.34, metal: 0.72 }, [0, 0.2, 0]);
  tube(
    sword,
    [
      [0, 0.22, 0.024],
      [0, 1.04, 0.024],
      [0, 1.27, 0],
    ],
    0.007,
    ivory,
    0.002,
  );
  tube(
    sword,
    [
      [-0.17, 0.22, 0],
      [-0.12, 0.16, 0],
      [0, 0.18, 0],
      [0.12, 0.16, 0],
      [0.17, 0.22, 0],
    ],
    0.029,
    gilt,
  );
  sword.rod([0, -0.1, 0], [0, 0.16, 0], 0.037, ebony);
  for (let i = 0; i < 5; i++) sword.add(torus(0.038, 0.007, 12), gilt, [0, -0.07 + i * 0.044, 0]);
  sculpt(sword, [0, -0.14, 0], [0.06, 0.06, 0.06], gilt);
  b.merge(sword.build(), [-0.69, 1.57, 0.43], [0, 0, 0.12]);
  arm(b, -1, [-0.72, 1.73, 0.18], [-0.7, 1.59, 0.43], c);
  arm(b, 1, [0.76, 1.78, 0.09], [0.74, 2.02, 0.36], c, true);
}

function dragon(b: Builder, c: GuardianPalette) {
  arm(b, 1, [0.74, 1.87, 0.06], [0.68, 2.32, 0.32], c, true);
  arm(b, -1, [-0.65, 1.69, 0.07], [-0.39, 1.72, 0.4], c);
  sculpt(b, [-0.39, 1.79, 0.43], [0.09, 0.09, 0.09], { ...ivory, color: 0xb3c4ae });
  const path: V3[] = [
    [0.31, 1.19, 0.05],
    [0.67, 1.43, 0.17],
    [0.86, 1.76, 0.18],
    [0.58, 1.94, 0.34],
    [0.46, 2.12, 0.09],
    [0.74, 2.26, -0.02],
    [0.89, 2.43, 0.14],
    [0.76, 2.56, 0.32],
  ];
  tube(b, path, 0.027, c.trim, 0.066);
  for (let i = 1; i < path.length - 1; i++)
    sculpt(b, [path[i][0], path[i][1] + 0.045, path[i][2]], [0.04, 0.05, 0.025], gilt);
  sculpt(b, [0.73, 2.57, 0.35], [0.1, 0.075, 0.1], c.trim);
  sculpt(b, [0.65, 2.55, 0.43], [0.085, 0.045, 0.08], gilt);
  for (const side of [-1, 1]) {
    sculpt(b, [0.73 + side * 0.063, 2.595, 0.41], [0.025, 0.02, 0.014], ivory);
    sculpt(b, [0.73 + side * 0.063, 2.595, 0.423], [0.009, 0.012, 0.006], ebony);
    tube(
      b,
      [
        [0.75 + side * 0.06, 2.62, 0.34],
        [0.78 + side * 0.1, 2.73, 0.28],
        [0.73 + side * 0.14, 2.78, 0.26],
      ],
      0.018,
      gilt,
      0.004,
    );
    tube(
      b,
      [
        [0.65 + side * 0.04, 2.54, 0.48],
        [0.56 + side * 0.11, 2.5, 0.49],
        [0.54 + side * 0.1, 2.58, 0.49],
      ],
      0.009,
      ivory,
      0.002,
    );
  }
}

function umbrella(b: Builder, c: GuardianPalette) {
  arm(b, 1, [0.71, 1.83, 0.05], [0.66, 2.02, 0.36], c);
  arm(b, -1, [-0.71, 1.76, 0.08], [-0.61, 1.94, 0.34], c, true);
  const parasol = new Builder();
  parasol.rod([0, 0, 0], [0, 2.05, 0], 0.025, shadowGold);
  const canopy = lathe(
    [
      [0, 1.96],
      [0.19, 1.94],
      [0.4, 1.88],
      [0.64, 1.75],
      [0.69, 1.7],
      [0.69, 1.675],
      [0, 1.92],
    ],
    32,
  );
  parasol.add(canopy, { color: 0xb87b31, rough: 0.75, pattern: 2 });
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8,
      s = Math.sin(a),
      co = Math.cos(a);
    tube(
      parasol,
      [
        [0, 1.975, 0],
        [s * 0.22, 1.945, co * 0.22],
        [s * 0.44, 1.87, co * 0.44],
        [s * 0.69, 1.71, co * 0.69],
      ],
      0.009,
      gilt,
    );
    tube(
      parasol,
      [
        [s * 0.685, 1.7, co * 0.685],
        [s * 0.69, 1.56, co * 0.69],
      ],
      0.008,
      shadowGold,
    );
    sculpt(parasol, [s * 0.69, 1.54, co * 0.69], [0.018, 0.05, 0.018], gilt);
  }
  parasol.add(torus(0.688, 0.015, 32), gilt, [0, 1.7, 0]);
  sculpt(parasol, [0, 2.04, 0], [0.045, 0.1, 0.045], gilt);
  b.merge(parasol.build(), [0.66, 1.63, 0.31]);
}

export function guardianAttributes(b: Builder, kind: GuardianKind, palette: GuardianPalette) {
  ({ pipa, sword, dragon, umbrella })[kind](b, palette);
}
