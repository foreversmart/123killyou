import { Builder, materials as M } from '@/scene/geometry/builder';
import { plaque } from '@/scene/world_environment/architecture';
import { doorLeaf } from '@/scene/world_environment/doors';
import { octagonalLattice } from '@/scene/world_environment/courtyard_lattice';
import { cloudScroll, paintedBeam, lotusBoss } from '@/scene/world_environment/temple_ornament';
import { templeGold, templeRed } from '@/scene/world_environment/temple_palette';

/** Guest rooms retain their four authored coordinates and open toward the passage. */
export function courtyardRoom(b: Builder, side: -1 | 1, z: number) {
  const local = new Builder();
  const wood = templeRed;
  for (const x of [-0.75, 0.75]) local.box([0.16, 2.64, 0.22], [x, 1.32, 0], wood);
  local.box([1.66, 0.18, 0.25], [0, 2.58, 0], wood);
  paintedBeam(local, [0, 3.27, 0], 2.35, 0.3);
  for (const side of [-1, 1]) {
    cloudScroll(local, [side * 0.93, 2.8, 0.12], 0.38);
    local.box([0.022, 2.4, 0.025], [side * 0.75, 1.32, 0.13], templeGold);
    lotusBoss(local, [side * 0.75, 2.35, 0.15], 0.09);
  }
  local.box([1.48, 0.11, 0.34], [0, 0.03, 0], M.stone);
  for (const leaf of [-1, 1])
    local.merge(doorLeaf(0.67, 2.36, -leaf), [leaf * 0.67, 0.07, -0.045], [0, -leaf * 0.14, 0]);
  const label = side === -1 ? (z === -2 ? '听' : '灯') : z === -2 ? '门' : '纸';
  plaque(local, label, [0, 2.68, 0.145], 0.27, 0.36, 0, true);
  b.merge(local.build(), [side * 5.5, 0, z], [0, (-side * Math.PI) / 2, 0]);

  const plaster = { ...M.plaster, color: 0xbcb298, rough: 0.96 };
  b.box([2.94, 0.12, 2.5], [side * 7.05, -0.03, z], M.wood);
  b.box([0.2, 3.16, 2.5], [side * 8.55, 1.58, z], plaster);
  for (const offset of [-1.25, 1.25]) {
    b.box([2.95, 3.16, 0.16], [side * 7.02, 1.58, z + offset], plaster);
    b.box([0.17, 3.16, 0.18], [side * 5.65, 1.58, z + offset], wood);
  }
  b.box([2.94, 0.13, 2.5], [side * 7.05, 3.11, z], wood);
  b.box([0.04, 1.1, 1.45], [side * 8.42, 1.9, z], { color: 0x969987, rough: 1, glow: 0.03 });
  octagonalLattice(b, [side * 8.38, 1.9, z], 1.45, 1.1, (-side * Math.PI) / 2);
}
