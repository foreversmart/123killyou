import { Builder, materials as M } from '@/scene/geometry/builder';
import { torus } from '@/scene/geometry/primitives';
import { node, type V3 } from '@/scene/world/types';
export { heavenlyKing } from '@/scene/world_environment/guardian_sculpture';

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
