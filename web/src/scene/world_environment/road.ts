import { Builder, materials as M } from '@/scene/geometry/builder';
import { landscape } from '@/scene/world_environment/terrain';
import { addVegetation } from '@/scene/world_environment/vegetation';
import { plaque, roof } from '@/scene/world_environment/architecture';
import { node, type CameraShot } from '@/scene/world/types';
import { coach } from '@/scene/world_vehicle/coach';
import { journeyFrame, roadCenter, roadTangent } from '@/scene/world_vehicle/journey';

export function road(departing: boolean, camera: CameraShot) {
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
  for (const x of [-9.4, -6.6]) b.rod([x, 0, -18.9], [x, 2.9, -18.9], 0.13, M.redWood);
  b.box([1.9, 2.45, 0.12], [-8, 1.22, -19.15], M.darkWood);
  plaque(b, '红烛寺', [-8, 2.5, -18.72], 1.55, 0.39);
  for (let i = -18; i < 24; i++) {
    const z = i * 2,
      x = roadCenter(z);
    b.box([6.2, 0.08, 2.1], [x, -0.02, z], { ...M.stone, color: 0x626863 }, [
      0,
      Math.atan(roadTangent(z)),
      0,
    ]);
    b.box([0.1, 0.01, 0.75], [x, 0.03, z], M.paper);
    for (const s of [-1, 1]) b.box([0.12, 0.5, 0.12], [x + s * 3.5, 0.25, z], M.stone);
  }
  root.children.push(b.mesh('road'));
  addVegetation(root, true);
  const vehicle = coach();
  vehicle.root.animate = (t) => {
    const frame = journeyFrame(t, departing);
    vehicle.root.position = frame.position;
    vehicle.root.rotation[1] = frame.yaw;
    vehicle.roll(frame.distance, frame.steering);
    Object.assign(camera, frame.camera);
  };
  vehicle.root.animate(0, 0);
  root.children.push(vehicle.root);
  return root;
}
