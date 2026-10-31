import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder } from '@/scene/geometry/primitives';
import { floor, plaque, roof, windowLattice } from '@/scene/world_environment/architecture';
import { doorLeaf } from '@/scene/world_environment/doors';
import type { WorldNode } from '@/scene/world/types';
import { lantern } from '@/scene/world_prop/ritual';
import { landscape } from '@/scene/world_environment/terrain';
import { addVegetation, addCourtyardGarden } from '@/scene/world_environment/vegetation';
import { gateCarpentry } from '@/scene/world_environment/doors';
import { templeCompound } from '@/scene/world_environment/temple_compound';
import { compoundRoof } from '@/scene/world_environment/compound_roof';
import { buddhistMural } from '@/scene/world_environment/statue';

export function templeEntrance(distant = false): WorldNode {
  const b = new Builder();
  if (!distant) floor(b, 17, 14, 'stone');
  for (let i = 0; i < 3; i++)
    b.box([8 - i * 0.5, 0.12, 2.2 - i * 0.45], [0, i * 0.12, -0.8 - i * 0.25], M.stone);
  for (const x of [-3.1, 3.1]) {
    b.add(cylinder(0.2, 0.24, 3.65), M.redWood, [x, 2.05, -2]);
    b.add(cylinder(0.32, 0.37, 0.35), M.stone, [x, 0.35, -2]);
    b.box([3.8, 2.8, 0.65], [x + Math.sign(x) * 2, 1.6, -2.4], M.plaster);
    if (distant) compoundRoof(b, x + Math.sign(x) * 2, -2.4, 4, 1.3, 2.95, 0.5);
    else roof(b, x + Math.sign(x) * 2, -2.4, 4, 1.3, 2.95);
  }
  b.box([6.6, 0.4, 0.35], [0, 3.55, -2], M.redWood);
  if (distant) compoundRoof(b, 0, -2, 7.5, 3.7, 3.8, 1.05);
  else roof(b, 0, -2, 7.5, 3.7, 3.8);
  gateCarpentry(b);
  plaque(b, '红烛寺', [0, 2.9, -1.76], 2.15, 0.61);
  plaque(b, '明照寺', [-3.9, 1.2, -1.95], 0.58, 0.85, 0.1);
  plaque(b, '香客止步', [4.5, 0.65, 0.6], 0.6, 0.8, -0.25);
  return b.mesh('temple_entrance');
}

export function templeGate(): WorldNode {
  const b = new Builder();
  landscape(b);
  const root = b.mesh('temple_gate');
  root.children.push(templeEntrance(), templeCompound());
  addVegetation(root);
  return root;
}

export function corridor(daylight: boolean): WorldNode {
  const b = new Builder();
  floor(b, 12, 22);
  // The east courtyard is a covered passage: guest rooms sit behind the
  // plaster side walls, with every doorway opening toward the walkway. The
  // previous layout put four doors across the vanishing point, which read as
  // freestanding panels rather than rooms.
  const roomDoors = [-2, -6] as const;
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 4; i++) {
      const z = 4 - i * 4.6;
      b.add(cylinder(0.12, 0.16, 3.5), M.redWood, [side * 3.9, 1.75, z]);
      b.box([0.24, 0.24, 5], [side * 3.9, 3.45, z - 2], M.darkWood);
    }
    // Leave proper door openings in the side wall. The deep timber trim and
    // dark recess make each room legible even when its leaves are closed.
    const boundaries = [
      6,
      roomDoors[0] + 0.82,
      roomDoors[0] - 0.82,
      roomDoors[1] + 0.82,
      roomDoors[1] - 0.82,
      -16,
    ];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const top = boundaries[i];
      const bottom = boundaries[i + 1];
      if (top <= bottom) continue;
      const depth = top - bottom;
      b.box([0.24, 3.3, depth], [side * 5.5, 1.65, (top + bottom) / 2], M.plaster);
    }
    for (const z of roomDoors) {
      sideRoomBay(b, side, z);
      sideRoomDoor(b, side, z);
    }
    // A continuous eave beam and short brackets give the side rooms the
    // restrained, weathered timber character of an old mountain temple.
    b.box([0.34, 0.22, 22], [side * 5.36, 3.42, -5], M.darkWood);
    for (const z of [4.7, 0.7, -3.3, -7.3, -11.3, -15.3]) {
      b.box([0.42, 0.18, 0.8], [side * 5.27, 3.18, z], M.redWood);
      b.box([0.28, 0.62, 0.2], [side * 5.34, 2.88, z], M.darkWood);
    }
  }
  b.box([11, 3.5, 0.2], [0, 1.75, -7.8], M.plaster);
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
  // The open wall bays carry small mineral-pigment murals. They sit between
  // guest doors so the player's walk reveals them without turning the rooms
  // into shrines or hiding the room plaques.
  for (const side of [-1, 1] as const)
    for (const [z, accent] of [
      [1.35, 0xb36d4e],
      [-4.25, 0x4f7569],
      [-8.35, 0x9a5847],
    ] as const)
      root.children.push(
        buddhistMural([side * 5.34, 1.02, z], side === -1 ? Math.PI / 2 : -Math.PI / 2, accent),
      );
  for (const x of [-3.9, 3.9]) {
    const lamp = new Builder();
    lantern(lamp, !daylight);
    const model = lamp.mesh('eave_lamp');
    model.position = [x, 2.45, 0];
    root.children.push(model);
  }
  return root;
}

