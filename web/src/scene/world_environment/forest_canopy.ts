import { node, type Geometry, type V3 } from '@/scene/world/types';
import { terrainHeight, templeClearance } from '@/scene/world_environment/terrain';
import { noise, smooth } from '@/scene/world_environment/terrain_noise';
import { roadNearest } from '@/scene/world_environment/road_path';

let cached: Geometry | undefined;
// Keep distant crowns on the leaf atlas, but sample one small leaf island per
// card. The old full-height strip sampled several islands and its transparent
// border in every quad, which read as pale sheet-like patches from the road.
const leafPattern = 16 + 7;
// Use the cleanest leaf islands from tree_1 and leave a small transparent
// gutter around each sample. The lower row contains branch and trunk pixels;
// keeping it out of the distant cards prevents pale bark sheets in the fog.
const leafRegions: [number, number, number, number][] = [
  [0.055, 0.19, 0.045, 0.18],
  [0.275, 0.45, 0.05, 0.18],
  [0.055, 0.19, 0.265, 0.43],
  [0.3, 0.48, 0.265, 0.43],
  [0.055, 0.19, 0.515, 0.68],
  [0.32, 0.51, 0.515, 0.68],
  [0.055, 0.19, 0.785, 0.925],
];

export function forestCanopy() {
  if (!cached) {
    const vertices: number[] = [],
      indices: number[] = [];
    let seed = 942;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    function card(center: V3, right: V3, up: V3, color: V3, leaf = true, region = leafRegions[0]) {
      const n: V3 = [
        right[1] * up[2] - right[2] * up[1],
        right[2] * up[0] - right[0] * up[2],
        right[0] * up[1] - right[1] * up[0],
      ];
      const length = Math.hypot(...n),
        base = vertices.length / 16;
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        vertices.push(
          ...center.map((v, i) => v + right[i] * sx + up[i] * sy),
          ...n.map((v) => v / length),
          ...color,
          1,
          0,
          leaf ? leafPattern : 0,
          0,
          leaf ? (sx < 0 ? region[0] : region[1]) : (sx + 1) / 2,
          leaf ? (sy > 0 ? region[2] : region[3]) : (1 - sy) / 2,
          -1,
        );
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    // Irregular spacing overlaps the scan belt, so no circular LOD edge
    // appears. Fewer, smaller cards leave sky holes between crowns instead of
    // turning the whole mountain into a repeated sheet.
    for (let z0 = -390; z0 < 215; z0 += 9) {
      for (let x0 = -325; x0 < 325; x0 += 9) {
        const x = x0 + random() * 7,
          z = z0 + random() * 7;
        const distance = Math.hypot(x, z + 16);
        if (templeClearance(x, z) < 8 || random() > 0.17 + 0.72 * smooth((distance - 38) / 95))
          continue;
        if (z > 10 && z < 175 && Math.abs(x) < 125 && roadNearest(x, z).distance < 10) continue;
        const y = terrainHeight(x, z);
        const slope = Math.hypot(terrainHeight(x + 3, z) - y, terrainHeight(x, z + 3) - y) / 3;
        if (slope > 1.45 || random() < 0.06 + Math.max(0, y - 135) / 280) continue;
        const height = 6.5 + random() * 5.5,
          width = 2.15 + random() * 1.15;
        // Keep the scanned greens in the same muted range as Tidewater's
        // canopy material. The previous neutral multiplier pushed backlit
        // cards toward grey-white in the low afternoon sun.
        const tone = 0.5 + noise(x / 32, z / 32) * 0.18 + random() * 0.07;
        const palettes = [
          [0.64, 0.84, 0.42],
          [0.5, 0.77, 0.36],
          [0.72, 0.82, 0.34],
          [0.45, 0.7, 0.42],
        ] as const;
        const palette = palettes[Math.floor(random() * palettes.length)];
        for (let side = 0; side < 3; side++) {
          const angle = (side * Math.PI) / 3;
          card(
            [x, y + height * 0.38, z],
            [Math.cos(angle) * 0.15, 0, Math.sin(angle) * 0.15],
            [0, height * 0.38, 0],
            [0.065, 0.052, 0.036],
            false,
          );
        }
        const branchCount = 15 + Math.floor(random() * 5);
        for (let branch = 0; branch < branchCount; branch++) {
          const angle = branch * 2.399 + random() * 0.4;
          const level = branch / (branchCount + 2);
          const radius =
            width * Math.sin(Math.PI * (0.12 + level * 0.76)) * (0.58 + random() * 0.38);
          const center: V3 = [
            x + Math.cos(angle) * radius,
            y + height * (0.32 + level * 0.64),
            z + Math.sin(angle) * radius,
          ];
          const size = 0.72 + random() * 0.56;
          const tilt = 0.3 + random() * 0.42;
          const shade = tone * (0.72 + level * 0.28);
          card(
            center,
            [Math.cos(angle) * size, 0, Math.sin(angle) * size],
            [-Math.sin(angle) * size * tilt, size * 0.85, Math.cos(angle) * size * tilt],
            [shade * palette[0], shade * palette[1], shade * palette[2]],
            true,
            leafRegions[
              Math.abs(branch + Math.floor(x * 0.37) + Math.floor(z * 0.23)) % leafRegions.length
            ],
          );
          if (branch % 5 === 0 && random() > 0.3)
            card(
              center,
              [size * 0.82, 0, 0],
              [0, size * 0.12, size * 0.66],
              [shade * palette[0], shade * palette[1], shade * palette[2]],
              true,
              leafRegions[(branch + 5) % leafRegions.length],
            );
        }
      }
    }
    cached = { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) };
  }
  const result = node('distant_forest_canopy', cached);
  result.shadow = false;
  return result;
}
