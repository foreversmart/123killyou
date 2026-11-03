import { Builder, materials as M } from '@/scene/geometry/builder';
import { plaque, roof } from '@/scene/world_environment/architecture';
import type { WorldNode } from '@/scene/world/types';
import { lantern } from '@/scene/world_prop/ritual';
import { corridorSideHall } from '@/scene/world_environment/corridor_side_hall';
import { cloudScroll, paintedBeam, shrineCrown } from '@/scene/world_environment/temple_ornament';
import {
  gateIron,
  gateWood,
  gateWoodInset,
  gateWoodRail,
  templeGold,
  templeJade,
  templeRed,
} from '@/scene/world_environment/temple_palette';

/**
 * The guest corridor is the playable threshold between the east-side rooms and
 * the worship buildings. These small terminal structures keep both directions
 * legible without letting a travel shot walk through a solid end wall.
 */
export function corridorTerminals(daylight: boolean): WorldNode[] {
  return [mahaViraPortal(daylight), sideHallPortal(daylight)];
}

/** The sealed-looking side entrance into the main hall at the far end. */
function mahaViraPortal(daylight: boolean): WorldNode {
  const b = new Builder();
  const post = templeRed;
  const lintel = templeJade;
  // The opening is empty geometry, showing the recessed vestibule beyond it.
  for (const x of [-1.7, 1.7]) {
    b.box([0.29, 3.35, 0.29], [x, 1.72, -7.72], post);
    b.box([0.48, 0.24, 0.62], [x, 0.18, -7.72], M.stone);
  }
  b.box([3.55, 0.24, 0.32], [0, 3.42, -7.72], lintel);
  b.box([3.18, 0.11, 0.18], [0, 3.58, -7.72], post);
  paintedBeam(b, [0, 3.38, -7.53], 3.2);
  for (const side of [-1, 1]) cloudScroll(b, [side * 1.52, 2.89, -7.51], 0.42);
  shrineCrown(b, [0, 3.63, -7.72], 2.95, 0.9);
  for (const side of [-1, 1]) {
    const leaf = new Builder();
    const cx = -side * 0.42;
    const wood = gateWood;
    const inset = gateWoodInset;
    leaf.box([0.84, 2.68, 0.11], [cx, 1.34, 0], wood);
    for (const edge of [-0.38, 0.38]) {
      leaf.box([0.035, 2.65, 0.025], [cx + edge, 1.34, 0.065], gateWoodRail);
      leaf.box([0.018, 2.56, 0.027], [cx + edge * 0.79, 1.34, 0.084], templeRed);
    }
    for (const y of [0.3, 1.34, 2.38]) {
      leaf.box([0.68, 0.045, 0.026], [cx, y, 0.065], gateWoodRail);
      leaf.box([0.055, 0.3, 0.026], [cx, y, 0.07], gateIron);
      leaf.box([0.64, 0.62, 0.026], [cx, y + 0.22, 0.067], inset);
    }
    b.merge(leaf.build(), [side * 1.48, 0.08, -7.85], [0, side * 0.85, 0]);
  }
  // A low sill and two worn steps let the eye read the threshold before the
  // transition changes to the full hall scene.
  b.box([3.25, 0.12, 0.62], [0, 0.06, -7.36], M.stone);
  for (let i = 0; i < 2; i++)
    b.box([3.8 - i * 0.28, 0.14, 0.48], [0, -0.07 + i * 0.11, -6.85 - i * 0.35], M.stone);
  roof(b, 0, -7.85, 5.1, 2.4, 3.58);
  plaque(b, '大殿侧门', [0, 3.02, -7.3], 0.9, 0.28, 0, true);
  const lamp = new Builder();
  lantern(lamp, !daylight);
  const lampNode = lamp.mesh('maha_vira_portal_lantern');
  lampNode.position = [2.35, 2.25, -7.58];
  const root = b.mesh('corridor_to_maha_vira');
  root.children.push(lampNode);
  return root;
}

/** A timber gateway at the open courtyard end, aligned with the side hall. */
function sideHallPortal(daylight: boolean): WorldNode {
  const b = new Builder();
  corridorSideHall(b);
  const post = templeRed;
  const beam = templeJade;
  const z = 7.35;
  for (const x of [-4.55, 4.55]) {
    b.box([0.3, 3.45, 0.3], [x, 1.7, z], post);
    b.box([0.46, 0.22, 0.6], [x, 0.16, z], M.stone);
  }
  b.box([9.55, 0.24, 0.34], [0, 3.38, z], beam);
  b.box([8.85, 0.12, 0.18], [0, 3.57, z], post);
  paintedBeam(b, [0, 3.38, z - 0.21], 9.55, 0.3, Math.PI);
  paintedBeam(b, [0, 3.38, z + 0.21], 9.55, 0.3);
  // The side hall sits beyond the gateway; the short angled braces and low
  // side screens make the passage feel old and assembled over time.
  for (const side of [-1, 1]) {
    b.box([0.14, 1.15, 1.42], [side * 3.5, 1.1, z - 0.18], M.plaster);
    b.box([0.18, 1.28, 0.14], [side * 3.5, 1.1, z - 0.92], beam);
    b.box([0.18, 1.28, 0.14], [side * 3.5, 1.1, z + 0.56], beam);
    cloudScroll(b, [side * 4.42, 2.88, z - 0.21], 0.46, Math.PI);
    b.box([0.32, 0.06, 0.33], [side * 4.55, 0.58, z], templeGold);
  }
  roof(b, 0, z, 10.2, 2.25, 3.55);
  plaque(b, '偏殿回廊', [0, 2.72, z - 0.13], 0.78, 0.28, 0, true);
  const lamp = new Builder();
  lantern(lamp, !daylight);
  const lampNode = lamp.mesh('side_hall_portal_lantern');
  lampNode.position = [-2.35, 2.24, z - 0.18];
  const root = b.mesh('corridor_to_side_hall');
  root.children.push(lampNode);
  return root;
}
