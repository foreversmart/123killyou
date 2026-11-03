import type { CameraShot, V3 } from '@/scene/world/types';
import {
  OPENING_ROAD_DURATION_MS,
  DEPARTURE_CAMERA_DURATION_MS,
  DEPARTURE_ROAD_DURATION_MS,
} from '@/shared/lib/story_timing';
import { ROAD_LENGTH, roadSample } from '@/scene/world_environment/road_path';
import { roadContact } from '@/scene/world_vehicle/road_contact';

const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixVector = (a: V3, b: V3, t: number): V3 => a.map((v, i) => mix(v, b[i], t)) as V3;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Keep the coach's timing in route metres rather than normalized spline
// progress. A normalized lerp gives the same speed through a straight and a
// hairpin, which makes a large coach look as if it is ignoring the bend. The
// surveyed curvature is converted to a conservative speed limit and
// integrated once for each journey direction so frame updates only need to
// look up the distance reached at the current clock time.
const JOURNEY_TIMING_SAMPLES = 512;
const MIN_CURVE_SPEED = 0.42;
const CURVE_SPEED_SENSITIVITY = 5;
type JourneyTiming = { distances: number[]; elapsed: number[]; total: number };

function curveSpeed(distance: number) {
  return clamp(
    1 - Math.abs(roadSample(distance).curvature) * CURVE_SPEED_SENSITIVITY,
    MIN_CURVE_SPEED,
    1,
  );
}

function createJourneyTiming(start: number, end: number): JourneyTiming {
  const distances = Array.from({ length: JOURNEY_TIMING_SAMPLES + 1 }, (_, index) =>
    mix(start, end, index / JOURNEY_TIMING_SAMPLES),
  );
  const elapsed = [0];
  for (let index = 1; index < distances.length; index++) {
    const segment = Math.abs(distances[index] - distances[index - 1]);
    const midpoint = (distances[index] + distances[index - 1]) / 2;
    elapsed.push(elapsed[index - 1] + segment / curveSpeed(midpoint));
  }
  return { distances, elapsed, total: elapsed.at(-1)! };
}

function timedDistance(timing: JourneyTiming, progress: number) {
  const target = clamp(progress, 0, 1) * timing.total;
  let low = 0,
    high = timing.elapsed.length - 1;
  while (low + 1 < high) {
    const middle = (low + high) >> 1;
    if (timing.elapsed[middle] < target) low = middle;
    else high = middle;
  }
  const segment = timing.elapsed[high] - timing.elapsed[low];
  const local = segment > 0 ? (target - timing.elapsed[low]) / segment : 0;
  return mix(timing.distances[low], timing.distances[high], local);
}
// The departure continues through the next downhill bend after the camera
// settles, leaving the entire coach outside the final wide/portrait frame.
export const JOURNEY_START = ROAD_LENGTH - 172;
const DEPARTURE_CAMERA_END = ROAD_LENGTH - 66;
// Begin around the middle of the surveyed climb so the opening starts from
// the half-mountain approach instead of replaying the lower foothill section.
export const ARRIVAL_START = 180;
export const JOURNEY_END = ROAD_LENGTH - 7;
const arrivalTiming = createJourneyTiming(ARRIVAL_START, JOURNEY_END);
const departureTiming = createJourneyTiming(JOURNEY_END, JOURNEY_START);
const departureCameraTiming = createJourneyTiming(JOURNEY_END, DEPARTURE_CAMERA_END);

function routePosition(distance: number, lane: number): V3 {
  const surveyed = roadSample(clamp(distance, 0, ROAD_LENGTH), lane);
  const extension = distance - clamp(distance, 0, ROAD_LENGTH);
  return [
    surveyed.position[0] + Math.sin(surveyed.yaw) * extension,
    surveyed.position[1] - Math.tan(surveyed.pitch) * extension,
    surveyed.position[2] + Math.cos(surveyed.yaw) * extension,
  ];
}

function routeCamera(distance: number, lane: number, direction: number, scale = 1): CameraShot {
  const position = routePosition(distance, lane);
  const target = scale > 1 ? ([0, 45, -55] as V3) : routePosition(distance + direction * 14, lane);
  return {
    eye: [position[0] + 17 * scale, position[1] + 9 * scale, position[2] + 23 * scale],
    target: [target[0], target[1] + 1.5, target[2]],
    fov: 56,
  };
}

