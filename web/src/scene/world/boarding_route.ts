import type { SceneActor } from '@/shared/types/game';
import type { V3 } from '@/scene/world/types';
import { actorPositions } from '@/scene/world/placement';

// Move the departure coach clear of the temple's stone side rail. Its right
// passenger door faces the group and opens onto the unobstructed forecourt.
export const BOARDING_COACH_POSITION: V3 = [-6.4, 0, 6];
export const BOARDING_COACH_YAW = Math.PI;
export const BOARDING_DOOR_Z = BOARDING_COACH_POSITION[2] - 3.91;

const passengers = ['linlan', 'zhouyan', 'xuzhi', 'player'];

/** The guests approach together, form one short queue, then climb the open door. */
export function boardingMovement(actor: SceneActor) {
  const index = passengers.indexOf(actor.id);
  if (index < 0) return undefined;
  const from: V3 = actorPositions.gate?.[actor.id] || [0.3, 0, 4.1];
  const queueX = -4.25 + index * 0.85;
  const delay = index * 1.2;
  const duration = index === 3 ? 11.2 : 9.6 + index * 0.5;
  const path: V3[] = [
    [...from],
    [queueX, 0, from[2]],
    [queueX, 0, BOARDING_DOOR_Z],
    [-4.5, 0, BOARDING_DOOR_Z],
    [-4.93, 0.36, BOARDING_DOOR_Z],
    [-5.29, 0.72, BOARDING_DOOR_Z],
    [-5.65, 1.08, BOARDING_DOOR_Z],
    [-6.05, 1.08, BOARDING_DOOR_Z],
    [-6.4, 1.08, BOARDING_DOOR_Z],
    [-6.4, 1.08, 6.1 - index * 0.9],
  ];
  return {
    from: path[0],
    to: path.at(-1)!,
    path,
    pathTimes: [
      0,
      3.8,
      4.6,
      5 + delay,
      5.35 + delay,
      5.7 + delay,
      6.05 + delay,
      6.4 + delay,
      6.7 + delay,
      duration,
    ],
    duration,
    endFacing: 0,
  };
}

/** Authored times keep the queue spaced while the front passenger takes the steps. */
export function timedPathPosition(path: V3[], times: number[], time: number): V3 {
  if (time <= times[0]) return [...path[0]];
  for (let i = 1; i < times.length; i++) {
    if (time > times[i]) continue;
    if (time === times[i]) return [...path[i]];
    const progress = (time - times[i - 1]) / (times[i] - times[i - 1]);
    return path[i - 1].map((value, axis) => value + (path[i][axis] - value) * progress) as V3;
  }
  return [...path.at(-1)!];
}
