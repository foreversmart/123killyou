import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder } from '@/scene/geometry/primitives';
import { roomShell, table, plaque } from '@/scene/world_environment/architecture';
import { doorFrame, movingDoor, type DoorState } from '@/scene/world_environment/doors';
import type { WorldNode } from '@/scene/world/types';
import { buddhistMural, bodhisattva, heavenlyKing } from '@/scene/world_environment/statue';
import { incenseBurner, woodFish } from '@/scene/world_prop/ritual';

export function interior(
  kind: 'register' | 'refectory' | 'bedroom' | 'listen' | 'oracle' | 'hall',
  doorState: DoorState = 'closed',
  daylight = false,
): WorldNode {
  const b = new Builder();
  const ritualProps: WorldNode[] = [];
  roomShell(b, daylight);
  doorFrame(b, [2.4, 0, -3.75]);
  // The registration room is a work space, not the guest-room corridor.
  if (kind !== 'register')
    plaque(b, kind === 'listen' ? '灯' : '门', [2.4, 2.61, -3.65], 0.24, 0.35, 0, true);
  if (kind === 'register') {
    table(b, [0, 0, -0.2], 2.5, 1.05);
    table(b, [0, 0, -0.95], 0.65, 0.42, 0.4);
    table(b, [-3.8, 0, -2.5], 1.4, 0.6, 0.9);
    // A small side altar keeps the registration room recognisably monastic
    // without turning a practical workroom into a shrine.
    b.box([0.9, 0.06, 0.34], [-3.8, 0.94, -2.5], M.darkWood);
    b.box([0.74, 0.04, 0.22], [-3.8, 0.99, -2.5], M.wood);
    ritualProps.push(incenseBurner([-3.8, 1.03, -2.5], false));
  }
  if (kind === 'refectory') {
    table(b, [0, 0, 0], 3.6, 2.05);
    for (const x of [-2.4, 2.4]) table(b, [x, 0, -0.2], 0.38, 2.3, 0.42);
    table(b, [0, 0, -1.5], 3.6, 0.34, 0.42);
    // A thick curtain occludes the hidden abbot until the backend exposes him.
    for (let i = 0; i < 12; i++)
      b.add(cylinder(0.07, 0.08, 2.4, 10), { color: 0x4b4c3c, rough: 1, pattern: 2 }, [
        3.4 + i * 0.11,
        1.9,
        -2.95,
      ]);
    ritualProps.push(woodFish([2.8, 0.55, -2.6]));
  }
  if (kind === 'bedroom' || kind === 'listen') {
    table(b, [-1.15, 0, 0.3], 2, 1, 0.62);
    b.box([1.6, 0.4, 2.55], [-3, 0.23, -1.65], M.darkWood);
    b.box([1.5, 0.11, 2.4], [-3, 0.5, -1.65], { color: 0x8e947f, rough: 1, pattern: 2 });
    b.ball([0.55, 0.11, 0.24], [-3, 0.64, -2.5], { color: 0xc0bba5, rough: 1, pattern: 2 });
    b.box([1.58, 0.72, 0.13], [-3, 0.52, -2.98], M.wood);
    if (kind === 'bedroom' && doorState === 'closed')
      b.box([0.022, 1.04, 0.016], [2.4, 0.53, -3.68], { color: 0x84392e, rough: 0.8 });
  }
  if (kind === 'oracle' || kind === 'hall') {
    if (kind === 'oracle') table(b, [0.65, 0, 0.1], 1.65, 0.9, 0.67);
    for (const x of [-4.2, 4.2]) b.add(cylinder(0.22, 0.27, 3.5), M.redWood, [x, 1.75, -1.5]);
  }
  const root = b.mesh(kind);
  root.children.push(movingDoor([2.4, 0, -3.75], doorState, kind === 'bedroom'));
  if (kind === 'oracle' || kind === 'hall')
    for (const x of kind === 'hall' ? [-2.3, 2.3] : [-1.2])
      root.children.push(bodhisattva([x, 0, -2.5]));
  if (kind === 'hall') {
    // The four guardians flank the Guanyin altar, each with its own emblem:
    // pipa, sword, dragon and umbrella. They sit against the side bays so the
    // slow right-to-left passage keeps the full tableau in view.
    root.children.push(
      heavenlyKing([-3.86, 0, -2.9], 'pipa', 0.18),
      heavenlyKing([3.86, 0, -2.9], 'sword', -0.18),
      heavenlyKing([-3.86, 0, -1.0], 'dragon', 0.2),
      heavenlyKing([3.86, 0, -1.0], 'umbrella', -0.2),
      buddhistMural([-4.82, 1.38, -2.95], Math.PI / 2, 0xb36d4e),
      buddhistMural([4.82, 1.38, -2.95], -Math.PI / 2, 0x8d6b45),
      buddhistMural([-4.82, 1.38, -1.12], Math.PI / 2, 0x4f7569),
      buddhistMural([4.82, 1.38, -1.12], -Math.PI / 2, 0x9a5847),
    );
    ritualProps.push(incenseBurner([0, 0.58, -2.1], true));
  }
  if (kind === 'oracle') ritualProps.push(incenseBurner([1.12, 0.73, -0.5], true));
  root.children.push(...ritualProps);
  return root;
}
