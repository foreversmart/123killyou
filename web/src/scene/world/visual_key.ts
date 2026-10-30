import type { GameState } from '@/shared/types/game';
import type { WorldMode } from '@/scene/world/types';

/** Only changes consumed by the 3D scene require rebuilding geometry and rigs. */
export function visualKey(state: GameState, mode: WorldMode) {
  return JSON.stringify([
    mode,
    state.sceneKey,
    state.shotKey,
    state.retryScene,
    state.room,
    Object.entries(state.flags).sort(([a], [b]) => a.localeCompare(b)),
    state.actors?.map(({ id, name, portrait, visible }) => [id, name, portrait, visible]),
  ]);
}
