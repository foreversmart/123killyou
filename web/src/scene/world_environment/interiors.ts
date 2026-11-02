import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder } from '@/scene/geometry/primitives';
import { roomShell, table, plaque } from '@/scene/world_environment/architecture';
import { doorFrame, movingDoor, type DoorState } from '@/scene/world_environment/doors';
import type { WorldNode } from '@/scene/world/types';
import { buddhistMural, bodhisattva, heavenlyKing } from '@/scene/world_environment/statue';
import { incenseBurner, lantern, woodFish } from '@/scene/world_prop/ritual';
import { hallShell } from '@/scene/world_environment/hall_shell';
import {
  cloudScroll,
  paintedBeam,
  reliefPanel,
  shrineCrown,
} from '@/scene/world_environment/temple_ornament';
import { templeGold, templeJade, templeRed } from '@/scene/world_environment/temple_palette';

export function interior(
  kind: 'register' | 'refectory' | 'bedroom' | 'listen' | 'oracle' | 'hall',
  doorState: DoorState = 'closed',
  daylight = false,
): WorldNode {
  const b = new Builder();
  const ritualProps: WorldNode[] = [];
  if (kind === 'hall') hallShell(b, daylight);
  else roomShell(b, daylight, kind === 'oracle' ? 'stone' : 'wood');
  addInteriorJoinery(b, kind, daylight);
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
    if (kind === 'oracle')
      for (const x of [-4.2, 4.2]) b.add(cylinder(0.22, 0.27, 3.5), templeRed, [x, 1.75, -1.5]);
  }
  const root = b.mesh(kind);
  root.children.push(movingDoor([2.4, 0, -3.75], doorState, kind === 'bedroom'));
  if (kind === 'oracle' || kind === 'hall')
    for (const x of kind === 'hall' ? [-2.3, 2.3] : [-1.2])
      root.children.push(bodhisattva([x, 0, kind === 'hall' ? -3.1 : -2.5]));
  if (kind === 'hall') {
    // The four full-size guardians form a clear row before the recessed
    // Guanyin altars. In two deep side rows, the rear kings intersected those
    // plinths and the front pair hid them; the parasol also entered a column.
    // All four attributes now face the existing camera above the procession.
    root.children.push(
      heavenlyKing([-3.4, 0, -1.3], 'pipa', 0.1),
      heavenlyKing([-1.15, 0, -1.3], 'sword', 0.04),
      heavenlyKing([1.0, 0, -1.3], 'dragon', -0.04),
      heavenlyKing([3.05, 0, -1.3], 'umbrella', -0.18),
      buddhistMural([-4.82, 1.38, -2.95], Math.PI / 2, 0xb36d4e),
      buddhistMural([4.82, 1.38, -2.95], -Math.PI / 2, 0x8d6b45),
      buddhistMural([-4.82, 1.38, -1.12], Math.PI / 2, 0x4f7569),
      buddhistMural([4.82, 1.38, -1.12], -Math.PI / 2, 0x9a5847),
    );
    ritualProps.push(incenseBurner([0, 0.58, -2.1], true));
  }
  if (kind === 'oracle') ritualProps.push(incenseBurner([1.12, 0.73, -0.5], true));
  if (kind === 'register' || kind === 'refectory' || kind === 'hall') {
    ritualProps.push(
      hangingLantern([-1.85, 2.86, -0.9], !daylight),
      hangingLantern([1.55, 2.86, -1.15], !daylight),
    );
  }
  root.children.push(...ritualProps);
  return root;
}

/** Add the quiet architectural layers that make the rooms feel built, not boxed. */
function addInteriorJoinery(
  b: Builder,
  kind: 'register' | 'refectory' | 'bedroom' | 'listen' | 'oracle' | 'hall',
  daylight: boolean,
) {
  const paper = { color: daylight ? 0xc4c1ad : 0x8f8b77, rough: 1, glow: daylight ? 0.04 : 0.01 };
  const trim = templeRed;
  // Side-wall paper panels echo the courtyard's geometric lattice and catch a
  // soft amber edge when the room lamps come on.
  for (const side of [-1, 1] as const) {
    const x = side * 4.86;
    b.box([0.05, 1.42, 1.28], [x, 1.9, 1.3], paper);
    b.box([0.08, 1.58, 0.09], [x + side * 0.035, 1.9, 0.62], trim);
    b.box([0.08, 1.58, 0.09], [x + side * 0.035, 1.9, 1.98], trim);
    for (const y of [1.22, 1.9, 2.58]) b.box([0.08, 0.07, 1.28], [x + side * 0.035, y, 1.3], trim);
  }
  // A slim red lintel and dark beam establish the strong horizontal rhythm of
  // a southern Chinese hall without competing with the story props.
  paintedBeam(b, [0, 3.34, -3.72], 9.5, 0.28);
  b.box([9.7, 0.1, 0.12], [0, 3.48, -3.69], trim);

  if (kind === 'register' || kind === 'refectory') {
    // Work and dining rooms share the temple's painted carpentry, without altar figures.
    for (const side of [-1, 1]) {
      paintedBeam(b, [side * 4.76, 2.96, 0.75], 3.3, 0.25, (-side * Math.PI) / 2);
      for (const z of [-0.65, 2.2])
        cloudScroll(b, [side * 4.74, 2.76, z], 0.37, (-side * Math.PI) / 2);
    }
    for (const x of [-3.5, 0, 3.5]) b.box([2.9, 0.5, 0.06], [x, 0.63, 5.18], templeJade);
    b.box([9.6, 0.035, 0.08], [0, 0.9, 5.15], templeGold);
  }

  if (kind === 'oracle') {
    shrineCrown(b, [-1.2, 2.78, -3.59], 2.9, 0.68);
    reliefPanel(b, [-3.77, 1.03, -3.64], 1.45, 1.9);
    for (const side of [-1, 1]) {
      reliefPanel(b, [side * 4.72, 0.85, -1.95], 2.0, 2.1, (-side * Math.PI) / 2);
      cloudScroll(b, [side * 4.2, 2.94, -1.22], 0.48);
    }
  }

  if (kind === 'hall' || kind === 'oracle') {
    b.box([2.15, 0.08, 0.55], [0.1, 1.04, -3.48], trim);
    b.box([1.92, 0.04, 0.38], [0.1, 1.11, -3.47], {
      color: 0x9b7b4d,
      rough: 0.85,
      pattern: 2,
    });
  }
  if (kind === 'bedroom' || kind === 'listen') {
    // A low folding screen gives the sleeping rooms a sheltered, lived-in
    // corner and breaks up the long plaster wall behind the bed.
    const x = -1.68;
    b.box([0.08, 1.72, 0.06], [x, 1.05, -3.24], trim);
    b.box([0.08, 1.72, 0.06], [x + 0.9, 1.05, -3.24], trim);
    b.box([0.92, 1.42, 0.035], [x + 0.45, 1.08, -3.2], paper);
    b.box([0.96, 0.07, 0.05], [x + 0.45, 1.78, -3.17], { ...M.redWood, color: 0x713b31 });
  }
}

function hangingLantern(position: [number, number, number], lit: boolean) {
  const b = new Builder();
  b.rod([0, 0.52, 0], [0, 0.82, 0], 0.012, M.darkWood);
  lantern(b, lit);
  const root = b.mesh('interior_hanging_lantern');
  root.position = position;
  return root;
}
