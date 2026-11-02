import { Builder } from '@/scene/geometry/builder';
import {
  courtyardPavers,
  plaque,
  roof,
  windowLattice,
} from '@/scene/world_environment/architecture';
import { courtyardWall } from '@/scene/world_environment/courtyard_walls';
import { doorway } from '@/scene/world_environment/doors';
import { CORRIDOR_ENCLOSURE } from '@/scene/world_environment/enclosure_layout';
import { paintedBeam, reliefPanel } from '@/scene/world_environment/temple_ornament';
import { templeRed } from '@/scene/world_environment/temple_palette';

/** Built space beyond the southern gateway, visible when the player turns. */
export function corridorSideHall(b: Builder) {
  const { halfWidth, back } = CORRIDOR_ENCLOSURE;
  const front = 7.65;
  const depth = back - front;
  const centerZ = (front + back) / 2;
  const timber = templeRed;
  courtyardPavers(b, [0, -0.025, centerZ], halfWidth * 2, depth + 0.3, 0.66, 0.69);
  for (const side of [-1, 1]) {
    courtyardWall(b, [side * halfWidth, 0, centerZ], depth + 0.3, 3.55, [], Math.PI / 2);
    b.box([0.18, 0.22, depth + 0.3], [side * 4.65, 3.45, centerZ], timber);
    b.box([0.26, 3.55, 0.26], [side * 4.65, 1.775, back - 0.2], timber);
    paintedBeam(b, [side * 5.29, 3.14, centerZ], depth - 0.2, 0.28, (-side * Math.PI) / 2);
    reliefPanel(b, [side * 5.29, 0.82, centerZ], 2.1, 1.9, (-side * Math.PI) / 2);
  }
  courtyardWall(b, [0, 0, back], halfWidth * 2 + 0.25, 3.55, [
    { x: -3.2, width: 1.8, bottom: 1.05, top: 2.65 },
    { x: 0, width: 1.56, bottom: 0, top: 2.55 },
    { x: 3.2, width: 1.8, bottom: 1.05, top: 2.65 },
  ]);
  // Paper-backed lattice and closed hall doors terminate the view at masonry,
  // while the gateway itself remains open for the existing travel cameras.
  for (const x of [-3.2, 3.2]) windowLattice(b, x, 1.85, back - 0.14, 1.8, 1.6, false, Math.PI);
  const entrance = new Builder();
  doorway(entrance, [0, 0, 0], false);
  plaque(entrance, '偏殿', [0, 2.73, 0.04], 0.68, 0.28, 0, true);
  b.merge(entrance.build(), [0, 0, back - 0.15], [0, Math.PI, 0]);
  b.box([halfWidth * 2 + 0.25, 0.15, depth + 0.6], [0, 3.55, centerZ], timber);
  paintedBeam(b, [0, 3.16, back - 0.15], halfWidth * 2 - 0.5, 0.34, Math.PI);
  for (let z = front; z <= back; z += 0.65)
    b.box([halfWidth * 2, 0.16, 0.12], [0, 3.42, z], timber);
  roof(b, 0, centerZ, halfWidth * 2 + 0.8, depth + 1, 3.65);
}
