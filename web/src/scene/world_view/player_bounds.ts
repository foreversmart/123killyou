import type { GameState } from '@/shared/types/game';
import type { CameraShot } from '@/scene/world/types';
import { scenePlace } from '@/scene/world/scene_state';
import { ROOM_ENCLOSURE } from '@/scene/world_environment/enclosure_layout';

type AxisRange = [number, number];
type Aabb = { x: AxisRange; z: AxisRange };
export type WalkVolume = Aabb & { obstacles: Aabb[] };
export const PLAYER_RADIUS = 0.32;

/** Walls and furniture are in world space, independent of a detail-shot eye. */
export function walkVolume(state: GameState, base: CameraShot): WalkVolume {
  const place = scenePlace(state);
  if (place === 'gate' || place === 'road')
    return { x: [-4.6, 4.6], z: [-4.5, 4.5], obstacles: [] };

  // Corridor and work-room tests historically use camera-relative limits.
  // Preserve those limits while the enclosed guest-room shots use the shell.
  if (place === 'corridor') return { x: [-4.3, 4.3], z: [-12.4, 3.9], obstacles: [] };
  if (place === 'refectory')
    return {
      x: [-3.55, 3.55],
      z: [-7.3, 3.4],
      obstacles: [
        { x: [-2.05, 2.05], z: [-1.3, 1.25] },
        { x: [-3.05, -1.85], z: [-1.45, 1.25] },
        { x: [1.85, 3.05], z: [-1.45, 1.25] },
      ],
    };
  if (place === 'register')
    return {
      x: [-3.8, 3.8],
      z: [-4.2, 4.2],
      obstacles: [
        { x: [-1.45, 1.45], z: [-0.9, 0.45] },
        { x: [-3.95, -3.15], z: [-2.95, -2.05] },
      ],
    };

  const { halfWidth, front, back, thickness } = ROOM_ENCLOSURE;
  const margin = thickness / 2 + PLAYER_RADIUS;
  let bounds: Aabb = {
    x: [-halfWidth + margin, halfWidth - margin],
    z: [front + margin, back - margin],
  };
  let obstacles: Aabb[] = [];
  if (place === 'oracle') {
    obstacles = [{ x: [-0.3, 1.6], z: [-0.48, 0.68] }];
  } else if (place === 'listen') {
    obstacles = [{ x: [-3.9, -2.05], z: [-3.1, -0.2] }];
  }

  // Convert every rectangle once. Shot-relative bounds used to let the player
  // leave the rear wall or side wall after investigating a prop or turning.
  const relative = (box: Aabb): Aabb => ({
    x: [box.x[0] - base.eye[0], box.x[1] - base.eye[0]],
    z: [box.z[0] - base.eye[2], box.z[1] - base.eye[2]],
  });
  return { ...relative(bounds), obstacles: obstacles.map(relative) };
}
