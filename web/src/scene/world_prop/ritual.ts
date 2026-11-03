import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder, lathe, torus } from '@/scene/geometry/primitives';
import { node, type V3, type WorldNode } from '@/scene/world/types';
import { oracleFaces } from '@/scene/story_observation/oracle_faces';
import { cupGeometry } from '@/scene/world_prop/cup_geometry';

export function candle(lit: boolean, short = false): WorldNode {
  const b = new Builder(),
    h = short ? 0.16 : 0.34;
  b.add(
    lathe([
      [0, 0],
      [0.09, 0],
      [0.09, 0.025],
      [0.025, 0.05],
      [0.02, 0.09],
      [0.08, 0.11],
      [0.08, 0.125],
      [0, 0.125],
    ]),
    M.brass,
  );
  const wax = { color: 0x9f2c27, rough: 0.45, pattern: 6 };
  b.add(cylinder(0.034, 0.037, h), wax, [0, h / 2 + 0.13, 0]);
  for (let i = 0; i < 7; i++)
    b.ball(
      [0.008, 0.025 + (i % 3) * 0.012, 0.009],
      [Math.sin(i) * 0.033, h + 0.1 - (i % 3) * 0.017, Math.cos(i) * 0.033],
      wax,
    );
  b.rod([0, h + 0.13, 0], [0.004, h + 0.15, 0], 0.003, M.black);
  const root = b.mesh('red_candle');
  if (lit) {
    const flame = new Builder()
      .ball([0.019, 0.06, 0.019], [0, 0, 0], { color: 0xffb642, glow: 5 })
      .ball([0.009, 0.027, 0.01], [0, -0.015, 0.012], { color: 0xffe9ac, glow: 8 })
      .mesh('flame');
    flame.position[1] = h + 0.2;
    flame.shadow = false;
    flame.animate = (t) => {
      flame.scale[1] = 0.95 + Math.sin(t * 11) * 0.08;
      flame.rotation[2] = Math.sin(t * 7) * 0.09;
    };
    root.children.push(flame);
  }
  return root;
}

export function lantern(b: Builder, lit = true) {
  b.add(cylinder(0.11, 0.15, 0.06), M.brass, [0, 0.04, 0]);
  b.ball([0.14, 0.22, 0.14], [0, 0.27, 0], {
    color: lit ? 0xe1b267 : 0x706650,
    rough: 0.7,
    glow: lit ? 1.5 : 0,
  });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.rod(
      [Math.sin(a) * 0.11, 0.08, Math.cos(a) * 0.11],
      [Math.sin(a) * 0.11, 0.47, Math.cos(a) * 0.11],
      0.009,
      M.darkWood,
    );
  }
  b.add(cylinder(0.1, 0.15, 0.06), M.brass, [0, 0.49, 0]);
  b.add(torus(0.065, 0.008), M.brass, [0, 0.58, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
}

/** A small cast-bronze censer used on side altars and the oracle table. */
export function incenseBurner(position: V3, lit = true) {
  const root = node('incense_burner');
  root.position = position;
  const b = new Builder();
  const bronze = { ...M.brass, color: 0x786246, rough: 0.64, metal: 0.54 };
  b.add(
    lathe(
      [
        [0, 0],
        [0.19, 0],
        [0.24, 0.06],
        [0.22, 0.18],
        [0.17, 0.27],
        [0.16, 0.33],
        [0, 0.35],
      ],
      20,
    ),
    bronze,
  );
  b.add(torus(0.2, 0.025, 20), bronze, [0, 0.29, 0]);
  b.add(torus(0.16, 0.018, 20), bronze, [0, 0.38, 0]);
  for (const side of [-1, 1]) {
    b.rod([side * 0.2, 0.2, 0], [side * 0.31, 0.3, 0], 0.018, bronze);
    b.rod([0, 0.2, side * 0.2], [0, 0.3, side * 0.31], 0.018, bronze);
  }
  for (const [x, z] of [
    [0.13, 0.11],
    [-0.13, 0.11],
    [0, -0.16],
  ] as const)
    b.add(cylinder(0.035, 0.05, 0.08, 12), bronze, [x, -0.04, z]);
  const body = b.mesh('incense_burner_body');
  root.children.push(body);
  if (lit) {
    const smoke = new Builder()
      .ball([0.025, 0.11, 0.025], [0.03, 0.47, 0], { color: 0xa7a28e, rough: 1, glow: 0.2 })
      .mesh('incense_smoke');
    smoke.shadow = false;
    smoke.animate = (time) => {
      smoke.position[0] = Math.sin(time * 0.55) * 0.035;
      smoke.position[2] = Math.cos(time * 0.7) * 0.018;
      smoke.scale[1] = 0.84 + Math.sin(time * 1.3) * 0.12;
    };
    root.children.push(smoke);
  }
  return root;
}

/** A compact wooden fish drum, common beside a monastic dining hall. */
export function woodFish(position: V3) {
  const root = node('wood_fish');
  root.position = position;
  const b = new Builder();
  const lacquer = { color: 0x6c3e2e, rough: 0.82, pattern: 2 };
  b.ball([0.28, 0.2, 0.2], [0, 0.26, 0], lacquer);
  b.box([0.22, 0.08, 0.16], [0, 0.17, 0], M.darkWood);
  b.rod([-0.31, 0.33, 0], [-0.43, 0.62, 0], 0.025, M.darkWood);
  b.ball([0.06, 0.06, 0.06], [-0.44, 0.64, 0], M.brass);
  root.children.push(b.mesh('wood_fish_body'));
  return root;
}

export function beads(b: Builder, p: V3 = [0, 0, 0], radius = 0.085) {
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    b.ball(
      [0.014, 0.014, 0.014],
      [p[0] + Math.cos(a) * radius, p[1] + 0.015, p[2] + Math.sin(a) * radius],
      { color: i === 0 ? 0x30251d : 0x796044, rough: 0.4, pattern: 1 },
    );
  }
}

