import { Builder, materials as M } from '@/scene/geometry/builder';
import { floor, plaque } from '@/scene/world_environment/architecture';
import { compoundRoof } from '@/scene/world_environment/compound_roof';
import {
  balustrade,
  bracket,
  ceremonialDoor,
  templeStone,
  templeTimber,
  timberBay,
} from '@/scene/world_environment/temple_facade';
import type { WorldNode } from '@/scene/world/types';
import {
  cloudScroll,
  paintedBeam,
  reliefPanel,
  shrineCrown,
} from '@/scene/world_environment/temple_ornament';
import { templeJade, templeGold, templeRed } from '@/scene/world_environment/temple_palette';

/** The entrance and the distant approach share the same built gate silhouette. */
export function templeEntrance(distant = false): WorldNode {
  const b = new Builder();
  if (!distant) floor(b, 17, 14, 'stone');
  b.box([14.2, 0.4, 4], [0, 0.12, -2.2], templeStone);
  for (let step = 0; step < 3; step++)
    b.box([7.2, 0.12, 1.5 - step * 0.42], [0, 0.06 + step * 0.12, 0.55 - step * 0.21], templeStone);
  for (const side of [-1, 1]) {
    const x = side * 3.1;
    b.box([0.46, 4.6, 0.46], [x, 2.6, -2], templeRed);
    for (const edge of [-1, 1])
      b.box([0.035, 3.8, 0.035], [x + edge * 0.18, 2.55, -1.75], templeGold);
    b.box([0.58, 0.18, 0.58], [x, 4.1, -2], templeJade);
    b.box([0.61, 0.38, 0.6], [x, 0.49, -2], templeStone);
    bracket(b, [x, 4.38, -2], 0, 1.3);
    b.box([0.38, 4.6, 0.38], [x, 2.6, -4], templeTimber);
    bracket(b, [x, 4.38, -4], 0, 1.2);
    ceremonialDoor(b, [side * 2.6, 0.37, -2.65], 1.65, 3.85, side * 0.78);
    for (const offset of [1, 3])
      timberBay(b, [side * (3.1 + offset), 0.36, -2.3], 2, 3.25, 0, true);
    paintedBeam(b, [side * 5.1, 3.55, -2.03], 4, 0.38);
    if (!distant) {
      reliefPanel(b, [side * 5.1, 2.65, -1.92], 1.65, 0.62);
      cloudScroll(b, [side * 3.25, 3.4, -1.7], 0.6);
    }
    compoundRoof(b, side * 5.1, -2.9, 4.4, 3.6, 3.75, 0.8, distant);
    balustrade(b, [side * 3.8, 0.36, -0.35], [side * 7.05, 0.36, -0.35]);
  }
  b.box([6.6, 0.4, 0.42], [0, 4.72, -2], templeTimber);
  b.box([6.6, 0.18, 0.3], [0, 4.23, -2.01], templeTimber);
  paintedBeam(b, [0, 4.49, -1.72], 6.6, 0.46);
  paintedBeam(b, [0, 4.09, -1.65], 6.15, 0.22);
  for (const side of [-1, 1]) {
    reliefPanel(b, [side * 2.38, 3.52, -1.57], 1.0, 0.48);
    if (!distant) cloudScroll(b, [side * 1.73, 3.5, -1.56], 0.52);
  }
  b.box([6.3, 0.35, 0.4], [0, 4.7, -4], templeTimber);
  for (const x of [-2.1, -1.05, 0, 1.05, 2.1]) {
    b.box([0.16, 0.26, 3.2], [x, 4.88, -2.9], templeTimber);
    bracket(b, [x, 4.45, -2], 0, 0.7);
  }
  compoundRoof(b, 0, -2.9, 8, 5.5, 5.03, 1.5, distant);
  // A projecting layered shrine crest gives the gate the reference's tall,
  // crowded silhouette while leaving the original passage and evidence clear.
  shrineCrown(b, [0, 4.9, -1.1], 5.8, 1.5);
  for (const x of [-2.45, 2.45]) bracket(b, [x, 5.08, -1.48], 0, 0.7);
  plaque(b, '红烛寺', [0, 3.76, -1.22], 2.3, 0.66);
  // Keep the existing interactive bell suspended from the rebuilt eave.
  if (!distant) b.rod([-2.7, 2.87, -0.8], [-2.7, 5.03, -0.8], 0.009, M.brass);
  // Evidence plaques remain at the established interactive anchors.
  plaque(b, '明照寺', [-3.9, 1.2, -1.95], 0.58, 0.85, 0.1);
  plaque(b, '香客止步', [4.5, 0.65, 0.6], 0.6, 0.8, -0.25);
  for (const side of [-1, 1]) {
    b.box([0.16, 0.58, 0.17], [side * 3.11, 2.27, -1.73], { ...M.brass, color: 0x86785e });
    b.box([0.1, 0.43, 0.06], [side * 3.11, 2.27, -1.61], {
      color: 0xffdf9f,
      rough: 0.6,
      glow: 0.3,
    });
  }
  return b.mesh('temple_entrance');
}
