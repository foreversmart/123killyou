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

export function createDistanceGait(origin: V3, startTime = 0, initial?: DistanceGait) {
  let previous = [...origin];
  let previousTime = startTime;
  let movingDistance = initial?.moving ? START_DISTANCE : 0;
  let gait: DistanceGait = initial || { distance: 0, phase: 0, weight: 0, moving: false };
  return (position: V3, time: number): DistanceGait => {
    // Paused renders must preserve the raised foot, including motionPaused
    // frames whose renderer delta is still nonzero.
    if (time === previousTime) return gait;
    if (time < previousTime) {
      previous = [...position];
      previousTime = time;
      movingDistance = 0;
      return (gait = { distance: 0, phase: 0, weight: 0, moving: false });
    }
    const distance = Math.hypot(position[0] - previous[0], position[2] - previous[2]);
    const speed = distance / (time - previousTime);
    previous = [...position];
    previousTime = time;
    // No per-frame displacement cutoff: a slow drift still needs a small step.
    const moving = distance > 0;
    movingDistance = moving ? movingDistance + distance : 0;
    const total = gait.distance + distance;
    gait = {
      distance: total,
      phase: (total / STRIDE_DISTANCE) * Math.PI * 2,
      // A gentle shuffle must remain visible in a wide shot. The distance
      // envelope still limits very short moves, without burying slow lifts
      // beneath a millimetre as a linear speed multiplier would.
      weight: moving
        ? Math.min(1, Math.sqrt(speed / FULL_STEP_SPEED), movingDistance / START_DISTANCE)
        : 0,
      moving,
    };
    return gait;
  };
}