function mixCamera(a: CameraShot, b: CameraShot, t: number): CameraShot {
  return {
    eye: mixVector(a.eye, b.eye, t),
    target: mixVector(a.target, b.target, t),
    fov: mix(a.fov ?? 55, b.fov ?? 55, t),
  };
}

// Local +Z is the coach's nose. Both journeys keep to their own right lane,
// with wheel travel and body pitch derived from the same surveyed road.
export function journeyFrame(time: number, departing: boolean) {
  const duration = (departing ? DEPARTURE_ROAD_DURATION_MS : OPENING_ROAD_DURATION_MS) / 1000;
  const progress = smooth(Math.max(0, Math.min(1, time / duration)));
  const direction = departing ? -1 : 1,
    // Keep the coach in the right-hand lane while leaving a generous visual
    // buffer between the outer bodywork and the road edge.
    lane = direction * 1.5;
  const start = departing ? JOURNEY_END : ARRIVAL_START,
    // Ease the shot in/out, then apply the curvature timing map. The latter
    // spends more clock time in bends while preserving the authored endpoints.
    along = timedDistance(departing ? departureTiming : arrivalTiming, progress);
  const frame = roadSample(along, lane),
    before = roadSample(along - direction * 0.2, lane).position,
    after = roadSample(along + direction * 0.2, lane).position;
  const dx = after[0] - before[0],
    dz = after[2] - before[2];
  const yaw = Math.atan2(dx, dz),
    contact = roadContact(frame.position, yaw);
  let distance = 0,
    previous = roadSample(start, lane).position;
  // The full mountain route is now used for arrival. Keep the travelled
  // distance accurate across its tighter lower bends so wheel rotation and
  // the coach position never drift apart over the longer establishing shot.
  for (let i = 1; i <= 256; i++) {
    const next = roadSample(mix(start, along, i / 256), lane).position;
    distance += Math.hypot(...next.map((v, axis) => v - previous[axis]));
    previous = next;
  }
  const [x, y, z] = contact.position;
  // Keep one continuous arrival move above the coach. The first frame starts
  // over the half-mountain road, then the eye and look-at point move steadily
  // toward the gate without a distant pull-out or a second push-in.
  const arrivalCamera = (() => {
    const t = smooth(Math.pow(progress, 1.05));
    return {
      eye: mixVector([x + 12, y + 46, z + 38], [25, 30, 43], t),
      target: mixVector([x, y + 1.5, z + 28], [0, 2, -2], t),
      // Keep a wide enough lens for the coach to remain readable while the
      // camera advances over the road, including portrait framing.
      fov: 72,
    };
  })();
  // Finish the pull-away on its own clock, then keep the exact same eye,
  // target and lens while the coach continues downhill. The vehicle clock
  // never restarts at this handoff, so it does not stop before leaving frame.
  const departureCameraProgress = smooth(clamp(time / (DEPARTURE_CAMERA_DURATION_MS / 1000), 0, 1));
  const cameraAlong = timedDistance(departureCameraTiming, departureCameraProgress);
  const cameraRoad = roadSample(cameraAlong, -1.5);
  const [cx, cy, cz] = roadContact(cameraRoad.position, cameraRoad.yaw + Math.PI).position;
  const nearOffset: V3 = [17, 9, 23];
  const farOffset: V3 = [73, 53, 94];
  const departureEye = [
    cx + mix(nearOffset[0], farOffset[0], departureCameraProgress),
    cy + mix(nearOffset[1], farOffset[1], departureCameraProgress),
    cz + mix(nearOffset[2], farOffset[2], departureCameraProgress),
  ] as V3;
  const departureTarget = mixVector(
    [cx, cy + 1.5, cz],
    [0, 45, -55],
    departureCameraProgress * 0.6,
  );
  const departureFollowCamera: CameraShot = {
    eye: departureEye,
    target: departureTarget,
    fov: mix(56, 60, departureCameraProgress),
  };
  const intro = 1 - smooth(clamp(departureCameraProgress / 0.16, 0, 1));
  const entryCamera = routeCamera(start + direction * 24, lane, direction);
  const camera = departing ? mixCamera(departureFollowCamera, entryCamera, intro) : arrivalCamera;
  return {
    ...contact,
    yaw,
    distance,
    along,
    steering: Math.atan(5.6 * roadSample(along).curvature * direction),
    camera,
  };
}
