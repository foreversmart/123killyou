import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder, lathe, torus } from '@/scene/geometry/primitives';
import { node, type V3 } from '@/scene/world/types';

export function bodhisattva(position: V3) {
  const root = node('bodhisattva');
  root.position = position;
  const pedestal = new Builder();
  pedestal.box([1.95, 0.16, 1.65], [0, 0.08, 0], M.stone);
  pedestal.box([1.78, 0.26, 1.5], [0, 0.29, 0], M.darkWood);
  pedestal.box([1.9, 0.08, 1.62], [0, 0.46, 0], M.wood);
  for (const side of [-1, 1]) {
    pedestal.box([0.08, 0.26, 1.5], [side * 0.8, 0.29, 0], M.wood);
    pedestal.box([1.6, 0.055, 0.04], [0, 0.24, side * 0.76], M.wood);
  }
  root.children.push(pedestal.mesh('altar_pedestal'));
  const sculpture = node('scanned_guanyin');
  sculpture.asset = 'guanyin';
  sculpture.position[1] = 0.5;
  root.children.push(sculpture);
  return root;
}

type GuardianKind = 'pipa' | 'sword' | 'dragon' | 'umbrella';

const guardianColors = {
  vermilion: { color: 0x8b3f32, rough: 0.82, pattern: 2 },
  ochre: { color: 0x9a7040, rough: 0.84, pattern: 2 },
  indigo: { color: 0x3b5661, rough: 0.86, pattern: 2 },
  jade: { color: 0x42665a, rough: 0.85, pattern: 2 },
};

/**
 * A compact wooden guardian for the main hall. These are deliberately made
 * from chunky, hand-carved forms so they read as old lacquered temple statues
 * at a distance while still holding up when the travel camera passes them.
 */
export function heavenlyKing(position: V3, kind: GuardianKind, yaw = 0) {
  const root = node(`heavenly_king_${kind}`);
  root.position = position;
  root.rotation[1] = yaw;
  const b = new Builder();
  const palette =
    kind === 'pipa'
      ? guardianColors.ochre
      : kind === 'sword'
        ? guardianColors.vermilion
        : kind === 'dragon'
          ? guardianColors.indigo
          : guardianColors.jade;
  const lacquer = { ...palette, rough: 0.9 };
  const gold = { color: 0xb18a4d, rough: 0.45, metal: 0.42, pattern: 5 };
  const skin = { color: 0x9d7657, rough: 0.96, pattern: 3 };

  // Weighted plinth and folded robe. A lathed lower robe gives the guardians
  // the gathered, slightly uneven silhouette of carved temple figures instead
  // of a stack of primitive boxes.
  b.box([0.94, 0.14, 0.74], [0, 0.07, 0], M.stone);
  b.box([0.8, 0.18, 0.62], [0, 0.23, 0], M.darkWood);
  b.add(
    lathe([
      [0.19, 0],
      [0.31, 0.08],
      [0.35, 0.26],
      [0.32, 0.46],
      [0.24, 0.58],
      [0.14, 0.64],
      [0, 0.64],
    ]),
    lacquer,
    [0, 0.24, 0],
  );
  b.box([0.7, 0.18, 0.5], [0, 0.37, 0], palette);

  // Layered lamellar chest and shoulder guards.
  b.box([0.5, 0.62, 0.34], [0, 0.98, 0], lacquer);
  b.add(torus(0.34, 0.035, 20), gold, [0, 0.82, 0]);
  for (const side of [-1, 1]) {
    b.ball([0.16, 0.16, 0.18], [side * 0.31, 1.18, 0], gold);
    for (let row = 0; row < 3; row++)
      b.box([0.18, 0.035, 0.05], [side * (0.2 + row * 0.045), 0.78 + row * 0.12, 0.19], gold);
  }
  b.box([0.2, 0.25, 0.2], [-0.32, 0.86, 0], lacquer);
  b.box([0.2, 0.25, 0.2], [0.32, 0.86, 0], lacquer);
  b.add(cylinder(0.09, 0.11, 0.2, 12), skin, [0, 1.34, 0]);
  b.ball([0.19, 0.23, 0.18], [0, 1.48, 0], skin);
  // Brows, nose and a restrained moustache make the faces read as guardian
  // carvings when the camera passes the side bays.
  b.box([0.1, 0.025, 0.025], [-0.075, 1.53, 0.165], M.darkWood, [0, 0, -0.12]);
  b.box([0.1, 0.025, 0.025], [0.075, 1.53, 0.165], M.darkWood, [0, 0, 0.12]);
  b.rod([0, 1.51, 0.18], [0, 1.45, 0.2], 0.018, skin);
  b.box([0.12, 0.028, 0.018], [0, 1.415, 0.18], M.darkWood);
  b.box([0.3, 0.1, 0.27], [0, 1.65, 0], gold);
  b.box([0.22, 0.2, 0.18], [0, 1.78, 0], lacquer);
  for (const side of [-1, 1])
    b.box([0.07, 0.28, 0.08], [side * 0.16, 1.86, 0], gold, [0, 0, side * 0.13]);
  b.box([0.42, 0.055, 0.1], [0, 0.66, 0.22], gold, [0.18, 0, 0]);
  b.box([0.42, 0.055, 0.1], [0, 0.55, 0.2], gold, [-0.14, 0, 0]);
  b.ball([0.035, 0.04, 0.025], [-0.07, 1.49, 0.17], M.black);
  b.ball([0.035, 0.04, 0.025], [0.07, 1.49, 0.17], M.black);

  // Each king carries a different traditional attribute, making the tableau
  // legible without relying on labels or extra UI.
  if (kind === 'sword') {
    b.rod([-0.27, 1.02, 0.04], [-0.44, 0.3, 0.06], 0.045, lacquer);
    b.rod([-0.44, 0.3, 0.06], [-0.42, 0.12, 0.06], 0.027, gold);
    b.box([0.055, 0.72, 0.04], [0.42, 0.78, 0.1], gold, [0, 0, -0.12]);
  } else if (kind === 'pipa') {
    b.rod([0.24, 1.11, 0.12], [0.39, 0.73, 0.18], 0.035, skin);
    b.add(
      cylinder(0.15, 0.18, 0.07, 12),
      lacquer,
      [0.39, 0.64, 0.2],
      [1, 1, 1],
      [Math.PI / 2, 0, 0],
    );
    b.rod([0.39, 0.68, 0.2], [0.39, 1.05, 0.2], 0.022, M.wood);
  } else if (kind === 'dragon') {
    b.rod([-0.28, 1.05, 0.02], [-0.44, 0.43, 0.05], 0.035, skin);
    b.ball([0.2, 0.16, 0.2], [-0.45, 0.42, 0.08], gold);
    b.ball([0.06, 0.05, 0.06], [-0.45, 0.46, 0.22], guardianColors.vermilion);
  } else {
    b.rod([0.27, 1.03, 0], [0.42, 0.58, 0], 0.036, skin);
    b.rod([0.42, 0.58, 0], [0.42, 1.78, 0], 0.028, M.darkWood);
    b.add(cylinder(0.36, 0.3, 0.07, 16), lacquer, [0.42, 1.82, 0]);
    b.add(cylinder(0.25, 0.25, 0.025, 16), gold, [0.42, 1.86, 0]);
  }
  root.children.push(b.mesh('guardian_carved_wood'));
  return root;
}

