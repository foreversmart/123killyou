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
  const startZ = roadSample(ROAD_LENGTH).position[2];
  const endZ = -7.8;
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const z = startZ + (endZ - startZ) * t;
    const x = Math.sin(t * Math.PI) * 0.35;
    const halfWidth = ROAD_HALF_WIDTH + 0.8 + t * 2.1;
    const y = -0.028 + Math.sin(t * Math.PI * 2) * 0.008;
    for (const side of [-1, 1]) {
      g.positions.push(x + side * halfWidth, y, z);
      g.normals.push(0, 1, 0);
      g.uv.push(side * 0.5 + 0.5, t * 2.5);
    }
    if (i < steps) {
      const a = i * 2;
      g.indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  b.add(g, { ...M.stone, color: 0x77796e, rough: 0.98 });
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
  // A broad level turning apron joins the uphill lane to the gate forecourt.
  // It continues all the way to the gate steps so the road does not appear to
  // stop at a hard rectangular seam in front of the temple.
  b.box([25, 0.12, 24], [-3.5, -0.1, 7], { ...M.stone, color: 0x666d62 });
  forecourtBlend(b);
  return b.mesh('switchback_asphalt');
}
