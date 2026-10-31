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
  world.camera = {
    eye: [point[0] + distance * 0.28, point[1] + distance * 0.48, point[2] + distance],
    target: [point[0], point[1] + 0.04, point[2]],
    fov: 46,
  };
}

/**
 * When the player lies down, the eye drops onto the mattress and the view
 * opens toward the ceiling beams. Keeping this as a camera shot (rather than
 * changing the room geometry) makes the same room readable during the brief
 * sleep interlude and when the next danger scene is reached.
 */
export function applySleepCamera(world: World, state: GameState) {
  const sleepShot = state.shotKey === 'room_sleep_wait' || state.shotKey === 'escape_sleep_wait';
  if (!sleepShot || !['mini_wake_three_gongs', 'mini_dawn_trap'].includes(state.sceneKey || ''))
    return;

  const standing = { ...world.camera };
  const resting = {
    eye: [-2.92, 0.72, -1.76] as [number, number, number],
    target: [-1.68, 3.23, -1.18] as [number, number, number],
    fov: 58,
  };
  world.camera = { ...resting };
  world.root.animate = (time) => {
    const t = Math.min(1, Math.max(0, time / 1.8));
    const eased = t * t * (3 - 2 * t);
    world.camera.eye = standing.eye.map((value, i) => value + (resting.eye[i] - value) * eased) as [
      number,
      number,
      number,
    ];
    world.camera.target = standing.target.map(
      (value, i) => value + (resting.target[i] - value) * eased,
    ) as [number, number, number];
    world.camera.fov = (standing.fov || 48) + ((resting.fov || 48) - (standing.fov || 48)) * eased;
  };
}
