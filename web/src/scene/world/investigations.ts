import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder, torus } from '@/scene/geometry/primitives';
import { key } from '@/scene/world_prop/ritual';
import { plaque } from '@/scene/world_environment/architecture';
import type { GameState } from '@/shared/types/game';
import type { V3, World } from '@/scene/world/types';

// Carried evidence can be held up to the camera without changing the inventory.
export function addInvestigation(world: World, state: GameState) {
  const b = new Builder();
  let position: V3;
  if (state.shotKey === 'room_key') {
    key(b);
    position = [-0.3, 1.05, 1];
  } else if (state.shotKey === 'register_camera_bell') {
    b.add(cylinder(0.065, 0.065, 0.018), M.black, [0, 0.1, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    b.add(torus(0.085, 0.004), M.black, [0, 0.2, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    b.add(cylinder(0.045, 0.07, 0.09), M.brass, [0.16, 0.17, 0]);
    b.rod([0.16, 0.18, 0], [0.16, 0.08, 0], 0.005, M.brass);
    position = [-2.7, 1.1, -1.75];
  } else if (state.shotKey === 'register_ribbon') {
    plaque(b, '入住须知', [0, 0, 0], 0.3, 0.43);
    b.add(
      torus(0.045, 0.01),
      { color: 0x467eae, rough: 0.65 },
      [0.11, 0.43, 0.025],
      [1, 1, 1],
      [Math.PI / 2, 0, 0],
    );
    position = [2.8, 1.3, -1.7];
  } else return;
  const model = b.mesh('inspected_evidence');
  model.position = position;
  world.root.children.push(model);
  world.camera = {
    eye: [
      position[0] + 0.17,
      position[1] + 0.37,
      position[2] + (state.shotKey === 'room_key' ? 0.42 : 0.72),
    ],
    target: [position[0], position[1] + (state.shotKey === 'room_key' ? 0 : 0.15), position[2]],
    fov: 43,
  };
}
