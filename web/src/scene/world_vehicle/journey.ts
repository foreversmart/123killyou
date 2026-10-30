import type { CameraShot, V3 } from '@/scene/world/types';
import { OPENING_ROAD_DURATION_MS, DEPARTURE_ROAD_DURATION_MS } from '@/shared/lib/story_timing';
import { ROAD_LENGTH, roadSample } from '@/scene/world_environment/road_path';
import { roadContact } from '@/scene/world_vehicle/road_contact';

const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixVector = (a: V3, b: V3, t: number): V3 => a.map((v, i) => mix(v, b[i], t)) as V3;
export const JOURNEY_START = ROAD_LENGTH - 66;
export const JOURNEY_END = ROAD_LENGTH - 7;

// Local +Z is the coach's nose. Both journeys keep to their own right lane,
// with wheel travel and body pitch derived from the same surveyed road.
export function journeyFrame(time: number, departing: boolean) {
  const duration = (departing ? DEPARTURE_ROAD_DURATION_MS : OPENING_ROAD_DURATION_MS) / 1000;
  const progress = smooth(Math.max(0, Math.min(1, time / duration)));
  const direction = departing ? -1 : 1,
    lane = direction * 1.65;
  const start = departing ? JOURNEY_END : JOURNEY_START,
    end = departing ? JOURNEY_START : JOURNEY_END,
    along = mix(start, end, progress);
  const frame = roadSample(along, lane),
    before = roadSample(along - direction * 0.2, lane).position,
    after = roadSample(along + direction * 0.2, lane).position;
  const dx = after[0] - before[0],
    dz = after[2] - before[2];
  const yaw = Math.atan2(dx, dz),
    contact = roadContact(frame.position, yaw);
  let distance = 0,
    previous = roadSample(start, lane).position;
  for (let i = 1; i <= 64; i++) {
    const next = roadSample(mix(start, along, i / 64), lane).position;
    distance += Math.hypot(...next.map((v, axis) => v - previous[axis]));
    previous = next;
  }
  const [x, y, z] = contact.position;
  const camera: CameraShot = {
    eye: [x + mix(17, 73, progress), y + mix(9, 53, progress), z + mix(23, 94, progress)],
    target: mixVector([x, y + 1.5, z], [0, 45, -55], progress * 0.6),
    fov: mix(50, 60, progress),
  };
  return {
    ...contact,
    yaw,
    distance,
    along,
    steering: Math.atan(5.6 * roadSample(along).curvature * direction),
    camera,
  };
}
