import { Builder } from '@/scene/geometry/builder';
import { cylinder, lathe } from '@/scene/geometry/primitives';
import { node } from '@/scene/world/types';
import { coachBody, finish } from '@/scene/world_vehicle/body';
import { coachDetails } from '@/scene/world_vehicle/details';

export const WHEEL_RADIUS = 0.55;

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

export function coach() {
  const b = new Builder();
  coachBody(b);
  coachDetails(b);
  const root = node('bus');
  root.children.push(b.mesh('coach_body'));
  const axles = [-2.85, 2.75].flatMap((z) =>
    [-1, 1].map((side) => {
      const steering = node(z > 0 ? 'front_axle' : 'rear_axle');
      steering.position = [side * 1.14, WHEEL_RADIUS + 0.02, z];
      const tyre = wheel(side);
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
