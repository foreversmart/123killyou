import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder, lathe, plane, torus } from '@/scene/geometry/primitives';
import { labelTile } from '@/scene/renderer/atlas';
import type { V3 } from '@/scene/world/types';

export function book(b: Builder, title: string, open = false) {
  const blue = { color: title === '大念处经' ? 0x344f60 : 0x766749, rough: 0.93, pattern: 2 };
  b.box([0.34, 0.045, 0.46], [0, 0.03, 0], blue);
  b.box([0.315, 0.025, 0.425], [0, 0.035, -0.006], M.paper);
  b.box([0.34, 0.008, 0.46], [0, 0.054, 0], open ? M.paper : blue);
  if (open) {
    b.box([0.35, 0.012, 0.45], [-0.34, 0.052, 0], M.paper);
    for (const x of [-0.34, 0])
      for (let i = 0; i < 6; i++)
        b.box([0.22, 0.002, 0.006], [x, 0.06, -0.16 + i * 0.055], { color: 0x4d493d });
  }
  b.add(
    plane(0.16, 0.24),
    { color: 0xffffff },
    [0, 0.059, 0.12],
    [1, 1, 1],
    [-Math.PI / 2, 0, 0],
    labelTile(title),
  );
}

export function bowl(b: Builder, empty = false, water = false) {
  b.add(
    lathe([
      [0, 0],
      [0.08, 0],
      [0.11, 0.04],
      [0.17, 0.13],
      [0.172, 0.155],
      [0.156, 0.155],
      [0.12, 0.065],
      [0.07, 0.032],
      [0, 0.032],
    ]),
    { color: 0x969f89, rough: 0.3 },
  );
  if (!empty) {
    b.add(
      cylinder(0.15, 0.15, 0.009, 28),
      { color: water ? 0x8caaa3 : 0xd4bd89, rough: 0.2 },
      [0, 0.125, 0],
    );
    if (!water)
      for (let i = 0; i < 17; i++) {
        const a = i * 2.4,
          r = 0.025 * Math.sqrt(i);
        b.ball([0.014, 0.004, 0.009], [Math.cos(a) * r, 0.133, Math.sin(a) * r], {
          color: i % 4 ? 0xe3d7b0 : 0x735643,
          rough: 0.5,
        });
      }
  }
}

export function plate(b: Builder, food: 'greens' | 'bamboo' | 'pickles' | 'cat') {
  b.add(
    lathe([
      [0, 0],
      [0.14, 0],
      [0.24, 0.055],
      [0.25, 0.07],
      [0.23, 0.07],
      [0.12, 0.025],
      [0, 0.025],
    ]),
    { color: 0xa6ad99, rough: 0.4 },
  );
  if (food === 'cat') return;
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4,
      r = 0.025 * Math.sqrt(i);
    b.ball(
      [0.06, 0.018, 0.025],
      [Math.sin(a) * r, 0.052 + (i % 3) * 0.018, Math.cos(a) * r],
      {
        color:
          food === 'bamboo'
            ? 0xb99d5b
            : food === 'pickles'
              ? 0x6b7237
              : i % 3
                ? 0x3f6535
                : 0x584737,
        rough: 0.55,
      },
      [0, a, 0],
    );
  }
}

export function bread(b: Builder) {
  b.add(cylinder(0.27, 0.25, 0.08, 28), { ...M.wood, color: 0xbfa26e }, [0, 0.04, 0]);
  b.add(torus(0.26, 0.015), M.wood, [0, 0.09, 0]);
  for (const [x, z] of [
    [-0.1, 0.08],
    [0.1, 0.08],
    [0, -0.1],
  ])
    b.ball([0.095, 0.07, 0.09], [x, 0.13, z], { color: 0xeadcbc, rough: 0.95 });
}

export function bag(b: Builder, p: V3 = [0, 0, 0], color = 0x50564b) {
  const cloth = { color, rough: 0.94, pattern: 2 };
  b.ball([0.23, 0.2, 0.14], [p[0], p[1] + 0.2, p[2]], cloth);
  b.box([0.28, 0.19, 0.04], [p[0], p[1] + 0.17, p[2] + 0.13], cloth);
  for (const s of [-1, 1])
    b.rod(
      [p[0] + s * 0.08, p[1] + 0.32, p[2]],
      [p[0] + s * 0.07, p[1] + 0.46, p[2]],
      0.014,
      M.darkWood,
    );
  b.rod([p[0] - 0.07, p[1] + 0.46, p[2]], [p[0] + 0.07, p[1] + 0.46, p[2]], 0.016, M.darkWood);
}

export function camera(b: Builder, p: V3 = [0, 0, 0]) {
  b.box([0.16, 0.11, 0.075], p, M.black);
  b.add(
    cylinder(0.045, 0.043, 0.07),
    { color: 0x24282b, rough: 0.27, metal: 0.45 },
    [p[0], p[1], p[2] + 0.06],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
  );
  b.add(
    cylinder(0.034, 0.034, 0.004),
    { color: 0x244d50, rough: 0.05, metal: 0.8 },
    [p[0], p[1], p[2] + 0.097],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
  );
  b.box([0.04, 0.025, 0.03], [p[0] + 0.04, p[1] + 0.065, p[2]], M.black);
}
