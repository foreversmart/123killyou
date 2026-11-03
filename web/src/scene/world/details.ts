import type { GameState } from '@/shared/types/game';
import type { World } from '@/scene/world/types';
import { isSleepInterlude } from '@/scene/world/sleep';
import { isListenDoorway, listenRoomSide } from '@/scene/world/listen_route';

const focusProps: Record<string, string> = {
  register_key_tags: 'keys',
  refectory_porridge: 'zhouyan_bowl',
  room_candle_detail: 'candle',
  wake_candle_detail: 'candle',
  room_beads: 'beads',
  room_oil_lamp: 'lamp',
  room_latch: 'latch',
  wake_door: 'latch',
  listen_vase: 'vase',
  listen_cat: 'cat',
  listen_bird: 'bird',
  oracle_cat: 'cat',
  oracle_bird: 'bird',
  oracle_cast: 'cups',
};

export function applyDetailCamera(world: World, state: GameState) {
  if (state.sceneKey === 'mini_arrival') return;
  if (state.sceneKey === 'mini_register' && state.shotKey === 'register_desk') {
    world.camera = { eye: [0.45, 1.65, 2.35], target: [-0.15, 1.05, -0.35], fov: 49 };
    return;
  }
  if (state.shotKey === 'oracle_stone' || state.shotKey === 'oracle_rescue') {
    world.camera = { eye: [1.9, 1.65, 3.7], target: [0.65, 0.9, -0.1], fov: 55 };
    return;
  }
  const id = focusProps[state.shotKey || ''];
  const point = world.hotspots.find((prop) => prop.id === id)?.position;
  if (!point) return;
  const distance = id === 'plaque' ? 2 : id === 'latch' || id === 'cat' ? 1.6 : 0.95;
  if (isListenDoorway(state)) {
    world.camera = {
      eye: [
        point[0] - listenRoomSide(state) * distance,
        point[1] + distance * 0.48,
        // Look back toward the props from the clear strip beside the door;
        // the farther side of this narrow gap is an actual planted bed.
        point[2] + 0.7,
      ],
      target: [point[0], point[1] + 0.04, point[2]],
      fov: 46,
    };
    return;
  }
  world.camera = {
    eye: [point[0] + distance * 0.28, point[1] + distance * 0.48, point[2] + distance],
    target: [point[0], point[1] + 0.04, point[2]],
    fov: 46,
  };
}

/** Keep the complete walk and lie-down in view until the wait returns to first person. */
export function applySleepCamera(world: World, state: GameState) {
  if (!isSleepInterlude(state)) return;
  world.camera = {
    eye: [-0.15, 1.85, 3.6],
    target: [-3, 0.95, -0.3],
    fov: 59,
  };
}
