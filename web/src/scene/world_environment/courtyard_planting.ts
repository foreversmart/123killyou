import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder, type Shape } from '@/scene/geometry/primitives';
import type { V3 } from '@/scene/world/types';

const leaf: Shape = {
  positions: [0, 0, 0, 0.48, 0.12, 0.018, 1, 0, 0, 0.48, -0.12, 0.018],
  normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
  uv: [0, 0, 0.48, 0.5, 1, 1, 0.48, 0.5],
  indices: [0, 1, 2, 0, 2, 3],
};

function randomSequence(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/** A porous clipped crown: small leaves catch light, with red azaleas between them. */
export function gardenShrub(b: Builder, p: V3, radius: number, flowers = false) {
  const random = randomSequence(Math.abs(Math.floor(p[0] * 721 + p[2] * 413)) + 17);
  b.rod(p, [p[0], p[1] + radius * 0.58, p[2]], 0.037, M.wood, 0.018);
  for (let i = 0; i < 370; i++) {
    const a = random() * Math.PI * 2;
    const h = random();
    const r = radius * Math.sqrt(1 - h * h) * (0.82 + random() * 0.18);
    const center: V3 = [
      p[0] + Math.cos(a) * r,
      p[1] + 0.14 + h * radius * 0.83,
      p[2] + Math.sin(a) * r,
    ];
    const tint = i % 4 === 0 ? 0x53623a : i % 3 === 0 ? 0x304628 : 0x3d522e;
    b.add(
      leaf,
      { color: tint, rough: 0.84 },
      center,
      [0.11, 0.3, 0.12],
      [random() * 2, a, random() * 6],
    );
    if (flowers && i % 7 === 0) {
      for (let petalIndex = 0; petalIndex < 5; petalIndex++) {
        const angle = (petalIndex * Math.PI * 2) / 5;
        b.add(
          leaf,
          { color: i % 3 ? 0x9b1948 : 0xcb3556, rough: 0.72 },
          [
            center[0] + Math.cos(angle) * 0.027,
            center[1] + 0.025,
            center[2] + Math.sin(angle) * 0.027,
          ],
          [0.042, 0.22, 0.042],
          [0, angle, Math.PI / 3],
        );
      }
    }
  }
}

export function gardenBamboo(b: Builder, p: V3, height = 2.6) {
  const random = randomSequence(Math.abs(Math.floor(p[0] * 817 + p[2] * 491)) + 103);
  for (let stalk = 0; stalk < 7; stalk++) {
    const angle = random() * Math.PI * 2;
    const spread = random() * 0.32;
    const x = p[0] + Math.cos(angle) * spread,
      z = p[2] + Math.sin(angle) * spread;
    const h = height * (0.72 + random() * 0.28);
    const lean = (random() - 0.5) * 0.42;
    b.rod(
      [x, p[1], z],
      [x + lean, p[1] + h, z + lean * 0.5],
      0.023,
      { color: 0x777447, rough: 0.88 },
      0.011,
    );
    for (let level = 1; level <= 6; level++) {
      const y = p[1] + (h * level) / 7;
      const sx = x + (lean * level) / 7,
        sz = z + (lean * 0.5 * level) / 7;
      b.add(cylinder(0.027, 0.027, 0.025, 8), { color: 0x9a9063, rough: 0.9 }, [sx, y, sz]);
      if (level < 2) continue;
      for (const side of [-1, 1]) {
        const a = angle + level * 1.8 + side;
        const length = 0.32 + random() * 0.4;
        const tip: V3 = [sx + Math.cos(a) * length, y + 0.14, sz + Math.sin(a) * length];
        b.rod([sx, y, sz], tip, 0.007, { color: 0x727348, rough: 0.9 }, 0.002);
        for (let i = 0; i < 5; i++) {
          const t = 0.25 + i * 0.15;
          const start: V3 = [sx + (tip[0] - sx) * t, y + 0.14 * t, sz + (tip[2] - sz) * t];
          b.add(
            leaf,
            { color: i % 2 ? 0x4f632f : 0x687944, rough: 0.86 },
            start,
            [0.23 + random() * 0.11, 0.15, 0.22],
            [0.55 + random() * 0.4, -a + (i % 2 ? 0.6 : -0.6), -0.35],
          );
        }
      }
    }
  }
}

/** Thousands of short, individually shaded blades, merged into the planting mesh. */
export function gardenGrass(
  b: Builder,
  x: number,
  z: number,
  width: number,
  depth: number,
  clear?: (x: number, z: number) => boolean,
) {
  const random = randomSequence(Math.abs(Math.floor(x * 1711 + z * 1103)) + 233);
  const blade: Shape = {
    positions: [-0.008, 0, 0, 0.008, 0, 0, 0.026, 0.17, 0.01],
    normals: [0, 0.3, 0.95, 0, 0.3, 0.95, 0, 0.3, 0.95],
    uv: [0, 0, 1, 0, 0.5, 1],
    indices: [0, 1, 2],
  };
  for (let i = 0; i < width * depth * 210; i++) {
    const px = x + (random() - 0.5) * width;
    const pz = z + (random() - 0.5) * depth;
    if (clear?.(px, pz)) continue;
    b.add(
      blade,
      { color: i % 3 ? 0x3c512c : 0x627043, rough: 0.96, pattern: 11 },
      [px, 0.064, pz],
      [1, 0.4 + random() * 0.7, 1],
      [0, random() * Math.PI * 2, 0],
    );
  }
}
