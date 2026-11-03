import type { GameState } from '@/shared/types/game';

/** The first rest, later rest and unlit-candle branch share one bed performance. */
export function isSleepInterlude(state: GameState) {
  return (
    (state.sceneKey === 'mini_wake_three_gongs' && state.shotKey === 'room_sleep_wait') ||
    (state.sceneKey === 'mini_dawn_trap' && state.shotKey === 'escape_sleep_wait') ||
    (state.sceneKey === 'mini_room' && state.shotKey === 'room_ghost_wait')
  );
}
