import type { Builder } from '@/scene/geometry/builder';
import type { Geometry } from '@/scene/world/types';
import {
  mountainHeight,
  noise,
  rockExposure,
  smooth,
} from '@/scene/world_environment/terrain_noise';
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
let cachedCliffs: Geometry | undefined;

function cliffBands(): Geometry {
  if (cachedCliffs) return cachedCliffs;
  const vertices: number[] = [],
    indices: number[] = [];
  let seed = 1097;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const addVertex = (
    p: [number, number, number],
    n: [number, number, number],
    uv: [number, number],
  ) => {
    vertices.push(
      ...p,
      ...n,
      0.25 + n[1] * 0.08,
      0.28 + n[1] * 0.06,
      0.25 + n[1] * 0.04,
      0.96,
      0,
      4,
      0,
      ...uv,
      -1,
    );
    return vertices.length / 16 - 1;
  };
  const addFace = (
    corners: [
      [number, number, number],
      [number, number, number],
      [number, number, number],
      [number, number, number],
    ],
    normal: [number, number, number],
  ) => {
    const base = corners.map((corner, i) =>
      addVertex(corner, normal, [i === 1 || i === 2 ? 1 : 0, i > 1 ? 0 : 1]),
    );
    indices.push(base[0], base[1], base[2], base[0], base[2], base[3]);
  };
  // Small strata are scattered only where the height field forms a genuinely
  // steep face. Each ledge has a distinct lip and broken runout, avoiding the
  // repeated low-poly boulders that used to read as a regular garden bed.
  for (let z = -350; z < 190; z += 9) {
    for (let x = -310; x < 315; x += 10) {
      if (templeClearance(x, z) < 7) continue;
      if (z > 0 && z < 175 && Math.abs(x) < 150 && roadNearest(x, z).distance < 10) continue;
      const exposure = rockExposure(x, z);
      if (exposure < 0.48 || random() > 0.22 + exposure * 0.5) continue;
      const step = 2.5,
        dx = (mountainHeight(x + step, z) - mountainHeight(x - step, z)) / (2 * step),
        dz = (mountainHeight(x, z + step) - mountainHeight(x, z - step)) / (2 * step),
        grade = Math.max(0.4, Math.hypot(dx, dz)),
        downhill: [number, number] = [-dx / grade, -dz / grade],
        tangent: [number, number] = [-downhill[1], downhill[0]],
        width = 2.1 + random() * 4.2,
        depth = 0.9 + exposure * (1.5 + random() * 2.2),
        drop = 0.75 + exposure * (0.9 + random() * 1.7),
        y = terrainHeight(x, z) + 0.07;
      const jitter = (random() - 0.5) * 0.8;
      const tx = tangent[0] * (width * 0.5),
        tz = tangent[1] * (width * 0.5),
        fx = downhill[0] * depth,
        fz = downhill[1] * depth;
      const topLeft: [number, number, number] = [x - tx, y, z - tz],
        topRight: [number, number, number] = [x + tx, y + jitter * 0.1, z + tz],
        bottomLeft: [number, number, number] = [x - tx + fx, y - drop, z - tz + fz],
        bottomRight: [number, number, number] = [
          x + tx + fx,
          y - drop + jitter * 0.08,
          z + tz + fz,
        ];
      const normal: [number, number, number] = [downhill[0] * 0.84, 0.5, downhill[1] * 0.84];
      addFace([topLeft, topRight, bottomRight, bottomLeft], normal);
      // A narrow, uneven cap catches the light and gives each face a readable
      // fractured edge instead of a clean vertical cut.
      const capDepth = 0.28 + random() * 0.36;
      addFace(
        [
          topLeft,
          topRight,
          [
            topRight[0] + downhill[0] * capDepth,
            topRight[1] - 0.06,
            topRight[2] + downhill[1] * capDepth,
          ],
          [
            topLeft[0] + downhill[0] * capDepth,
            topLeft[1] - 0.06,
            topLeft[2] + downhill[1] * capDepth,
          ],
        ],
        [0, 0.96, 0],
      );
    }
  }
  cachedCliffs = { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) };
  return cachedCliffs;
}

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
  b.merge(cliffBands(), [0, 0, 0]);
}
