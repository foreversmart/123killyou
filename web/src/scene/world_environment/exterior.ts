import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder } from '@/scene/geometry/primitives';
import { floor, plaque, roof, door, windowLattice } from '@/scene/world_environment/architecture';
import type { WorldNode } from '@/scene/world/types';
import { lantern } from '@/scene/world_prop/ritual';
import { landscape } from '@/scene/world_environment/terrain';
import { addVegetation, addCourtyardGarden } from '@/scene/world_environment/vegetation';
import { gateCarpentry } from '@/scene/world_environment/doors';

export function templeGate(): WorldNode {
  const b = new Builder();
  landscape(b);
  floor(b, 17, 14);
  for (let i = 0; i < 3; i++)
    b.box([8 - i * 0.5, 0.12, 2.2 - i * 0.45], [0, i * 0.12, -0.8 - i * 0.25], M.stone);
  for (const x of [-3.1, 3.1]) {
    b.add(cylinder(0.2, 0.24, 3.65), M.redWood, [x, 2.05, -2]);
    b.add(cylinder(0.32, 0.37, 0.35), M.stone, [x, 0.35, -2]);
    b.box([3.8, 2.8, 0.65], [x + Math.sign(x) * 2, 1.6, -2.4], M.plaster);
    roof(b, x + Math.sign(x) * 2, -2.4, 4, 1.3, 2.95);
  }
  b.box([6.6, 0.4, 0.35], [0, 3.55, -2], M.redWood);
  roof(b, 0, -2, 7.5, 3.7, 3.8);
  gateCarpentry(b);
  plaque(b, '红烛寺', [0, 2.9, -1.76], 2.15, 0.61);
  plaque(b, '明照寺', [-3.9, 1.2, -1.95], 0.58, 0.85, 0.1);
  plaque(b, '香客止步', [4.5, 0.65, 0.6], 0.6, 0.8, -0.25);
  b.box([6, 3, 0.3], [0, 1.5, -11], M.plaster);
  roof(b, 0, -11, 7.3, 4, 3.2);
  const root = b.mesh('temple_gate');
  addVegetation(root);
  return root;
}

export function corridor(daylight: boolean): WorldNode {
  const b = new Builder();
  floor(b, 12, 22);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z = 4 - i * 4.6;
      b.add(cylinder(0.12, 0.16, 3.5), M.redWood, [side * 3.9, 1.75, z]);
      b.box([0.24, 0.24, 5], [side * 3.9, 3.45, z - 2], M.darkWood);
    }
    b.box([0.2, 3.3, 22], [side * 5.5, 1.65, -5], M.plaster);
  }
  b.box([11, 3.5, 0.2], [0, 1.75, -7.8], M.plaster);
  for (const [x, z, label] of [
    [-2.5, -2, '听'],
    [-2.5, -6, '灯'],
    [2.5, -2, '门'],
    [2.5, -6, '纸'],
  ] as const) {
    b.box([2.2, 3.15, 0.15], [x, 1.57, z - 0.18], M.plaster);
    door(b, [x, 0, z], label);
  }
  windowLattice(b, 0, 1.7, -7.6, 1.6, 1.5, daylight);
  for (const side of [-1, 1]) roof(b, side * 4.5, -4.5, 2.4, 22, 3.5);
  // The old drag mark remains a physical trace in the floor.
  for (let i = 0; i < 17; i++)
    b.box([0.022, 0.007, 0.18], [-0.9 + i * 0.045, 0.006, -i * 0.28], {
      ...M.stone,
      color: 0x45463c,
    });
  const root = b.mesh('east_courtyard');
  addCourtyardGarden(root);
  for (const x of [-3.9, 3.9]) {
    const lamp = new Builder();
    lantern(lamp, !daylight);
    const model = lamp.mesh('eave_lamp');
    model.position = [x, 2.45, 0];
    root.children.push(model);
  }
  return root;
}
