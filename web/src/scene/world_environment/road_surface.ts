import { Builder, materials as M } from '@/scene/geometry/builder';
import type { Shape } from '@/scene/geometry/primitives';
import { ROAD_HALF_WIDTH, ROAD_LENGTH, roadSample } from '@/scene/world_environment/road_path';

function ribbon(
  b: Builder,
  left: number,
  right: number,
  lift: number,
  start = 0,
  end = ROAD_LENGTH,
  color = 0x525955,
) {
  const g: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const steps = Math.ceil((end - start) / 0.85);
  for (let i = 0; i <= steps; i++) {
    const distance = start + ((end - start) * i) / steps;
    for (const lane of [left, right]) {
      const frame = roadSample(distance, lane),
        p = frame.position;
      g.positions.push(p[0], p[1] + lift, p[2]);
      g.normals.push(
        Math.sin(frame.yaw) * Math.sin(frame.pitch),
        Math.cos(frame.pitch),
        Math.cos(frame.yaw) * Math.sin(frame.pitch),
      );
      g.uv.push(lane * 0.3, distance * 0.3);
    }
    if (i < steps) {
      const a = i * 2;
      g.indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  b.add(g, { ...M.stone, color, rough: 0.98 });
}

/**
 * The surveyed lane ends on the mountain shoulder above the gate. A shallow,
 * widening stone apron carries that lane down into the temple forecourt so the
 * road reads as one continuous arrival surface instead of two rectangles with
 * a visible edge.
 */
function forecourtBlend(b: Builder) {
  const g: Shape = { positions: [], normals: [], uv: [], indices: [] };
  // Turn the road's final eastward tangent toward the south-facing gate with
  // one broad cubic curve. The transition ends at the front edge of the gate
  // steps; continuing it through the gate base makes the two solids intersect
  // and causes depth-buffer shimmer while the arrival camera moves.
  const end = roadSample(ROAD_LENGTH),
    forward: [number, number] = [Math.sin(end.yaw), Math.cos(end.yaw)],
    p0: [number, number] = [end.position[0], end.position[2]],
    p1: [number, number] = [p0[0] + forward[0] * 5.4, p0[1] + forward[1] * 5.4],
    p3: [number, number] = [0, 1.3],
    p2: [number, number] = [0, 6.4];
  const rows = Array.from({ length: 17 }, (_, i) => {
    const t = i / 16,
      u = 1 - t,
      x = u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
      z = u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1],
      dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]),
      dz = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]),
      tangent = Math.hypot(dx, dz) || 1,
      side = [dz / tangent, -dx / tangent] as [number, number],
      width =
        t < 0.55 ? ROAD_HALF_WIDTH + 0.75 + (t / 0.55) * 15.1 : 20.15 - ((t - 0.55) / 0.45) * 11.25,
      lift = Math.min(1, t / 0.3),
      easedLift = lift * lift * (3 - 2 * lift),
      // Rise just above the distant compound base before the road reaches
      // the forecourt, leaving a deliberate depth margin at the junction.
      y = end.position[1] + easedLift * 0.12;
    return { x, z, side, width, y };
  });
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    for (const side of [-1, 1]) {
      g.positions.push(
        row.x + side * row.side[0] * row.width,
        row.y,
        row.z + side * row.side[1] * row.width,
      );
      g.normals.push(0, 1, 0);
      g.uv.push(side * 0.5 + 0.5, (i / (rows.length - 1)) * 3.2);
    }
    if (i < rows.length - 1) {
      const a = i * 2;
      g.indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  b.add(g, { ...M.stone, color: 0x77796e, rough: 0.98 });

  // A thin gravel shoulder feathers the apron into the surrounding paving.
  // It is deliberately below the stone surface, so the two materials overlap
  // rather than exposing a hard side wall at each widening step.
  const shoulder: Shape = { positions: [], normals: [], uv: [], indices: [] };
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    for (const side of [-1, 1]) {
      const width = row.width + 1.7;
      shoulder.positions.push(
        row.x + side * row.side[0] * width,
        row.y - 0.035,
        row.z + side * row.side[1] * width,
      );
      shoulder.normals.push(0, 1, 0);
      shoulder.uv.push(side * 0.5 + 0.5, i / (rows.length - 1));
    }
    if (i < rows.length - 1) {
      const a = i * 2;
      shoulder.indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  b.add(shoulder, { ...M.stone, color: 0x62675d, rough: 1 });
}

export function roadSurface() {
  const b = new Builder();
  ribbon(b, -ROAD_HALF_WIDTH - 0.65, ROAD_HALF_WIDTH + 0.65, -0.08, 0, ROAD_LENGTH, 0x8b8876);
  ribbon(b, -ROAD_HALF_WIDTH, ROAD_HALF_WIDTH, 0);
  for (const side of [-1, 1]) {
    const edgeMark = ROAD_HALF_WIDTH - 0.34;
    ribbon(b, side * edgeMark - 0.06, side * edgeMark + 0.06, 0.018, 0, ROAD_LENGTH, 0xd3d0af);
    for (let d = 0; d < ROAD_LENGTH - 12; d += 4) {
      const barrierLane = ROAD_HALF_WIDTH + 0.3;
      const p = roadSample(d, side * barrierLane).position;
      b.rod([p[0], p[1] - 0.15, p[2]], [p[0], p[1] + 0.78, p[2]], 0.055, M.stone);
      const next = roadSample(Math.min(d + 4, ROAD_LENGTH - 12), side * barrierLane).position;
      for (const height of [0.43, 0.77])
        b.rod([p[0], p[1] + height, p[2]], [next[0], next[1] + height, next[2]], 0.045, {
          ...M.stone,
          color: 0xa0a49b,
          metal: 0.45,
        });
    }
  }
  for (let d = 0; d < ROAD_LENGTH; d += 7)
    ribbon(b, -0.07, 0.07, 0.022, d, Math.min(d + 3, ROAD_LENGTH), 0xd8c58a);
  // A tapered, overlapping transition now carries the road into the temple
  // slab.  The old rectangular apron ended at a hard seam and left the plaza
  // looking like a separate floating tile.
  forecourtBlend(b);
  return b.mesh('switchback_asphalt');
}
