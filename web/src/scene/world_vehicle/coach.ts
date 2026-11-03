import { Builder } from '@/scene/geometry/builder';
import { roundedBox } from '@/scene/geometry/rounded_box';
import { cylinder, lathe } from '@/scene/geometry/primitives';
import { node } from '@/scene/world/types';
import { coachBody, finish } from '@/scene/world_vehicle/body';
import { coachDetails } from '@/scene/world_vehicle/details';
import { openCoachEntrance } from '@/scene/world_vehicle/door';

export const WHEEL_RADIUS = 0.55;

/**
 * The coach is made from many overlapping panels and trim pieces. Feeding all
 * of those thin surfaces into the shadow map creates acne and dark seams while
 * the vehicle turns. Keep one broad, hidden silhouette for the cast shadow so
 * the visible model stays clean without losing contact with the road.
 */
function coachShadow() {
  const b = new Builder();
  b.add(roundedBox(2.36, 1.7, 9.42, 0.2), finish.paint, [0, 2.28, 0]);
  b.add(roundedBox(1.98, 0.44, 8.72, 0.08), finish.rubber, [0, 1.03, 0]);
  const shadow = b.mesh('coach_shadow');
  shadow.shadowOnly = true;
  return shadow;
}

function wheel(side: number) {
  const b = new Builder();
  b.add(
    lathe(
      [
        [0.27, -0.17],
        [0.43, -0.17],
        [0.52, -0.13],
        [0.55, -0.07],
        [0.55, 0.07],
        [0.52, 0.13],
        [0.43, 0.17],
        [0.27, 0.17],
      ],
      48,
    ),
    finish.rubber,
    [0, 0, 0],
    [1, 1, 1],
    [0, 0, Math.PI / 2],
  );
  b.add(cylinder(0.3, 0.3, 0.31, 40), finish.chrome, [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2]);
  b.add(cylinder(0.13, 0.13, 0.37, 32), finish.trim, [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2]);
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    for (const [radius, size, material] of [
      [0.23, 0.038, finish.rubber],
      [0.155, 0.018, finish.chrome],
    ] as const)
      b.add(
        cylinder(size, size, 0.016, 10),
        material,
        [side * 0.163, Math.cos(angle) * radius, Math.sin(angle) * radius],
        [1, 1, 1],
        [0, 0, Math.PI / 2],
      );
  }
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2;
    b.box(
      [0.18, 0.012, 0.024],
      [0, Math.cos(angle) * 0.548, Math.sin(angle) * 0.548],
      { color: 0x282b2c, rough: 0.97 },
      [angle, 0, 0],
    );
  }
  return b.mesh('coach_wheel');
}

export function coach({ doorOpen = false }: { doorOpen?: boolean } = {}) {
  const b = new Builder();
  coachBody(b, doorOpen);
  coachDetails(b, doorOpen);
  const root = node('bus');
  const body = b.mesh('coach_body');
  body.shadow = false;
  body.receiveShadow = false;
  root.children.push(body, coachShadow());
  if (doorOpen) root.children.push(openCoachEntrance());
  const axles = [-2.85, 2.75].flatMap((z) =>
    [-1, 1].map((side) => {
      const steering = node(z > 0 ? 'front_axle' : 'rear_axle');
      steering.position = [side * 1.14, WHEEL_RADIUS + 0.02, z];
      const tyre = wheel(side);
      tyre.shadow = false;
      tyre.receiveShadow = false;
      steering.children.push(tyre);
      root.children.push(steering);
      return { steering, tyre, front: z > 0 };
    }),
  );
  return {
    root,
    roll(distance: number, steeringAngle: number) {
      for (const axle of axles) {
        axle.tyre.rotation[0] = distance / WHEEL_RADIUS;
        axle.steering.rotation[1] = axle.front ? steeringAngle : 0;
      }
    },
  };
}
