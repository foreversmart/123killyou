import type { V3 } from '@/scene/world/types';

type VisitStop = { offset: [number, number]; look: [number, number]; wait: number; walk: number };

const TURN_SLOWDOWN = 5;
const OBSERVATION_TURN_SECONDS = 0.85 * TURN_SLOWDOWN;
const DEPARTURE_TURN_SECONDS = 0.9 * TURN_SLOWDOWN;
// Keep the observation pause between turns and finish facing the route
// before walking. Longer turns need their own time at each planted stop.
const stopWait = (stop: VisitStop) => stop.wait + (0.85 + 0.9) * (TURN_SLOWDOWN - 1);

// Each visitor stays in a separate clear part of the forecourt. Stops are
// measured from their established position, independently of dialogue beats.
const visits: Record<string, VisitStop[]> = {
  linlan: [
    { offset: [0, 0], look: [0, -2], wait: 2.4, walk: 4.8 },
    { offset: [-0.85, 0.3], look: [0, -2], wait: 4.6, walk: 5.2 },
    { offset: [0.25, 0.8], look: [-2.7, -0.8], wait: 3.8, walk: 4.5 },
    { offset: [0.55, -0.15], look: [0, -2], wait: 5.2, walk: 3.8 },
  ],
  zhouyan: [
    { offset: [0, 0], look: [-3.9, -1.9], wait: 3.2, walk: 4.2 },
    { offset: [0.65, -0.15], look: [0, -2], wait: 5.4, walk: 5.5 },
    { offset: [-0.3, 0.55], look: [-3.9, -1.9], wait: 4.2, walk: 4.4 },
  ],
  xuzhi: [
    { offset: [0, 0], look: [0, -2], wait: 4.1, walk: 4.3 },
    { offset: [-0.8, 0.25], look: [-2.7, -0.8], wait: 3.7, walk: 5.1 },
    { offset: [0.4, 0.35], look: [3.9, -0.8], wait: 4.9, walk: 3.8 },
  ],
  luchen: [
    { offset: [0, 0], look: [0.4, 3], wait: 3.8, walk: 4.5 },
    { offset: [-0.65, -0.25], look: [1.5, 2.8], wait: 5.7, walk: 5.4 },
    { offset: [0.55, -0.3], look: [-2, 2.5], wait: 4.8, walk: 4.1 },
  ],
};

const smooth = (value: number) => {
  const p = Math.max(0, Math.min(1, value));
  return p * p * p * (p * (p * 6 - 15) + 10);
};
const heading = (from: V3, to: V3) => Math.atan2(to[0] - from[0], to[2] - from[2]);
const turn = (from: number, to: number, amount: number) =>
  from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * smooth(amount);

/** A closed walk with zero speed at every stop and no reset at its loop seam. */
export function gateVisitPose(id: string, time: number, base: V3) {
  const stops = visits[id];
  if (!stops) return { position: base, facing: 0 };
  const point = (stop: VisitStop): V3 => [
    base[0] + stop.offset[0],
    base[1],
    base[2] + stop.offset[1],
  ];
  const duration = stops.reduce((sum, stop) => sum + stopWait(stop) + stop.walk, 0);
  let elapsed = Math.max(0, time) % duration;
  for (let index = 0; index < stops.length; index++) {
    const stop = stops[index];
    const next = stops[(index + 1) % stops.length];
    const from = point(stop);
    const to = point(next);
    const travelFacing = heading(from, to);
    const wait = stopWait(stop);
    if (elapsed < wait) {
      const incoming = heading(point(stops[(index + stops.length - 1) % stops.length]), from);
      const look = heading(from, [stop.look[0], base[1], stop.look[1]]);
      const settled =
        index === 0 && time < wait
          ? look
          : turn(incoming, look, elapsed / OBSERVATION_TURN_SECONDS);
      return {
        position: from,
        facing: turn(
          settled,
          travelFacing,
          (elapsed - wait + DEPARTURE_TURN_SECONDS) / DEPARTURE_TURN_SECONDS,
        ),
      };
    }
    if (elapsed < wait + stop.walk) {
      const progress = smooth((elapsed - wait) / stop.walk);
      return {
        position: from.map((value, axis) => value + (to[axis] - value) * progress) as V3,
        facing: travelFacing,
      };
    }
    elapsed -= wait + stop.walk;
  }
  return { position: base, facing: 0 };
}
