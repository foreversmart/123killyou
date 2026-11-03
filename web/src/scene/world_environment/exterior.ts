import { Builder, materials as M } from '@/scene/geometry/builder';
import { roof } from '@/scene/world_environment/architecture';
import type { WorldNode } from '@/scene/world/types';
import { landscape } from '@/scene/world_environment/terrain';
import { addVegetation, addForecourtGarden } from '@/scene/world_environment/vegetation';
import { templeCompound } from '@/scene/world_environment/temple_compound';
import { templeEntrance } from '@/scene/world_environment/temple_entrance';
import { corridorTerminals } from '@/scene/world_environment/corridor_terminals';
import { courtyardGround, courtyardGarden } from '@/scene/world_environment/courtyard_garden';
import { courtyardWall, moonGate } from '@/scene/world_environment/courtyard_walls';
import { courtyardRoom } from '@/scene/world_environment/courtyard_rooms';
import { courtyardSconce } from '@/scene/world_environment/courtyard_lights';
import { CORRIDOR_ENCLOSURE } from '@/scene/world_environment/enclosure_layout';
import { buddhistMural } from '@/scene/world_environment/statue';
import { bracket } from '@/scene/world_environment/temple_facade';
import { cloudScroll, paintedBeam } from '@/scene/world_environment/temple_ornament';
import { templeGold, templeJade, templeRed } from '@/scene/world_environment/temple_palette';

export { templeEntrance } from '@/scene/world_environment/temple_entrance';

export function templeGate(): WorldNode {
  const b = new Builder();
  landscape(b);
  const root = b.mesh('temple_gate');
  root.children.push(templeEntrance(), templeCompound(true));
  addVegetation(root);
  addForecourtGarden(root);
  return root;
}

/** Repeated polychrome bays connect the courtyard to the carved worship halls. */
export function corridor(daylight: boolean): WorldNode {
  const b = new Builder();
  courtyardGround(b);
  const timber = templeRed;
  for (const side of [-1, 1] as const) {
    const wallCenter = -0.2;
    const openings = [
      ...[-2, -6].map((z) => ({ x: side * (z - wallCenter), width: 1.64, bottom: 0, top: 2.65 })),
      { x: side * (-4.08 - wallCenter), width: 1.46, bottom: 1.05, top: 2.65, lattice: true },
    ];
    if (side === -1)
      openings.push({
        x: side * (3.2 - wallCenter),
        width: 1.85,
        bottom: 1.05,
        top: 2.65,
        lattice: true,
      });
    else openings.push({ x: 3.3 - wallCenter, width: 3.44, bottom: 0, top: 3.22 });
    courtyardWall(b, [side * 5.5, 0, wallCenter], 16, 3.55, openings, (-side * Math.PI) / 2);
    if (side === 1) moonGate(b, [5.5, 0, 3.3], -Math.PI / 2);
    for (const z of [-2, -6]) courtyardRoom(b, side, z, daylight);
    for (const z of [6.5, 0.35, -4.1, -7.35]) {
      b.box([0.29, 3.58, 0.29], [side * 4.65, 1.89, z], timber);
      b.box([0.45, 0.34, 0.45], [side * 4.65, 0.17, z], { ...M.stone, color: 0x8d9289 });
      b.box([0.5, 0.075, 0.5], [side * 4.65, 0.36, z], M.stone);
      b.box([0.7, 0.16, 0.9], [side * 4.65, 3.5, z], timber);
      b.box([0.36, 0.15, 1.26], [side * 4.65, 3.67, z], timber);
      bracket(b, [side * 4.65, 3.29, z], Math.PI / 2, 0.58);
      b.box([0.32, 0.05, 0.32], [side * 4.65, 0.56, z], templeGold);
      cloudScroll(b, [side * 4.49, 3.08, z], 0.34, (-side * Math.PI) / 2);
      for (const end of [-1, 1])
        b.rod([side * 4.65, 3.03, z], [side * 4.65, 3.48, z + end * 0.61], 0.055, timber);
      if (z === 0.35 || z === -4.1) courtyardSconce(b, [side * 4.65, 1.95, z + 0.19], !daylight);
    }
    b.box([0.24, 0.28, 16.6], [side * 4.65, 3.66, -0.35], timber);
    b.box([0.18, 0.22, 16.6], [side * 5.43, 3.54, -0.35], timber);
    b.box([0.15, 0.15, 16.7], [side * 3.48, 3.59, -0.35], timber);
    paintedBeam(b, [side * 4.49, 3.62, -0.35], 16.6, 0.3, (-side * Math.PI) / 2);
    paintedBeam(b, [side * 5.28, 3.36, -0.35], 16.5, 0.22, (-side * Math.PI) / 2);
    for (let z = -8.35; z <= 8; z += 0.4)
      b.box([2.7, 0.11, 0.07], [side * 4.65, 3.7, z], templeJade);
    // The ridge follows the corridor; slope and tiles run across its short span.
    const canopy = new Builder();
    roof(canopy, 0, 0, 17.1, 2.8, 3.74);
    b.merge(canopy.build(), [side * 4.65, 0, -0.35], [0, Math.PI / 2, 0]);
  }
  courtyardWall(b, [0, 0, CORRIDOR_ENCLOSURE.front], 11, 3.55, [
    { x: 0, width: 3.05, bottom: 0, top: 2.85 },
    { x: -3.8, width: 1.75, bottom: 1.05, top: 2.65, lattice: true },
    { x: 3.8, width: 1.75, bottom: 1.05, top: 2.65, lattice: true },
  ]);
  roof(b, 0, -7.85, 11.5, 1.25, 3.6);
  // A recessed hall vestibule gives the middle door real depth beyond the wall.
  b.box([3.15, 0.1, 3.2], [0, -0.02, -9.3], M.wood);
  b.box([3.15, 0.14, 3.2], [0, 2.93, -9.3], timber);
  b.box([3.15, 3, 0.18], [0, 1.5, -10.85], { ...M.darkWood, color: 0x262822 });
  for (const side of [-1, 1]) b.box([0.15, 3, 3.2], [side * 1.57, 1.5, -9.3], timber);
  // The story's drag mark remains on the central slabs, with no planting over it.
  for (let i = 0; i < 17; i++)
    b.box([0.022, 0.004, 0.18], [-0.9 + i * 0.045, 0.006, -i * 0.28], {
      ...M.stone,
      color: 0x45463c,
    });
  const root = b.mesh('east_courtyard');
  // Keep the six painted panels between the room bays; the enclosed terminal
  // behind the side gate is additional architecture, not a replacement for
  // this corridor landmark sequence.
  for (const side of [-1, 1] as const)
    for (const [z, accent] of [
      [1.35, 0xb36d4e],
      [-4.25, 0x4f7569],
      [-8.35, 0x9a5847],
    ] as const)
      root.children.push(
        buddhistMural([side * 5.34, 1.02, z], side === -1 ? Math.PI / 2 : -Math.PI / 2, accent),
      );
  root.children.push(...corridorTerminals(daylight), courtyardGarden(daylight));
  return root;
}