/** A framed, mineral-pigment mural panel for a temple plaster wall. */
export function buddhistMural(position: V3, yaw = 0, accent = 0xb36d4e) {
  const root = node('hall_buddhist_mural');
  root.position = position;
  root.rotation[1] = yaw;
  const b = new Builder();
  const frame = { ...M.darkWood, color: 0x403128, rough: 0.97 };
  const pigment = { color: 0x8a5a43, rough: 0.97, pattern: 2 };
  const teal = { color: 0x4d726c, rough: 0.96, pattern: 2 };
  const gold = { color: 0xc39a57, rough: 0.82, pattern: 5 };
  b.box([1.32, 1.45, 0.08], [0, 0.72, 0], frame);
  b.box([1.14, 1.27, 0.035], [0, 0.72, 0.045], pigment);
  // A narrow painted border makes the panel read like a wall fresco with a
  // surviving edge, rather than a floating game prop.
  for (const side of [-1, 1]) {
    b.box([0.045, 1.2, 0.02], [side * 0.53, 0.72, 0.074], teal);
    b.box([0.045, 1.2, 0.02], [side * 0.46, 0.72, 0.076], gold);
  }
  for (const y of [0.15, 1.29]) {
    b.box([1.08, 0.045, 0.02], [0, y, 0.074], teal);
    b.box([1.08, 0.022, 0.02], [0, y + (y < 0.5 ? 0.06 : -0.06), 0.076], gold);
  }
  // Mountain-and-cloud frieze, with a seated halo figure in the center.
  for (const side of [-1, 1]) {
    b.box([0.42, 0.05, 0.018], [side * 0.3, 0.33, 0.072], teal);
    b.box([0.24, 0.05, 0.018], [side * 0.42, 0.48, 0.073], teal, [0, 0, side * 0.35]);
    b.add(torus(0.1, 0.018, 16), teal, [side * 0.35, 1.03, 0.08], [1, 1, 1], [Math.PI / 2, 0, 0]);
  }
  // Double mandorla, head, robe and hands suggest a seated bodhisattva while
  // staying deliberately shallow like mineral pigment on plaster.
  b.add(torus(0.22, 0.025, 20), gold, [0, 1.02, 0.082], [1, 1, 1], [Math.PI / 2, 0, 0]);
  b.add(torus(0.15, 0.014, 18), teal, [0, 1.02, 0.085], [1, 1, 1], [Math.PI / 2, 0, 0]);
  b.ball([0.11, 0.14, 0.045], [0, 0.9, 0.085], { color: accent, rough: 0.96, pattern: 2 });
  b.box([0.24, 0.25, 0.05], [0, 0.7, 0.085], { ...teal, color: accent });
  b.box([0.34, 0.05, 0.055], [0, 0.54, 0.09], gold);
  for (const side of [-1, 1]) {
    b.box([0.08, 0.2, 0.05], [side * 0.16, 0.71, 0.08], gold, [0, 0, side * 0.3]);
    b.ball([0.085, 0.045, 0.035], [side * 0.18, 0.57, 0.1], gold);
    // Short ribbons and lotus petals are the readable iconographic accents at
    // the camera distance used by the corridor travel shot.
    b.box([0.28, 0.035, 0.025], [side * 0.22, 0.88, 0.08], teal, [0, 0, side * 0.28]);
    b.ball([0.09, 0.045, 0.035], [side * 0.08, 0.46, 0.1], { ...pigment, color: accent });
  }
  b.box([1.05, 0.045, 0.04], [0, 1.3, 0.08], gold);
  root.children.push(b.mesh('mineral_pigment_mural'));
  return root;
}