export function key(b: Builder) {
  b.add(torus(0.037, 0.009), M.brass, [0, 0.015, -0.07]);
  b.rod([0, 0.015, -0.035], [0, 0.015, 0.09], 0.009, M.brass);
  for (let i = 0; i < 3; i++)
    b.box([0.035, 0.013, 0.012], [0.012, 0.015, 0.055 + i * 0.015], M.brass);
}

export function vase(b: Builder, broken: boolean) {
  const ceramic = { color: 0x719899, rough: 0.25 };
  if (broken) {
    for (let i = 0; i < 12; i++)
      b.box(
        [0.065, 0.008, 0.045],
        [Math.sin(i * 4) * 0.24, 0.018, Math.cos(i * 3) * 0.22],
        ceramic,
        [i * 0.23, i, 0.1],
      );
  } else {
    b.add(
      lathe([
        [0, 0],
        [0.09, 0],
        [0.14, 0.1],
        [0.16, 0.24],
        [0.08, 0.36],
        [0.055, 0.45],
        [0.08, 0.48],
        [0.065, 0.49],
        [0.045, 0.45],
      ]),
      ceramic,
    );
    for (let i = 0; i < 3; i++)
      b.add(torus(0.151, 0.006), { color: 0x345860 }, [0, 0.16 + i * 0.045, 0]);
  }
}

export function cage(b: Builder) {
  for (const y of [0, 0.04, 0.3]) b.add(torus(0.2, 0.01), M.brass, [0, y, 0]);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    b.rod(
      [Math.sin(a) * 0.2, 0.03, Math.cos(a) * 0.2],
      [Math.sin(a) * 0.18, 0.36, Math.cos(a) * 0.18],
      0.004,
      M.brass,
    );
    b.rod([Math.sin(a) * 0.18, 0.36, Math.cos(a) * 0.18], [0, 0.49, 0], 0.004, M.brass);
  }
  b.rod([-0.18, 0.15, 0], [0.18, 0.15, 0], 0.012, M.wood);
  b.ball([0.055, 0.05, 0.08], [0, 0.21, 0], { color: 0x887555, rough: 1 });
  b.ball([0.03, 0.03, 0.03], [0, 0.26, 0.055], { color: 0x625740, rough: 1 });
}

export function cups(flags: Record<string, boolean>, falling: boolean) {
  const root = node('jiaobei'),
    faces = oracleFaces(flags);
  for (let i = 0; i < 2; i++) {
    const b = new Builder();
    b.add(cupGeometry(), { color: 0x922f25, rough: 0.4, pattern: 1 });
    const cup = b.mesh('cup_' + i);
    cup.animationKey = JSON.stringify([falling, faces]);
    const faceUp = faces?.[i] === 'flat';
    const restingY = faceUp ? 0.065 : 0.005;
    cup.position = [i * 0.34 - 0.17, restingY, 0];
    cup.rotation[2] = faceUp ? Math.PI : 0;
    cup.rotation[1] = i * 1.3;
    if (falling)
      cup.animate = (t) => {
        const progress = Math.min(t / 1.6, 1);
        cup.position[1] =
          restingY +
          (1 - progress) ** 2 * 0.75 +
          Math.abs(Math.sin(progress * Math.PI * 3)) * (1 - progress) * 0.25;
        cup.rotation[2] = (faceUp ? Math.PI : 0) + (1 - progress) * Math.PI * 6;
      };
    root.children.push(cup);
  }
  return root;
}
