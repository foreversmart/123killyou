import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder } from '@/scene/geometry/primitives';
import { landscape } from '@/scene/world_environment/terrain';
import { addVegetation } from '@/scene/world_environment/vegetation';
import { plaque, roof } from '@/scene/world_environment/architecture';
import { node } from '@/scene/world/types';

export function bus() {
  const b = new Builder();
  const paint = { color: 0xc8c7b5, rough: 0.4, metal: 0.25 };
  b.box([2.1, 1.45, 5.8], [0, 1.35, 0], paint);
  b.box([2.13, 0.3, 5.85], [0, 0.9, 0], { color: 0x47797b, rough: 0.4, metal: 0.2 });
  b.box([1.95, 0.13, 5.55], [0, 2.12, 0], paint);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++)
      b.box([0.025, 0.75, 0.71], [s * 1.065, 1.66, -2.15 + i * 0.81], {
        color: 0x344f52,
        rough: 0.1,
        metal: 0.5,
      });
    for (const z of [-1.9, 1.9]) {
      b.add(
        cylinder(0.39, 0.39, 0.24, 24),
        { color: 0x272a27, rough: 0.92 },
        [s * 1.04, 0.43, z],
        [1, 1, 1],
        [0, 0, Math.PI / 2],
      );
      b.add(
        cylinder(0.21, 0.21, 0.245, 20),
        { color: 0x9b9e95, rough: 0.25, metal: 0.8 },
        [s * 1.06, 0.43, z],
        [1, 1, 1],
        [0, 0, Math.PI / 2],
      );
    }
    b.box([0.27, 0.12, 0.05], [s * 0.67, 0.88, 2.94], { color: 0xe8dda9, glow: 0.6 });
  }
  b.box([1.85, 0.82, 0.025], [0, 1.62, 2.92], { color: 0x3a585b, rough: 0.12, metal: 0.4 });
  plaque(b, '红烛寺 · 客运', [0, 1.99, 2.95], 1.25, 0.17);
  return b.mesh('bus');
}

export function road(departing: boolean) {
  const root = node('mountain_road'),
    b = new Builder();
  landscape(b, true);
  for (const [x, z, width] of [
    [-8, -21, 6],
    [-13, -25, 8],
    [-6, -28, 7],
  ]) {
    b.box([width, 2.8, 3.6], [x, 1.4, z], M.plaster);
    roof(b, x, z, width + 1.2, 4.5, 3);
  }
  for (let i = -12; i < 18; i++) {
    const z = i * 2,
      x = Math.sin(z * 0.035) * 4;
    b.box([6.2, 0.08, 2.1], [x, -0.02, z], { ...M.stone, color: 0x626863 }, [
      0,
      Math.cos(z * 0.035) * 0.13,
      0,
    ]);
    b.box([0.1, 0.01, 0.75], [x, 0.03, z], M.paper);
    for (const s of [-1, 1]) b.box([0.12, 0.5, 0.12], [x + s * 3.5, 0.25, z], M.stone);
  }
  root.children.push(b.mesh('road'));
  addVegetation(root, true);
  const vehicle = bus();
  vehicle.position = [0, 0, -1];
  vehicle.rotation[1] = departing ? Math.PI : 0;
  vehicle.animate = (t) => {
    vehicle.position[2] = -1 + Math.min(t, departing ? 2 : 3) * (departing ? -1.4 : 0.7);
    vehicle.position[0] = Math.sin(vehicle.position[2] * 0.035) * 4;
  };
  root.children.push(vehicle);
  return root;
}
