import type { GameState } from '@/shared/types/game';
import type { World } from '@/scene/world/types';

const focusProps: Record<string, string> = {
  arrival_cat: 'cat',
  arrival_plaque: 'plaque',
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
  if (state.shotKey === 'oracle_stone' || state.shotKey === 'oracle_rescue') {
    world.camera = { eye: [1.9, 1.65, 3.7], target: [0.65, 0.9, -0.1], fov: 55 };
    return;
  }
  const id = focusProps[state.shotKey || ''];
  const point = world.hotspots.find((prop) => prop.id === id)?.position;
  if (!point) return;
  const distance = id === 'plaque' ? 2 : id === 'latch' || id === 'cat' ? 1.6 : 0.95;
  world.camera = {
    eye: [point[0] + distance * 0.28, point[1] + distance * 0.48, point[2] + distance],
    target: [point[0], point[1] + 0.04, point[2]],
    fov: 46,
  };
}
