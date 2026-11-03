import type { GameState } from '@/shared/types/game';
import type { WorldMode } from '@/scene/world/types';

/** Only changes consumed by the 3D scene require rebuilding geometry and rigs. */
export function visualKey(state: GameState, mode: WorldMode) {
  // Arrival flags record observations and dialogue progress only. Keeping
  // the same world also preserves rigs, GPU buffers and the player's view.
  const gateVisit = state.sceneKey === 'mini_arrival' && mode === 'story';
  return JSON.stringify([
    state.id,
    state.runId,
    mode,
    state.sceneKey,
    gateVisit ? 'gate_visit' : state.shotKey,
    state.retryScene,
    state.room,
    gateVisit ? [] : Object.entries(state.flags).sort(([a], [b]) => a.localeCompare(b)),
    state.actors?.map(({ id, name, portrait, visible }) => [id, name, portrait, visible]),
  ]);
}
