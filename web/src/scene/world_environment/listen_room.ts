import { Builder, materials as M } from '@/scene/geometry/builder';
import { roomShell } from '@/scene/world_environment/room_shell';
import { doorFrame, movingDoor } from '@/scene/world_environment/doors';
import { plaque } from '@/scene/world_environment/architecture';

// The near wall separates the bedroom from the strip of corridor occupied
// by the player. The opening is real geometry, so looking aside shows wood.
export const LISTEN_DOOR = { x: -2.55, z: 1.65 };
export const LISTEN_CORRIDOR = { x: [-4.4, -0.7], z: [2.4, 4.65] } as const;

export function listenRoom(roomName = '灯') {
  const b = new Builder();
  roomShell(b, false);
  const { x, z } = LISTEN_DOOR;
  const plaster = { ...M.plaster, color: 0x9d9787 };
  for (const [left, right] of [
    [-5, x - 0.78],
    [x + 0.78, 5],
  ]) {
    b.box([right - left, 3.7, 0.25], [(left + right) / 2, 1.85, z], plaster);
    b.box([right - left, 0.3, 0.29], [(left + right) / 2, 0.3, z], M.darkWood);
  }
  b.box([1.56, 1.15, 0.25], [x, 3.125, z], plaster);
  // Close the generic shell's unused far doorway; this room is entered only
  // from the near corridor, through the half-open leaves below.
  b.box([1.56, 2.55, 0.25], [2.4, 1.275, -4], plaster);
  doorFrame(b, [x, 0, z]);
  plaque(b, roomName, [x, 2.71, z + 0.16], 0.24, 0.35, 0, true);
  b.box([1.6, 0.4, 2.55], [-3, 0.23, -1.65], M.darkWood);
  b.box([1.5, 0.11, 2.4], [-3, 0.5, -1.65], {
    color: 0x8e947f,
    rough: 1,
    pattern: 2,
  });
  b.ball([0.55, 0.11, 0.24], [-3, 0.64, -2.5], {
    color: 0xc0bba5,
    rough: 1,
    pattern: 2,
  });
  b.box([1.58, 0.72, 0.13], [-3, 0.52, -2.98], M.wood);
  const root = b.mesh('listen');
  root.children.push(movingDoor([x, 0, z], 'ajar', false));
  return root;
}
