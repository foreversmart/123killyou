import type { Builder } from '@/scene/geometry/builder';
import type { Geometry } from '@/scene/world/types';
import { mountainHeight, noise, smooth } from '@/scene/world_environment/terrain_noise';
import { roadNearest, ROAD_HALF_WIDTH } from '@/scene/world_environment/road_path';

// The temple is cut into a broad shoulder. Its local floor is zero; the valley
// drops below it while successive ridges continue climbing behind the enclosure.
export function templeClearance(x: number, z: number) {
  return Math.max(Math.abs(x) - 32, -62 - z, z - 12);
}

export function terrainHeight(x: number, z: number, _road = false) {
  const clearance = templeClearance(x, z);
  if (clearance <= 0) return -0.16;
  const shelf = smooth(clearance / 27);
  let height = -0.16 + (mountainHeight(x, z) + 0.16) * shelf;
  const apron = Math.max(-15 - x, x - 8, 6.5 - z, z - 17.5);
  height += (-0.16 - height) * (1 - smooth(apron / 6));
  if (z > 0 && z < 175 && Math.abs(x) < 125) {
    const nearest = roadNearest(x, z);
    const blend =
      (1 - smooth((nearest.distance - ROAD_HALF_WIDTH - 0.8) / 7)) * smooth(clearance / 2);
    height += (nearest.height - 0.16 - height) * blend;
  }
  return height;
}

function axis(start: number, end: number, fineStart: number, fineEnd: number) {
  const values = [start];
  while (values[values.length - 1] < end) {
    const value = values[values.length - 1];
    const step = value >= fineStart && value < fineEnd ? 1.7 : 6;
    values.push(Math.min(end, value + step));
  }
  return values;
}

let cached: Geometry | undefined;
export function landscape(b: Builder, _road = false) {
  if (!cached) {
    const xs = axis(-350, 350, -115, 115),
      zs = axis(-420, 250, -85, 170);
    const width = xs.length,
      depth = zs.length;
    const heights = new Float32Array(width * depth);
    for (let j = 0; j < depth; j++)
      for (let i = 0; i < width; i++) heights[j * width + i] = terrainHeight(xs[i], zs[j]);
    const vertices: number[] = [],
      indices: number[] = [];
    for (let j = 0; j < depth; j++) {
      for (let i = 0; i < width; i++) {
        const x = xs[i],
          z = zs[j],
          y = heights[j * width + i];
        const left = Math.max(0, i - 1),
          right = Math.min(width - 1, i + 1);
        const back = Math.max(0, j - 1),
          front = Math.min(depth - 1, j + 1);
        const dx =
          (heights[j * width + left] - heights[j * width + right]) / (xs[right] - xs[left]);
        const dz =
          (heights[back * width + i] - heights[front * width + i]) / (zs[front] - zs[back]);
        const length = Math.hypot(dx, 1, dz),
          ny = 1 / length;
        const rocky = smooth((0.78 - ny) / 0.38);
        const tone = 0.82 + noise(x / 28 + 9, z / 28) * 0.28;
        vertices.push(
          x,
          y,
          z,
          dx / length,
          ny,
          dz / length,
          (0.28 + rocky * 0.13) * tone,
          (0.36 + rocky * 0.04) * tone,
          (0.19 + rocky * 0.17) * tone,
          1,
          0,
          9,
          0,
          x * 0.4,
          z * 0.4,
          -1,
        );
        if (i < width - 1 && j < depth - 1) {
          const a = j * width + i,
            c = a + width;
          indices.push(a, c, a + 1, a + 1, c, c + 1);
        }
      }
    }
    cached = { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) };
  }
  b.merge(cached, [0, 0, 0]);
}
