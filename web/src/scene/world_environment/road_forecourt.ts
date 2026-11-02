import { Builder, materials as M } from '@/scene/geometry/builder';
import type { Shape } from '@/scene/geometry/primitives';
import type { V3 } from '@/scene/world/types';
import {
  ROAD_HALF_WIDTH,
  ROAD_LENGTH,
  ROAD_SURFACE_SPACING,
  roadSample,
} from '@/scene/world_environment/road_path';
import { terrainHeight } from '@/scene/world_environment/terrain';

/** A single, non-overlapping apron, bounded by the actual inner road edge. */
export function roadForecourt() {
  const b = new Builder();
  // Chords are kept shorter than the road ribbon's sampling interval. The
  // return bend is tight enough that a long chord would bow into the lane.
  const steps = Math.ceil(ROAD_LENGTH / (ROAD_SURFACE_SPACING / 4));
  const edge: V3[] = [];
  for (let i = steps; i >= 0; i--) {
    const p = roadSample((ROAD_LENGTH * i) / steps, ROAD_HALF_WIDTH + 0.65).position;
    edge.push([p[0], p[1] + 0.02, p[2]]);
    if (p[0] < -20.5) break;
  }
  const outside = edge.pop()!,
    inside = edge.at(-1)!,
    t = (-20.5 - inside[0]) / (outside[0] - inside[0]);
  edge.push(inside.map((v, axis) => v + (outside[axis] - v) * t) as V3);
  const mouth = roadSample(ROAD_LENGTH, -ROAD_HALF_WIDTH - 0.65).position;
  // Sweeping a widening cross-section around this tight turn folds its inner
  // edge over itself. This star-shaped perimeter instead meets the road once,
  // follows its exact sampled shoulder and stops before the gate's first stair.
  const perimeter: V3[] = [
    [mouth[0], mouth[1] + 0.02, mouth[2]],
    [8, 0.11, 20.5],
    [16, 0.11, 18],
    [20.5, 0.11, 15.1],
    [20.5, 0.11, 1.42],
    [-20.5, 0.11, 1.42],
    ...edge.reverse(),
  ];
  const center: V3 = [0, 0.11, 6];
  const top: Shape = { positions: [...center], normals: [0, 1, 0], uv: [0, 0], indices: [] };
  for (const [x, y, z] of perimeter) {
    top.positions.push(x, y, z);
    top.normals.push(0, 1, 0);
    top.uv.push(x * 0.3, z * 0.3);
  }
  for (let i = 0; i < perimeter.length; i++)
    top.indices.push(0, i + 1, ((i + 1) % perimeter.length) + 1);
  b.add(top, { ...M.stone, color: 0x77796e, rough: 0.98 });

  // Only the exposed perimeter gets gravel. Join along edges instead of
  // putting a second filled apron underneath, and grade it into the hillside.
  const skirt: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const outer = perimeter.slice(0, 7).map(([x, , z], i): V3 => {
    const dx = x - center[0],
      dz = z - center[2],
      length = Math.hypot(dx, dz);
    const ox = x + (dx / length) * 1.7,
      oz = Math.max(1.42, z + (dz / length) * 1.7);
    // At the two road joins the shoulder meets the existing gravel height.
    const y = i === 0 || i === 6 ? perimeter[i][1] - 0.1 : terrainHeight(ox, oz) + 0.012;
    return [ox, y, oz];
  });
  for (let i = 0; i < 6; i++) {
    if (i === 4 || i === 5) continue; // No gravel across the stairs or road edge.
    const base = skirt.positions.length / 3;
    for (const p of [perimeter[i], outer[i], perimeter[i + 1], outer[i + 1]]) {
      skirt.positions.push(...p);
      skirt.normals.push(0, 1, 0);
      skirt.uv.push(p[0] * 0.3, p[2] * 0.3);
    }
    skirt.indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
  }
  b.add(skirt, { ...M.stone, color: 0x62675d, rough: 1 });
  return b.build();
}
