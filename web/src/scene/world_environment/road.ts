import { Builder } from '@/scene/geometry/builder';
import { landscape } from '@/scene/world_environment/terrain';
import { addVegetation } from '@/scene/world_environment/vegetation';
import { templeEntrance } from '@/scene/world_environment/exterior';
import { templeCompound } from '@/scene/world_environment/temple_compound';
import { roadSurface } from '@/scene/world_environment/road_surface';
import { node, type CameraShot } from '@/scene/world/types';
import { coach } from '@/scene/world_vehicle/coach';
import { journeyFrame } from '@/scene/world_vehicle/journey';

export function road(departing: boolean, camera: CameraShot) {
  const root = node('mountain_road'),
    b = new Builder();
  landscape(b, true);
  root.children.push(
    b.mesh('mountain_landscape'),
    roadSurface(),
    templeEntrance(true),
    templeCompound(),
  );
  addVegetation(root, true);
  const vehicle = coach();
  vehicle.root.animate = (t) => {
    const frame = journeyFrame(t, departing);
    vehicle.root.position = frame.position;
    vehicle.root.rotation = [frame.pitch, frame.yaw, frame.roll];
    vehicle.roll(frame.distance, frame.steering);
    Object.assign(camera, frame.camera);
  };
  vehicle.root.animate(0, 0);
  root.children.push(vehicle.root);
  return root;
}
