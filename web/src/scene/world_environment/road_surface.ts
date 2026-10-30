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

export function roadSurface() {
  const b = new Builder();
  ribbon(b, -ROAD_HALF_WIDTH - 0.65, ROAD_HALF_WIDTH + 0.65, -0.08, 0, ROAD_LENGTH, 0x8b8876);
  ribbon(b, -ROAD_HALF_WIDTH, ROAD_HALF_WIDTH, 0);
  for (const side of [-1, 1]) {
    ribbon(b, side * 3.26 - 0.06, side * 3.26 + 0.06, 0.018, 0, ROAD_LENGTH, 0xd3d0af);
    for (let d = 0; d < ROAD_LENGTH - 12; d += 4) {
      const p = roadSample(d, side * 4).position;
      b.rod([p[0], p[1] - 0.15, p[2]], [p[0], p[1] + 0.78, p[2]], 0.055, M.stone);
      const next = roadSample(Math.min(d + 4, ROAD_LENGTH - 12), side * 4).position;
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
  b.box([23, 0.12, 11], [-3.5, -0.1, 12], { ...M.stone, color: 0x666d62 });
  return b.mesh('switchback_asphalt');
}
