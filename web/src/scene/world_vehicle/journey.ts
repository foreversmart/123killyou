import type { CameraShot, V3 } from '@/scene/world/types';
import { OPENING_ROAD_DURATION_MS, DEPARTURE_ROAD_DURATION_MS } from '@/shared/lib/story_timing';
import { ROAD_LENGTH, roadSample } from '@/scene/world_environment/road_path';
import { roadContact } from '@/scene/world_vehicle/road_contact';

const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixVector = (a: V3, b: V3, t: number): V3 => a.map((v, i) => mix(v, b[i], t)) as V3;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
// Distance is measured from the lower road controls toward the temple. Start
// at the first surveyed point so the arrival shot visibly climbs from the
// mountain foot instead of appearing halfway up the final bend.
export const JOURNEY_START = ROAD_LENGTH - 66;
// Leave a short surveyed lead-in so the coach's rear axle is already on the
// pavement at the first frame while still starting at the lower mountain
// approach, well before the final temple bends.
export const ARRIVAL_START = 10;
export const JOURNEY_END = ROAD_LENGTH - 7;

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
  // A distant opening camera looks back along the mountain road so the coach
  // starts beyond the frame. Once it has entered, the regular forward target
  // resumes; this prevents the establishing shot from exposing the bus on its
  // very first frame.
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
  // The full mountain route is now used for arrival. Keep the travelled
  // distance accurate across its tighter lower bends so wheel rotation and
  // the coach position never drift apart over the longer establishing shot.
  for (let i = 1; i <= 256; i++) {
    const next = roadSample(mix(start, along, i / 256), lane).position;
    distance += Math.hypot(...next.map((v, axis) => v - previous[axis]));
    previous = next;
  }
  const [x, y, z] = contact.position;
  // The arrival establishing shot starts high and far, then eases toward the
  // coach as it reaches the temple. The departure reverses that pull so the
  // monastery recedes into the mountain. Keeping this choice explicit avoids
  // the opening accidentally inheriting the old pull-away move.
  const cameraProgress = departing ? progress : 1 - progress;
  const eye = [
    x + mix(17, 73, cameraProgress),
    y + mix(9, 53, cameraProgress),
    z + mix(23, 94, cameraProgress),
  ] as V3;
  const baseTarget = mixVector(
    [x, y + 1.5, z],
    [0, 45, -55],
    // Keep the arrival lens locked to the coach while it pulls in from the
    // distant establishing frame. The old fixed mountain target let the bus
    // drift out of portrait view once the camera moved closer.
    departing ? progress * 0.6 : 0,
  );
  const followCamera: CameraShot = {
    eye,
    target: baseTarget,
    // A slightly wider opening lens keeps the coach readable while it enters
    // from the edge on narrow portrait screens as well as landscape screens.
    fov: mix(56, 60, progress),
  };
  // Keep the first and last beats on an empty stretch of road. The coach is
  // already travelling on the surveyed lane, but the camera is staged 24m
  // ahead, so it enters from beyond the frame and leaves it before the shot
  // hands off to the gate or the next scene. The follow camera takes over
  // during the middle 68% of the journey.
  const intro = 1 - smooth(clamp(progress / 0.16, 0, 1));
  // Keep the coach readable through almost the entire 14-second shot. A
  // shorter handoff window leaves room for the last road bend while avoiding
  // a premature lens turn that crops the bus on portrait screens.
  const outro = smooth(clamp((progress - 0.94) / 0.06, 0, 1));
  const entryCamera = routeCamera(
    start + direction * (departing ? 24 : 60),
    lane,
    direction,
    // Keep the initial opening frame genuinely empty while the coach eases
    // in from beyond the road bend. The distant establishing lens takes over
    // immediately after this short empty lead-in.
    1,
  );
  // On arrival the gate handoff happens while the coach is already beside the
  // forecourt. The old exit camera sampled another point on the bend, which
  // moved the eye sideways in the last 16% of the shot and read as a sudden
  // pull to the right. Keep the eye at the same vehicle-relative offset and
  // let the long target carry the coach out of frame instead. Departure keeps
  // the route camera so the monastery can recede naturally down the slope.
  const exitCamera = departing
    ? routeCamera(end + direction * 24, lane, direction, 1)
    : {
        eye: [x + 17, y + 9, z + 23] as V3,
        target: [0, 45, -55] as V3,
        fov: 60,
      };
  const camera = mixCamera(mixCamera(followCamera, entryCamera, intro), exitCamera, outro);
  return {
    ...contact,
    yaw,
    distance,
    along,
    steering: Math.atan(5.6 * roadSample(along).curvature * direction),
    camera,
  };
}
