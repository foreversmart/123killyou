import { Builder } from '@/scene/geometry/builder';
import { finish, panel } from '@/scene/world_vehicle/body';

/** A clear entrance, real steps and a door slid back along the outside panel. */
export function openCoachEntrance() {
  const b = new Builder();
  const tread = { color: 0x444b4a, rough: 0.94 };
  for (const z of [3.43, 4.39]) b.box([0.09, 2.43, 0.07], [-1.285, 1.72, z], finish.trim);
  b.box([0.09, 0.09, 1.03], [-1.285, 2.94, 3.91], finish.trim);
  // A pale interior wall and the dark floor give the doorway depth. The
  // boarding route enters along +X, from outside -1.6 to the aisle at -0.3.
  b.box([0.07, 1.85, 0.99], [0.72, 2.04, 3.91], { color: 0x8c9185, rough: 0.8 });
  b.box([1.35, 0.09, 0.99], [0.05, 1.035, 3.91], tread);
  for (let step = 0; step < 3; step++) {
    const x = -1.47 + step * 0.36;
    const height = 0.36 + step * 0.36;
    b.box([0.38, height, 0.88], [x, height / 2, 3.91], tread);
    b.box([0.04, 0.025, 0.87], [x - 0.17, height + 0.012, 3.91], {
      color: 0xd4bb69,
      rough: 0.7,
    });
  }
  for (const z of [3.48, 4.34]) b.rod([-1.13, 1.08, z], [-1.13, 2.08, z], 0.026, finish.chrome);

  // Sliding the leaf rearward leaves the full doorway unobstructed and avoids
  // putting a swinging panel across the approaching group's footpath.
  panel(b, [0.075, 2.19, 0.91], [-1.4, 1.69, 2.83], finish.rubber, 0.025);
  panel(b, [0.08, 1.42, 0.79], [-1.425, 2.02, 2.83], finish.glass, 0.02);
  panel(b, [0.085, 0.64, 0.79], [-1.43, 0.93, 2.83], finish.teal, 0.024);
  b.box([0.018, 2.11, 0.027], [-1.48, 1.69, 2.83], finish.chrome);
  b.box([0.06, 0.22, 0.037], [-1.48, 1.4, 2.6], finish.chrome);
  const entrance = b.mesh('coach_open_entrance');
  entrance.shadow = false;
  entrance.receiveShadow = false;
  return entrance;
}
