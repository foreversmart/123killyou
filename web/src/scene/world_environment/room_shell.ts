import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder } from '@/scene/geometry/primitives';
import { floor, windowLattice } from '@/scene/world_environment/architecture';
import { ROOM_ENCLOSURE } from '@/scene/world_environment/enclosure_layout';
import { paintedBeam, lotusBoss, cloudScroll } from '@/scene/world_environment/temple_ornament';
import { templeGold, templeJade, templeRed } from '@/scene/world_environment/temple_palette';

export function roomShell(b: Builder, daylight: boolean, surface: 'wood' | 'stone' = 'wood') {
  floor(b, 11, 14, surface);
  const { halfWidth, front, back, height, thickness } = ROOM_ENCLOSURE;
  const depth = back - front + thickness;
  const centerZ = (front + back) / 2;
  const plaster = { ...M.plaster, color: 0xb4aa90, rough: 0.96 };
  // Wall openings are real gaps, including the space behind swinging doors.
  for (const [left, right] of [
    [-5, -3.5],
    [-1.3, 1.62],
    [3.18, 5],
  ])
    b.box([right - left, 3.7, 0.25], [(left + right) / 2, 1.85, -4], plaster);
  b.box([2.2, 1.05, 0.25], [-2.4, 0.525, -4], plaster);
  b.box([2.2, 0.95, 0.25], [-2.4, 3.225, -4], plaster);
  b.box([1.56, 1.15, 0.25], [2.4, 3.125, -4], plaster);
  // Enclose the eye at every authored angle, including the starting position
  // behind the old side-wall ends. Overlap the corners and ceiling joints.
  b.box([halfWidth * 2 + thickness, height, thickness], [0, height / 2, back], plaster);
  b.box([halfWidth * 2 + thickness, 0.2, thickness], [0, height - 0.09, front], plaster);
  for (const x of [-halfWidth, halfWidth]) {
    b.box([thickness, height, depth], [x, height / 2, centerZ], plaster);
    for (const z of [-4, -1, 2, back - 0.18]) {
      b.add(cylinder(0.11, 0.14, 3.7), templeRed, [x * 0.98, 1.85, z]);
      b.add(cylinder(0.145, 0.145, 0.055, 12), templeGold, [x * 0.98, 0.45, z]);
    }
    paintedBeam(
      b,
      [x * 0.965, 3.36, centerZ],
      depth - 0.3,
      0.28,
      x < 0 ? Math.PI / 2 : -Math.PI / 2,
    );
  }
  // A dark timber dado and regularly spaced posts give the plaster walls the
  // layered joinery seen in the reference courtyard. The low rail also keeps
  // the room readable when warm light falls across the side walls.
  b.box([9.8, 0.18, 0.14], [0, 0.28, -3.84], M.darkWood);
  b.box([0.14, 0.34, depth], [-4.82, 0.3, centerZ], M.darkWood);
  b.box([0.14, 0.34, depth], [4.82, 0.3, centerZ], M.darkWood);
  b.box([9.8, 0.34, 0.14], [0, 0.3, back - 0.18], M.darkWood);
  for (const x of [-4.72, -2.4, 0, 2.4, 4.72]) {
    b.box([0.1, 3.35, 0.12], [x, 1.72, -3.78], M.darkWood);
    b.box([0.1, 3.35, 0.12], [x, 1.72, back - 0.19], M.darkWood);
  }
  for (const z of [-3.7, -0.5, 2.5, back - 0.18]) {
    b.box([10, 0.24, 0.22], [0, 3.5, z], templeRed);
    paintedBeam(b, [0, 3.48, z + 0.13], 9.7, 0.24);
    paintedBeam(b, [0, 3.48, z - 0.13], 9.7, 0.24, Math.PI);
    for (const x of [-4.35, 4.35]) cloudScroll(b, [x, 3.2, z + 0.13], 0.34);
  }
  // A real ceiling closes the room above the rafters. From the mattress the
  // player now sees dark, irregular timber boards instead of an open skybox.
  b.box([halfWidth * 2 + thickness, 0.14, depth], [0, height, centerZ], {
    ...M.wood,
    color: 0x453b31,
    rough: 0.96,
  });
  for (let x = -4.75; x < 5; x += 0.5)
    b.box([0.495, 0.13, 10], [x, 3.73, 0.6], { ...M.wood, color: 0x554c3d });
  for (const x of [-4.4, -2.2, 0, 2.2, 4.4])
    b.box([0.16, 0.2, 9.7], [x, 3.78, 0.55], { ...M.darkWood, color: 0x302a24 });
  windowLattice(b, -2.4, 1.9, -3.83, 2.1, 1.7, daylight);
  windowLattice(b, -4.88, 2.05, 0.95, 1.65, 1.45, daylight, Math.PI / 2);
  windowLattice(b, 4.88, 2.05, -0.15, 1.65, 1.45, daylight, -Math.PI / 2);
  b.box([10, 0.22, 0.3], [0, 0.12, -3.8], M.darkWood);
  // Restrained carved wainscot carries the same temple craft into the living rooms.
  for (const x of [-3.55, -1.17, 1.17, 3.55]) {
    b.box([2.15, 0.75, 0.075], [x, 0.72, back - 0.17], templeJade);
    for (const y of [0.36, 1.08]) b.box([2.18, 0.028, 0.095], [x, y, back - 0.22], templeGold);
    lotusBoss(b, [x, 0.72, back - 0.25], 0.12, Math.PI);
  }
}