/** Build one side-facing room door in the corridor wall. */
function sideRoomDoor(b: Builder, side: -1 | 1, z: number) {
  const x = side * 5.5;
  const facing = side === -1 ? Math.PI / 2 : -Math.PI / 2;
  const doorWidth = 1.42;
  const doorHeight = 2.36;
  // The opening is recessed one handspan behind the plaster face.
  b.box([0.12, doorHeight, doorWidth], [x - side * 0.08, doorHeight / 2, z], M.black);
  for (const offset of [-0.75, 0.75]) {
    b.box([0.18, 2.62, 0.18], [x, 1.31, z + offset], M.darkWood, [0, facing, 0]);
  }
  b.box([0.2, 0.18, 1.62], [x, 2.58, z], M.darkWood, [0, facing, 0]);
  b.box([0.25, 0.12, 1.5], [x + side * 0.05, 0.04, z], M.stone, [0, facing, 0]);

  // Two old plank leaves are hinged into the rooms. Their slight angle keeps
  // the corridor-facing orientation readable without blocking the walkway.
  for (const leaf of [-1, 1] as const) {
    const panel = doorLeaf(0.66, doorHeight, leaf);
    b.merge(panel, [x - side * 0.07, 0.07, z + leaf * 0.34], [0, facing + leaf * 0.22, 0]);
  }
  // A small room plaque is turned toward the passage, not toward the camera's
  // end wall, so the four room identities remain discoverable in motion.
  const labels = side === -1 ? (z === -2 ? '听' : '灯') : z === -2 ? '门' : '纸';
  plaque(b, labels, [x - side * 0.14, 2.63, z], 0.27, 0.4, facing, true);
}

/**
 * A shallow room bay behind every corridor door keeps the side rooms from
 * reading as painted panels.  The opening reveals a timber threshold, an
 * uneven plaster rear wall and a small transom, which is enough depth to make
 * the old guest rooms believable while leaving the playable walkway clear.
 */
function sideRoomBay(b: Builder, side: -1 | 1, z: number) {
  const inner = side * 7.15;
  const rear = side * 8.55;
  const plaster = { ...M.plaster, color: 0xb2ab91, rough: 1 };
  const beam = { ...M.darkWood, color: 0x3a3028, rough: 0.96 };
  b.box([2.72, 0.12, 3.35], [side * 7.05, -0.03, z], M.wood);
  b.box([0.18, 3.1, 3.35], [rear, 1.5, z], plaster);
  b.box([0.22, 3.2, 0.16], [inner, 1.58, z - 1.68], beam);
  b.box([0.22, 3.2, 0.16], [inner, 1.58, z + 1.68], beam);
  b.box([0.22, 0.18, 3.6], [side * 7.05, 3.07, z], beam);
  b.box([0.22, 0.16, 3.4], [rear - side * 0.06, 0.42, z], beam);
  b.box([2.9, 0.1, 3.35], [side * 7.05, 3.11, z], {
    ...M.wood,
    color: 0x40372c,
    rough: 0.97,
  });

  // A dim paper lattice on the rear wall catches daylight and warm eave light.
  b.box([0.04, 1.1, 1.45], [rear - side * 0.11, 1.9, z], {
    color: 0x9c9c82,
    rough: 1,
    glow: 0.04,
  });
  for (const offset of [-0.58, -0.19, 0.19, 0.58])
    b.box([0.06, 1.22, 0.04], [rear - side * 0.15, 1.9, z + offset], beam);
  for (const y of [1.35, 1.9, 2.45]) b.box([0.06, 0.04, 1.5], [rear - side * 0.15, y, z], beam);
}
