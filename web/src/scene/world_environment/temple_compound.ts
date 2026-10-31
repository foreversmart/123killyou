import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder, lathe, torus } from '@/scene/geometry/primitives';
import { compoundRoof } from '@/scene/world_environment/compound_roof';
import { incenseBurner } from '@/scene/world_prop/ritual';
import { node, type V3, type WorldNode } from '@/scene/world/types';
import { templeLayout } from '@/scene/world_environment/temple_layout';

const wallPlaster = { ...M.plaster, color: 0xbcbba9 };
const foundation = { ...M.stone, color: 0x72776c };

function wall(b: Builder, from: V3, to: V3, height = 3.2) {
  const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const rotation: V3 = [0, -Math.atan2(to[2] - from[2], to[0] - from[0]), 0];
  const center: V3 = [(from[0] + to[0]) / 2, from[1], (from[2] + to[2]) / 2];
  b.box(
    [length, height, 0.68],
    [center[0], center[1] + height / 2, center[2]],
    wallPlaster,
    rotation,
  );
  b.box([length + 0.1, 0.7, 0.84], [center[0], center[1] + 0.26, center[2]], foundation, rotation);
  b.box(
    [length + 0.18, 0.15, 0.86],
    [center[0], center[1] + height - 0.13, center[2]],
    M.roof,
    rotation,
  );
  // Two low pitched caps read as a continuous tiled wall crown.
  for (const side of [-1, 1]) {
    const nx = Math.sin(rotation[1]),
      nz = Math.cos(rotation[1]);
    b.box(
      [length + 0.22, 0.13, 0.57],
      [center[0] + nx * side * 0.23, center[1] + height + 0.04, center[2] + nz * side * 0.23],
      M.roof,
      [side * 0.4, rotation[1], 0],
    );
  }
  for (let distance = 0; distance <= length; distance += 5.5) {
    const t = distance / length,
      x = from[0] + (to[0] - from[0]) * t,
      z = from[2] + (to[2] - from[2]) * t;
    b.box([0.78, height + 0.08, 0.83], [x, from[1] + height / 2, z], wallPlaster, rotation);
    b.box([0.9, 0.14, 1.03], [x, from[1] + height + 0.14, z], M.roof, rotation);
  }
}

function hall(
  b: Builder,
  x: number,
  z: number,
  width: number,
  depth: number,
  base: number,
  tall = false,
) {
  const eave = base + (tall ? 5.3 : 3.8);
  b.box([width + 1.8, 0.95, depth + 1.9], [x, base - 0.415, z], foundation);
  b.box(
    [width - 0.5, eave - base - 0.35, depth - 1.8],
    [x, (eave + base) / 2 - 0.2, z - 0.5],
    wallPlaster,
  );
  const front = z + depth / 2 - 0.72;
  b.box(
    [width - 1, eave - base - 0.65, 0.14],
    [x, (eave + base) / 2 - 0.22, front - 0.3],
    M.darkWood,
  );
  const bays = tall ? 6 : 4;
  for (let i = 0; i <= bays; i++) {
    const px = x - width / 2 + (width * i) / bays;
    b.add(cylinder(0.17, 0.21, eave - base, 12), M.redWood, [px, (eave + base) / 2, front + 0.32]);
    b.box([0.5, 0.3, 0.55], [px, base + 0.05, front + 0.32], M.stone);
    b.box([0.75, 0.19, 0.9], [px, eave - 0.13, front + 0.25], M.redWood);
    if (i === bays) continue;
    const mid = px + width / bays / 2;
    for (let slat = -2; slat <= 2; slat++)
      b.box([0.06, 2.1, 0.12], [mid + slat * 0.24, base + 1.6, front - 0.18], M.redWood);
    b.box([width / bays - 0.16, 0.12, 0.2], [mid, base + 2.7, front - 0.16], M.redWood);
  }
  b.box([width + 0.4, 0.27, 0.36], [x, eave - 0.22, front + 0.3], M.redWood);
  compoundRoof(b, x, z, width + 2.4, depth + 2.8, eave, tall ? 2.4 : 1.6);
  if (tall) compoundRoof(b, x, z, width + 0.6, depth + 0.8, eave + 1.6, 1.9);
  for (let step = 0; step < 4; step++)
    b.box(
      [Math.min(width - 1, 7), 0.16, 1.8 - step * 0.35],
      [x, base - 0.55 + step * 0.16, z + depth / 2 + 0.9 - step * 0.17],
      M.stone,
    );
}

