import type { GameState, SceneActor } from '@/shared/types/game';
import type { V3, WorldMode } from '@/scene/world/types';
import { ease } from '@/scene/world_character/joints';

export type Movement = { from: V3; to: V3; duration: number };

export function actorFacing(actor: SceneActor, state: GameState, position: V3, fallback: number) {
  let target: V3 | undefined;
  if (state.sceneKey === 'mini_arrival') {
    if (actor.id === 'xuzhi' && state.shotKey === 'arrival_gate_beauty') target = [0, 3, -1];
    if (actor.id === 'linlan' && state.shotKey === 'arrival_weather') target = [0, 3, -1];
    if (actor.id === 'zhouyan' && state.shotKey === 'arrival_zhouyan') target = [-3.9, 2.7, -1.9];
  }
  return target ? Math.atan2(target[0] - position[0], target[2] - position[2]) : fallback;
}

export function actorMovement(
  actor: SceneActor,
  state: GameState,
  mode: WorldMode,
  position: V3,
): Movement | undefined {
  const [x, y, z] = position;
  if (
    (mode === 'travel' || mode === 'hall') &&
    !(state.sceneKey === 'mini_ending' && actor.id === 'luchen')
  ) {
    const duration = mode === 'hall' ? 7 : state.sceneKey === 'mini_corridor_candle' ? 4 : 3;
    return {
      from: position,
      to: mode === 'hall' ? [x + duration * 0.43, y, z] : [x, y, z - duration * 0.43],
      duration,
    };
  }
  if (actor.id === 'skin_double' && state.shotKey === 'double_exit' && !state.flags.double_calm)
    return { from: position, to: [2.55, 0, -3.2], duration: 1.6 };
  if (state.sceneKey !== 'mini_arrival') return;
  if (state.shotKey === 'arrival_unload' && actor.id === 'linlan')
    return { from: [x - 1.2, y, z + 0.5], to: position, duration: 1.7 };
  if (state.shotKey === 'arrival_zhouyan' && actor.id === 'zhouyan')
    return { from: [x - 0.7, y, z + 0.7], to: position, duration: 1.5 };
  if (state.shotKey === 'arrival_luchen' && actor.id === 'luchen')
    return { from: [x, y, z - 1.1], to: position, duration: 1.8 };
}

export function movementPosition(movement: Movement, time: number): V3 {
  const progress = ease(time, movement.duration);
  return movement.from.map((value, i) => value + (movement.to[i] - value) * progress) as V3;
}
