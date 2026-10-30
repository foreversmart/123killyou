import type { CameraShot, V3 } from '@/scene/world/types';
import { OPENING_ROAD_DURATION_MS, DEPARTURE_ROAD_DURATION_MS } from '@/shared/lib/story_timing';

export const roadCenter = (z: number) => Math.sin(z * 0.035) * 4;
export const roadTangent = (z: number) => Math.cos(z * 0.035) * 0.14;
const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixVector = (a: V3, b: V3, t: number): V3 => a.map((v, i) => mix(v, b[i], t)) as V3;

// The temple is at negative Z. Local +Z is the coach's nose; arriving and
// departing use opposite lanes and yaw follows the tangent, never the camera.
export function journeyFrame(time: number, departing: boolean) {
  const duration = (departing ? DEPARTURE_ROAD_DURATION_MS : OPENING_ROAD_DURATION_MS) / 1000;
  const progress = smooth(Math.max(0, Math.min(1, time / duration)));
  const start = departing ? -13.5 : 17;
  const end = departing ? 17 : -13.5;
  const direction = departing ? 1 : -1;
  const z = mix(start, end, progress);
  const x = roadCenter(z) - direction * 1.53;
  let distance = 0;
  // Integrate the curved path so the tyres roll by metres travelled, including
  // after seeking, pausing, or rebuilding the world for a save acknowledgement.
  let previousZ = start;
  for (let i = 1; i <= 32; i++) {
    const nextZ = mix(start, z, i / 32);
    distance += Math.hypot(nextZ - previousZ, roadCenter(nextZ) - roadCenter(previousZ));
    previousZ = nextZ;
  }
  const tangent = roadTangent(z);
  const curvature = (-0.0049 * Math.sin(z * 0.035)) / (1 + tangent * tangent) ** 1.5;
  const position: V3 = [x, 0, z];
  // Begin beside the coach, then crane back and up to reveal the route and
  // temple together. Keep the whole vehicle in portrait as well as landscape.
  const camera: CameraShot = {
    eye: [x + mix(12, 26, progress), mix(4.5, 19, progress), z + mix(12, 32, progress)],
    target: mixVector([x, 1.5, z], [-6, 1.6, -20], progress * progress * 0.45),
    fov: mix(48, 54, progress),
  };
  return {
    position,
    yaw: Math.atan(tangent) + (departing ? 0 : Math.PI),
    distance,
    steering: Math.atan(5.6 * curvature * direction),
    camera,
  };
}