function tower(b: Builder, x: number, z: number, artifact: 'bell' | 'drum') {
  b.box([5.8, 0.75, 5.8], [x, 0.24, z], foundation);
  for (const px of [-2, 2])
    for (const pz of [-2, 2]) b.add(cylinder(0.16, 0.2, 5, 12), M.redWood, [x + px, 3.1, z + pz]);
  compoundRoof(b, x, z, 6.4, 6.4, 4.1, 1.7);
  compoundRoof(b, x, z, 5.6, 5.6, 6, 1.7);
  if (artifact === 'bell') {
    b.add(
      lathe([
        [0.04, 1.8],
        [0.58, 1.8],
        [0.68, 1.94],
        [0.54, 2.45],
        [0.28, 2.68],
        [0, 2.75],
      ]),
      M.brass,
      [x, 0, z],
    );
    b.add(torus(0.57, 0.045, 20), M.brass, [x, 1.83, z]);
    b.rod([x, 1.45, z], [x, 2.05, z], 0.035, M.darkWood);
  } else {
    b.add(cylinder(0.62, 0.68, 0.66, 24), M.redWood, [x, 2.35, z], [1, 1, 1], [0, 0, Math.PI / 2]);
    for (const side of [-1, 1])
      b.add(
        torus(0.66, 0.06, 20),
        M.brass,
        [x + side * 0.22, 2.35, z],
        [1, 1, 1],
        [0, Math.PI / 2, 0],
      );
    b.rod([x - 0.9, 2.35, z], [x + 0.9, 2.35, z], 0.035, M.darkWood);
  }
  b.box([4, 0.18, 4], [x, 0.82, z], M.darkWood);
  for (const side of [-1, 1]) b.box([4.5, 0.15, 0.16], [x, 1.7, z + side * 2.1], M.redWood);
}

function courtyardPaving(b: Builder) {
  for (const [x, z, width, depth] of [
    [0, -11.8, 20, 11],
    [0, -29, 25, 13],
    [0, -48, 20, 9],
  ] as const)
    b.box([width, 0.1, depth], [x, -0.08, z], { ...M.stone, color: 0x979887 });
  // The straight stone walk keeps the south-facing axis legible between each
  // courtyard instead of leaving the halls floating on one large slab.
  for (const [z, depth] of [
    [-18, 3],
    [-37.5, 5],
    [-46, 5],
  ] as const)
    b.box([3.2, 0.12, depth], [0, -0.01, z], M.stone);
}

function cloister(b: Builder, x: number, z: number, width: number, depth: number) {
  const edge = x + (x < 0 ? width / 2 : -width / 2);
  b.box([0.22, 0.22, depth], [edge, 3.15, z], M.darkWood);
  b.box([0.22, 0.2, depth], [edge, 0.38, z], M.redWood);
  for (let offset = -depth / 2 + 1.2; offset <= depth / 2; offset += 2.7)
    b.add(cylinder(0.1, 0.14, 3.05, 10), M.redWood, [edge, 1.75, z + offset]);
  compoundRoof(b, edge, z, 2.1, depth + 0.7, 3.35, 0.72);
}

function pond(b: Builder) {
  const water = { ...M.stone, color: 0x455e5b, rough: 0.28, glow: 0.04 };
  b.box([8.5, 0.16, 5.2], [17.2, -0.02, -8.8], { ...M.stone, color: 0x656b5c });
  b.box([7.7, 0.06, 4.4], [17.2, 0.09, -8.8], water);
  for (const [x, z] of [
    [14, -10.6],
    [20.4, -10.6],
    [14, -7],
    [20.4, -7],
  ] as const)
    b.ball([0.45, 0.28, 0.32], [x, 0.23, z], { ...M.stone, color: 0x77786d });
}

