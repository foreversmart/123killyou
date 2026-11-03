import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder } from '@/scene/geometry/primitives';
import { floor, windowLattice } from '@/scene/world_environment/architecture';
import { roof } from '@/scene/world_environment/tiled_roof';
import {
  bracket,
  sideDoor,
  templePatina,
  templeTimber,
  templeVermilion,
  timberBay,
} from '@/scene/world_environment/temple_facade';
import { guardianLampPositions, shrineLamp } from '@/scene/world_environment/shrine_details';
import {
  cloudScroll,
  lotusBoss,
  paintedBeam,
  reliefPanel,
  shrineCrown,
} from '@/scene/world_environment/temple_ornament';
import { templeGold, templeJade } from '@/scene/world_environment/temple_palette';

/** The worship hall has its own structural scale; furniture keeps its story anchors. */
export function hallShell(b: Builder, daylight: boolean) {
  floor(b, 11.6, 13.8, 'stone');
  // A low vermilion dado and patinated metal inlay give the hall the dense,
  // shrine-like backdrop visible behind the reference guardian statues.
  b.box([10.2, 0.58, 0.16], [0, 0.42, -4.34], templeVermilion);
  b.box([9.55, 0.08, 0.03], [0, 0.76, -4.25], templePatina);
  for (const [x, y, z] of guardianLampPositions) shrineLamp(b, [x, y - 0.94, z]);
  const height = 5.8;
  for (const side of [-1, 1]) {
    for (const z of [-3, -0.2, 2.6]) {
      timberBay(b, [side * 5.25, 0, z], 2.8, height, (-side * Math.PI) / 2, true);
      b.add(cylinder(0.2, 0.24, height, 16), templeTimber, [side * 4.68, height / 2, z - 1.3]);
      b.box([0.58, 0.23, 0.58], [side * 4.68, 0.08, z - 1.3], M.stone);
      bracket(b, [side * 4.68, height - 0.55, z - 1.3], 0, 1.35);
      for (const y of [0.42, 3.42, 4.92])
        b.add(cylinder(0.245, 0.245, 0.065, 16), templeGold, [side * 4.68, y, z - 1.3]);
      paintedBeam(b, [side * 4.94, 3.55, z], 2.7, 0.48, (-side * Math.PI) / 2);
      reliefPanel(b, [side * 5.08, 0.82, z], 2.35, 2.38, (-side * Math.PI) / 2);
      cloudScroll(b, [side * 4.65, 4.15, z - 1.3], 0.72, (-side * Math.PI) / 2);
    }
    // Pale upper panels and diagonal braces remain visible above the statues.
    for (const z of [-2.8, 0, 2.8]) {
      b.box([0.12, 1.1, 2.35], [side * 5.1, 4.8, z], templeJade);
      windowLattice(b, side * 5.02, 4.8, z, 2.05, 0.86, daylight, (-side * Math.PI) / 2);
      paintedBeam(b, [side * 4.94, 4.15, z], 2.72, 0.31, (-side * Math.PI) / 2);
    }
  }
  // Rear passage has the same opening as the interactive room door.
  for (const [left, right] of [
    [-5.25, 1.62],
    [3.18, 5.25],
  ])
    timberBay(b, [(left + right) / 2, 0, -4.45], right - left, height);
  timberBay(b, [2.4, 2.55, -4.45], 1.56, height - 2.55);
  for (const z of [-3.65, -0.2, 3.3]) {
    b.box([10.5, 0.32, 0.3], [0, 5.5, z], templeTimber);
    paintedBeam(b, [0, 5.27, z + 0.18], 9.8, 0.5);
    paintedBeam(b, [0, 5.27, z - 0.18], 9.8, 0.5, Math.PI);
    b.box([8.8, 0.24, 0.24], [0, 6.18, z], templeTimber);
    paintedBeam(b, [0, 6.12, z + 0.16], 8.6, 0.3);
    for (const x of [-3.2, -1.6, 0, 1.6, 3.2]) {
      bracket(b, [x, 5.66, z], 0, 0.62);
      lotusBoss(b, [x, 5.28, z + 0.39], 0.15);
    }
    for (const side of [-1, 1])
      b.rod([side * 4.5, 5.55, z], [side * 2.7, 6.5, z], 0.1, templeTimber);
  }
  b.box([10.5, 0.16, 9.1], [0, 6.65, -0.05], { ...M.wood, color: 0x3f2925 });
  for (let x = -5; x <= 5; x += 0.36) b.box([0.1, 0.15, 9.2], [x, 6.48, -0.05], templeTimber);
  // Recessed shrines form the stacked, sculptural backdrop without moving an altar.
  for (const x of [-2.3, 2.3]) {
    shrineCrown(b, [x, 3.05, -3.94], 3.45, 1.68);
    paintedBeam(b, [x, 4.92, -3.96], 3.65, 0.24);
    for (const side of [-1, 1]) cloudScroll(b, [x + side * 1.42, 2.82, -3.72], 0.74);
  }
  for (const x of [-4.55, -0.3, 4.53]) reliefPanel(b, [x, 0.94, -4.2], 1.08, 2.0);
  // Open ceremonial leaves frame the sightline into the hall, as in reference 3.
  for (const side of [-1, 1]) {
    b.box([0.3, 5.4, 0.36], [side * 3.85, 2.7, 3.65], templeTimber);
    sideDoor(b, [side * 3.38, 0.02, 3.72], 1.37, 4.65, side * 0.84);
    timberBay(b, [side * 4.76, 0, 3.67], 1.55, 5.35);
    bracket(b, [side * 3.85, 5.1, 3.65], 0, 1.35);
    cloudScroll(b, [side * 3.78, 4.55, 3.95], 0.6);
    b.box([0.33, 0.09, 0.39], [side * 3.85, 0.55, 3.65], templeGold);
  }
  b.box([10.8, 0.4, 0.44], [0, 5.57, 3.65], templeTimber);
  paintedBeam(b, [0, 5.34, 3.9], 10.4);
  paintedBeam(b, [0, 5.34, 3.4], 10.4, 0.38, Math.PI);
  timberBay(b, [0, 5.8, 3.65], 10.6, 1.35);
  roof(b, 0, 3.9, 12.1, 3.2, 5.95);
}
