import { Builder, materials as M } from '@/scene/geometry/builder';
import { incenseBurner } from '@/scene/world_prop/ritual';
import { node, type WorldNode } from '@/scene/world/types';
import { templeLayout } from '@/scene/world_environment/temple_layout';
import { compoundHall, compoundTower } from '@/scene/world_environment/compound_hall';
import {
  compoundCloister,
  compoundGardens,
  compoundLantern,
  compoundPaving,
  enclosureWall,
} from '@/scene/world_environment/compound_site';
import { templeStone } from '@/scene/world_environment/temple_facade';

export function templeCompound(distant = false): WorldNode {
  const b = new Builder();
  // Shared site coordinates keep the road reveal, gate and map consistent.
  // The base remains below the individual pavements to prevent z-fighting.
  b.box([64, 0.16, 60], [0, -0.32, -32], { ...M.stone, color: 0x697362 });
  b.box([41, 0.18, 17], [0, -0.15, 6.6], templeStone);
  // The distant road shot uses its own graded arrival surface. Keeping the
  // foreground and axial paving here would put another large plane directly
  // under the road transition and reintroduce a depth seam at the gate.
  if (!distant) {
    compoundPaving(b, [0, -0.02, 5], 17, 12);
    compoundPaving(b, [0, -0.02, -30], 4.8, 56);
  }
  for (const [z, width, depth] of [
    [-5.9, 25, 3.4],
    [-20.3, 26, 6],
    [-38, 27, 7],
    [-47, 20, 4],
  ]) {
    const wing = (width - 4.8) / 2;
    for (const side of [-1, 1]) compoundPaving(b, [side * (2.4 + wing / 2), -0.02, z], wing, depth);
  }
  compoundGardens(b, distant);
  for (const side of [-1, 1]) {
    enclosureWall(b, [side * 7.05, 0, -2.4], [side * 32, 0, -2.4], 3.2, distant);
    enclosureWall(b, [side * 32, 0, -2.4], [side * 32, 0, -62], 3.2, distant);
    compoundCloister(b, side * 32.8, -21, 7, 29, distant);
  }
  enclosureWall(b, [-32, 0, -62], [32, 0, -62], 3.5, distant);
  b.box([21, 1.05, 22], [0, 0.35, -51], templeStone);
  for (const building of templeLayout) {
    if (building.kind === 'tower')
      compoundTower(
        b,
        building.x,
        building.z,
        building.id === 'bell_tower' ? 'bell' : 'drum',
        distant,
      );
    else compoundHall(b, building, distant);
  }
  for (let step = 0; step < 6; step++)
    b.box([8, 0.16, 2.5 - step * 0.34], [0, step * 0.16, -39 - step * 0.17], templeStone);
  for (const [x, z] of [
    [-4.8, 4.2],
    [4.8, 4.2],
    [-5.2, -4.8],
    [5.2, -4.8],
  ])
    compoundLantern(b, x, z);
  const root = b.mesh('temple_compound');
  // Keep semantic anchors without fragmenting the static scene into draws.
  for (const building of templeLayout) {
    const marker = node(building.id);
    marker.position = [building.x, building.base, building.z];
    root.children.push(marker);
  }
  root.children.push(incenseBurner([0, 0.03, -20.3], false));
  return root;
}
