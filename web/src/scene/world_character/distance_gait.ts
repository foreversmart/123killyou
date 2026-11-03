import type { V3 } from '@/scene/world/types';

export type DistanceGait = {
  distance: number;
  phase: number;
  weight: number;
  moving: boolean;
};

// One left/right pair covers a metre. Time changes the size of a step, never
// the number of steps, so slowing a route cannot create extra footfalls.
const STRIDE_DISTANCE = 1;
const FULL_STEP_SPEED = 0.8;
const START_DISTANCE = 0.12;
const WEIGHT_RESPONSE_SECONDS = 0.06;
const FOOT_SETTLE_SECONDS = 0.16;

export function createDistanceGait(origin: V3, startTime = 0, initial?: DistanceGait) {
  let previous = [...origin];
  let previousTime = startTime;
  let movingDistance = initial?.moving ? START_DISTANCE : 0;
  let gait: DistanceGait = initial || { distance: 0, phase: 0, weight: 0, moving: false };
  let stopTime: number | undefined;
  let stopWeight = 0;
  return (position: V3, time: number): DistanceGait => {
    // Paused renders must preserve the raised foot, including motionPaused
    // frames whose renderer delta is still nonzero.
    if (time === previousTime) return gait;
    if (time < previousTime) {
      previous = [...position];
      previousTime = time;
      movingDistance = 0;
      stopTime = undefined;
      return (gait = { distance: 0, phase: 0, weight: 0, moving: false });
    }
    const distance = Math.hypot(position[0] - previous[0], position[2] - previous[2]);
    const delta = time - previousTime;
    const speed = distance / delta;
    const lastTime = previousTime;
    previous = [...position];
    previousTime = time;
    // No per-frame displacement cutoff: a slow drift still needs a small step.
    const moving = distance > 0;
    movingDistance = moving ? movingDistance + distance : 0;
    const total = gait.distance + distance;
    let weight: number;
    if (moving) {
      stopTime = undefined;
      const target = Math.min(
        1,
        Math.sqrt(speed / FULL_STEP_SPEED),
        movingDistance / START_DISTANCE,
      );
      weight =
        gait.weight + (target - gait.weight) * (1 - Math.exp(-delta / WEIGHT_RESPONSE_SECONDS));
    } else {
      if (stopTime === undefined) {
        stopTime = lastTime;
        stopWeight = gait.weight;
      }
      // A stop only lowers the foot already in flight. Freeze its phase so
      // stationary actors cannot start another step or keep marching in place.
      const settle = Math.min(1, (time - stopTime) / FOOT_SETTLE_SECONDS);
      weight = stopWeight * (1 - settle * settle * (3 - 2 * settle));
    }
    gait = {
      distance: total,
      phase: (total / STRIDE_DISTANCE) * Math.PI * 2,
      // A gentle shuffle must remain visible in a wide shot. The distance
      // envelope still limits very short moves, without burying slow lifts
      // beneath a millimetre as a linear speed multiplier would.
      weight,
      moving,
    };
    return gait;
  };
}
