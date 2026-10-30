import { roadNearest } from '@/scene/world_environment/road_path';
import type { V3 } from '@/scene/world/types';

const halfTrack = 1.14,
  rear = -2.85,
  front = 2.75,
  axleHeight = 0.57,
  radius = 0.55;
const boundedAsin = (v: number) => Math.asin(Math.max(-0.7, Math.min(0.7, v)));

// A rigid coach rests on the four tyre contacts. Sampling just the centreline
// tangent exaggerates pitch on an inside bend and lifts the opposite axle.
export function roadContact(position: V3, yaw: number) {
  let pitch = 0,
    roll = 0;
  function contacts() {
    return [-halfTrack, halfTrack].flatMap((x) =>
      [rear, front].map((z) => {
        const rx = x * Math.cos(roll) - axleHeight * Math.sin(roll),
          ry = x * Math.sin(roll) + axleHeight * Math.cos(roll),
          pz = ry * Math.sin(pitch) + z * Math.cos(pitch);
        const wx = position[0] + rx * Math.cos(yaw) + pz * Math.sin(yaw),
          wz = position[2] - rx * Math.sin(yaw) + pz * Math.cos(yaw);
        return {
          height: roadNearest(wx, wz).height,
          offset: ry * Math.cos(pitch) - z * Math.sin(pitch) - radius,
        };
      }),
    );
  }
  for (let iteration = 0; iteration < 4; iteration++) {
    const c = contacts(),
      average = (a: number, b: number) => (c[a].height + c[b].height) / 2;
    pitch = -boundedAsin((average(1, 3) - average(0, 2)) / (front - rear));
    roll = boundedAsin((average(2, 3) - average(0, 1)) / (halfTrack * 2 * Math.cos(pitch)));
  }
  const y = contacts().reduce((sum, c) => sum + c.height - c.offset, 0) / 4;
  return { position: [position[0], y, position[2]] as V3, pitch, roll };
}
