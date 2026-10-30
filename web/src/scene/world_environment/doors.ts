import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder, torus } from '@/scene/geometry/primitives';
import { node, type V3 } from '@/scene/world/types';

export type DoorState = 'closed' | 'ajar' | 'opening' | 'open';

export function doorLeaf(width: number, height: number, direction: number) {
  const b = new Builder();
  const wood = { ...M.wood, color: 0x77604a };
  for (let i = 0; i < 5; i++) {
    const x = (direction * (i + 0.5) * width) / 5;
    b.box([width / 5 - 0.004, height, 0.08], [x, height / 2, 0], wood);
    for (const y of [0.19, height * 0.49, height - 0.2]) {
      b.add(
        cylinder(0.01, 0.012, 0.012, 12),
        M.brass,
        [x, y, 0.07],
        [1, 1, 1],
        [Math.PI / 2, 0, 0],
      );
    }
  }
  for (const y of [0.13, height * 0.49, height - 0.14])
    b.box([width, 0.09, 0.055], [(direction * width) / 2, y, 0.055], M.darkWood);
  for (const x of [0.04, width - 0.04])
    b.box([0.07, height, 0.035], [direction * x, height / 2, 0.06], M.darkWood);
  const hx = direction * (width - 0.12),
    hy = height * 0.48;
  b.add(
    cylinder(0.052, 0.052, 0.018, 24),
    M.brass,
    [hx, hy, 0.095],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
  );
  b.add(torus(0.048, 0.009, 32), M.brass, [hx, hy - 0.04, 0.115], [1, 1, 1], [Math.PI / 2, 0, 0]);
  for (const y of [0.34, height - 0.34]) {
    b.add(cylinder(0.026, 0.026, 0.14, 20), M.brass, [0, y, 0.01]);
    b.box([width * 0.45, 0.045, 0.014], [direction * width * 0.24, y, 0.09], M.brass);
  }
  return b.build();
}

export function doorFrame(b: Builder, p: V3) {
  for (const side of [-1, 1])
    b.box([0.16, 2.55, 0.2], [p[0] + side * 0.7, p[1] + 1.27, p[2]], M.darkWood);
  b.box([1.56, 0.18, 0.22], [p[0], p[1] + 2.5, p[2]], M.darkWood);
  b.box([1.5, 0.11, 0.28], [p[0], p[1] + 0.03, p[2]], M.stone);
}

export function doorway(b: Builder, p: V3, open: boolean) {
  doorFrame(b, p);
  for (const side of [-1, 1]) {
    b.merge(
      doorLeaf(0.65, 2.36, -side),
      [p[0] + side * 0.65, p[1], p[2]],
      [0, open ? side * 0.85 : 0, 0],
    );
  }
}

export function movingDoor(p: V3, state: DoorState, latched: boolean) {
  const root = node('hinged_door');
  root.position = p;
  const leaves = [-1, 1].map((side) => {
    const leaf = node('door_leaf', doorLeaf(0.65, 2.36, -side));
    leaf.position[0] = side * 0.65;
    root.children.push(leaf);
    return leaf;
  });
  const bar = new Builder().box([0.85, 0.08, 0.12], [0, 0, 0], M.wood).mesh('door_latch');
  bar.position = [-0.65, 1.13, 0.16];
  if (latched) leaves[1].children.push(bar);
  root.animate = (t) => {
    const progress = Math.max(0, Math.min(1, (t - 0.35) / 0.85));
    const angle =
      state === 'opening'
        ? progress * progress * (3 - 2 * progress) * 1.15
        : state === 'ajar'
          ? 0.7
          : state === 'open'
            ? 1.15
            : 0;
    leaves.forEach((leaf, i) => {
      leaf.rotation[1] = (i ? 1 : -1) * angle;
    });
    bar.position[0] =
      -0.65 + (state === 'opening' ? Math.min(t / 0.35, 1) * 0.44 : state === 'closed' ? 0 : 0.44);
  };
  root.animate(0, 0);
  return root;
}

export function gateCarpentry(b: Builder) {
  for (const side of [-1, 1]) {
    b.merge(doorLeaf(2.9, 2.8, -side), [side * 3.0, 0.36, -2.7], [0, side * 1.3, 0]);
    for (let tier = 0; tier < 3; tier++) {
      const y = 3.35 + tier * 0.17,
        width = 0.45 + tier * 0.35;
      b.box([width, 0.12, 0.42], [side * 3.1, y, -2], M.redWood);
      b.box([0.23, 0.13, 0.55 + tier * 0.4], [side * 3.1, y + 0.07, -2], M.darkWood);
      for (const end of [-1, 1])
        b.ball([0.08, 0.06, 0.24], [side * 3.1 + (end * width) / 2, y + 0.06, -2], M.redWood);
    }
    b.box([4, 0.46, 0.8], [side * 5.1, 0.35, -2.4], M.stone);
  }
  for (let x = -3.65; x <= 3.65; x += 0.24) {
    b.rod([x, 3.61, -3.8], [x, 3.61, -0.2], 0.044, M.wood);
    b.ball([0.048, 0.048, 0.02], [x, 3.61, -0.18], M.darkWood);
  }
  b.box([6.4, 0.09, 0.09], [0, 3.56, -1.9], M.darkWood);
}
