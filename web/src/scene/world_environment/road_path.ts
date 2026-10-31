import type { V3 } from '@/scene/world/types';

// Leave a broad shoulder at both sides of the coach lane.  The previous
// 3.6 m carriageway left only a few decimetres beyond the bus body on the
// outside of a bend, which made the arrival and departure shots feel as if
// the coach was skimming the verge.  The wider carriageway also gives the
// forecourt a believable transition into the mountain road.
export const ROAD_HALF_WIDTH = 4.3;
// Surveyed contour bends: the road gains height across the hillside, with
// generous turning radii for the 9.6 m coach and a level arrival apron.
const controls: V3[] = [
  [86, -38, 155],
  [35, -34, 140],
  [-38, -28, 122],
  [-63, -25, 104],
  [-47, -22, 86],
  [26, -16, 83],
  [57, -13, 66],
  [42, -10, 48],
  [-16, -5.7, 54],
  [-33, -4.2, 48],
  [-40, -3, 34],
  [-33, -1.1, 22],
  [-17, 0, 19],
  [0, 0, 16],
];
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
function curve(segment: number, t: number): V3 {
  const p = controls[Math.max(0, segment - 1)],
    a = controls[segment],
    b = controls[segment + 1],
    n = controls[Math.min(controls.length - 1, segment + 2)];
  return a.map((v, axis) => {
    const m0 = axis === 1 && (p[axis] === v || b[axis] === v) ? 0 : (b[axis] - p[axis]) * 0.55,
      m1 = axis === 1 && n[axis] === b[axis] ? 0 : (n[axis] - v) * 0.55;
    return (
      (2 * t ** 3 - 3 * t * t + 1) * v +
      (t ** 3 - 2 * t * t + t) * m0 +
      (-2 * t ** 3 + 3 * t * t) * b[axis] +
      (t ** 3 - t * t) * m1
    );
  }) as V3;
}
const samples: { position: V3; distance: number }[] = [];
for (let segment = 0; segment < controls.length - 1; segment++)
  for (let step = segment ? 1 : 0; step <= 40; step++) {
    const position = curve(segment, step / 40),
      previous = samples.at(-1);
    const distance = previous
      ? previous.distance + Math.hypot(...position.map((v, i) => v - previous.position[i]))
      : 0;
    samples.push({ position, distance });
  }
export const ROAD_LENGTH = samples.at(-1)!.distance;

function center(distance: number): V3 {
  const d = Math.max(0, Math.min(ROAD_LENGTH, distance));
  let low = 0,
    high = samples.length - 1;
  while (low + 1 < high) {
    const middle = (low + high) >> 1;
    if (samples[middle].distance < d) low = middle;
    else high = middle;
  }
  const a = samples[low],
    b = samples[high],
    t = (d - a.distance) / (b.distance - a.distance);
  return a.position.map((v, i) => mix(v, b.position[i], t)) as V3;
}

/** Distance is measured uphill; a positive lane offset is the uphill right. */
export function roadSample(distance: number, lane = 0) {
  const position = center(distance),
    before = center(distance - 0.8),
    after = center(distance + 0.8);
  const dx = after[0] - before[0],
    dz = after[2] - before[2],
    horizontal = Math.hypot(dx, dz),
    yaw = Math.atan2(dx, dz);
  position[0] += Math.cos(yaw) * lane;
  position[2] -= Math.sin(yaw) * lane;
  const prev = center(distance - 2),
    next = center(distance + 2),
    left = Math.atan2(position[0] - prev[0], position[2] - prev[2]),
    right = Math.atan2(next[0] - position[0], next[2] - position[2]);
  const angle = Math.atan2(Math.sin(right - left), Math.cos(right - left));
  return {
    position,
    yaw,
    pitch: -Math.atan2(after[1] - before[1], horizontal),
    curvature: angle / 2,
  };
}

/** Same centreline grades terrain, places vegetation and constructs asphalt. */
export function roadNearest(x: number, z: number) {
  let closest = Infinity,
    height = 0,
    along = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1],
      b = samples[i],
      dx = b.position[0] - a.position[0],
      dz = b.position[2] - a.position[2];
    const t = Math.max(
      0,
      Math.min(1, ((x - a.position[0]) * dx + (z - a.position[2]) * dz) / (dx * dx + dz * dz)),
    );
    const squared =
      (x - mix(a.position[0], b.position[0], t)) ** 2 +
      (z - mix(a.position[2], b.position[2], t)) ** 2;
    if (squared < closest) {
      closest = squared;
      height = mix(a.position[1], b.position[1], t);
      along = mix(a.distance, b.distance, t);
    }
  }
  return { distance: Math.sqrt(closest), height, along };
}
