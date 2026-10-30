import { node, type Geometry, type V3 } from '@/scene/world/types';
import { terrainHeight, templeClearance } from '@/scene/world_environment/terrain';
import { noise, smooth } from '@/scene/world_environment/terrain_noise';
import { roadNearest } from '@/scene/world_environment/road_path';

let cached: Geometry | undefined;
// library.json surface 7 is the scanned tree's alpha-cutout leaf atlas. Use its
// leafy left portion; the right edge contains unrelated trunk / branch islands.
const leafPattern = 16 + 7;

export function forestCanopy() {
  if (!cached) {
    const vertices: number[] = [],
      indices: number[] = [];
    let seed = 942;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    function card(center: V3, right: V3, up: V3, color: V3, leaf = true) {
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
          leaf ? (sx + 1) * 0.325 + 0.01 : (sx + 1) / 2,
          (1 - sy) / 2,
          -1,
        );
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    // Dense, irregular spacing overlaps the scan belt, so no circular LOD edge
    // appears. Small leaf cards create a porous canopy instead of solid blobs.
    for (let z0 = -390; z0 < 215; z0 += 8) {
      for (let x0 = -325; x0 < 325; x0 += 8) {
        const x = x0 + random() * 7,
          z = z0 + random() * 7;
        const distance = Math.hypot(x, z + 16);
        if (templeClearance(x, z) < 8 || random() > 0.2 + 0.8 * smooth((distance - 38) / 95))
          continue;
        if (z > 10 && z < 175 && Math.abs(x) < 125 && roadNearest(x, z).distance < 10) continue;
        const y = terrainHeight(x, z);
        const slope = Math.hypot(terrainHeight(x + 3, z) - y, terrainHeight(x, z + 3) - y) / 3;
        if (slope > 1.45 || random() < 0.06 + Math.max(0, y - 135) / 280) continue;
        const height = 6.5 + random() * 5.5,
          width = 2.4 + random() * 1.5;
        const tone = 0.78 + noise(x / 32, z / 32) * 0.3 + random() * 0.1;
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
        for (let branch = 0; branch < 24; branch++) {
          const angle = branch * 2.399 + random() * 0.4;
          const level = branch / 24;
          const radius = width * Math.sin(Math.PI * (0.12 + level * 0.76)) * (0.6 + random() * 0.4);
          const center: V3 = [
            x + Math.cos(angle) * radius,
            y + height * (0.32 + level * 0.64),
            z + Math.sin(angle) * radius,
          ];
          const size = 0.95 + random() * 0.85;
          const tilt = 0.35 + random() * 0.45;
          const shade = tone * (0.72 + level * 0.28);
          card(
            center,
            [Math.cos(angle) * size, 0, Math.sin(angle) * size],
            [-Math.sin(angle) * size * tilt, size * 0.85, Math.cos(angle) * size * tilt],
            [shade, shade, shade * 0.96],
          );
          if (branch % 3 === 0)
            card(center, [size, 0, 0], [0, size * 0.14, size * 0.8], [shade, shade, shade * 0.96]);
        }
      }
    }
    cached = { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) };
  }
  const result = node('distant_forest_canopy', cached);
  result.shadow = false;
  return result;
}