function stoneLantern(b: Builder, x: number, z: number) {
  const agedStone = { ...M.stone, color: 0x77786d, rough: 1 };
  b.box([0.62, 0.12, 0.62], [x, 0.06, z], agedStone);
  b.box([0.42, 0.18, 0.42], [x, 0.21, z], agedStone);
  b.add(cylinder(0.12, 0.16, 0.58, 10), agedStone, [x, 0.58, z]);
  b.box([0.44, 0.1, 0.44], [x, 0.91, z], agedStone);
  b.box([0.68, 0.16, 0.68], [x, 1.04, z], agedStone);
  b.box([0.52, 0.12, 0.52], [x, 1.18, z], agedStone);
}

export function templeCompound(): WorldNode {
  const b = new Builder();
  // A complete enclosure, broad forecourt and three successive courtyards make
  // the gate part of a hillside monastery rather than a standalone facade.
  // Keep the compound slab below the gate forecourt and entrance floor. The
  // old near-coplanar pair produced depth-buffer shimmer during the opening
  // pull-in, especially when the road apron entered the same pixels.
  b.box([64, 0.16, 60], [0, -0.32, -32], { ...M.stone, color: 0x8c8d79 });
  b.box([41, 0.18, 17], [0, -0.15, 6.6], foundation);
  courtyardPaving(b);
  pond(b);
  for (const side of [-1, 1]) {
    wall(b, [side * 7.05, 0, -2.4], [side * 32, 0, -2.4]);
    wall(b, [side * 32, 0, -2.4], [side * 32, 0, -62]);
    cloister(b, side * 9, -12, 7, 11);
    cloister(b, side * 18, -29, 8, 14);
    cloister(b, side * 18, -49, 8, 15);
  }
  wall(b, [-32, 0, -62], [32, 0, -62], 3.5);
  b.box([21, 1.05, 22], [0, 0.35, -51], foundation);
  for (const z of [-10, -17, -24, -31, -38, -44])
    b.box([7, 0.1, 6.7], [0, z < -38 ? 0.93 : -0.02, z], { ...M.stone, color: 0x9b9b89 });
  hall(b, 0, -12, 16, 9, 0.55);
  tower(b, -13, -14, 'bell');
  tower(b, 13, -14, 'drum');
  hall(b, -12, -29, 8, 10, 0.45);
  hall(b, 0, -29, 20, 12, 0.9, true);
  hall(b, 12, -29, 8, 10, 0.45);
  hall(b, -17, -45, 10, 11, 0.55);
  hall(b, -24, -43, 7, 7, 0.35);
  hall(b, 17, -45, 10, 11, 0.55);
  hall(b, 24, -43, 7, 7, 0.35);
  hall(b, 0, -50, 18, 10, 1.25, true);
  hall(b, -17, -56, 9, 8, 0.8);
  hall(b, 17, -56, 9, 8, 0.8);
  hall(b, 25, -54, 5, 5, 0.35);
  for (let step = 0; step < 6; step++)
    b.box([8, 0.16, 2.5 - step * 0.34], [0, step * 0.16, -39 - step * 0.17], M.stone);
  // Stone lanterns and a modest incense stand mark the approach axis. Their
  // weathered scale keeps the compound ancient without making the courtyard
  // feel like a decorative theme park.
  for (const [x, z] of [
    [-4.8, 4.2],
    [4.8, 4.2],
    [-5.2, -14.5],
    [5.2, -14.5],
  ] as const)
    stoneLantern(b, x, z);
  const root = b.mesh('temple_compound');
  // Empty semantic nodes make the fixed layout inspectable by map tooling and
  // keep future hotspots anchored to named buildings without splitting the
  // static architecture into dozens of draw calls.
  for (const building of templeLayout) {
    const marker = node(building.id);
    marker.position = [building.x, building.base, building.z];
    root.children.push(marker);
  }
  root.children.push(incenseBurner([0, 0.03, -16.3], false));
  return root;
}
