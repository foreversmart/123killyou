import type { GameState } from '@/shared/types/game';
import type { WorldMode } from '@/scene/world/types';
import { visibleActors } from '@/scene/world/scene_state';
import { performanceFor } from '@/scene/world_character/performance';

/** Save acknowledgements, pause and inventory updates must not replay a gesture. */
export function performanceKey(state: GameState, mode: WorldMode) {
  return JSON.stringify([
    state.sceneKey,
    state.flags.double_calm && ['double_scripture_4', 'double_calm'].includes(state.shotKey || '')
      ? 'double_calm'
      : state.shotKey,
    state.retryScene,
    mode,
    visibleActors(state, mode).map((actor) => {
      const action = performanceFor(actor, state, mode === 'travel' || mode === 'hall');
      return [
        actor.id,
        actor.portrait,
        action === 'talk' ? 'idle' : action,
        state.shotKey === 'refectory_eating' && Boolean(state.flags['meal_' + actor.id + '_ate']),
      ];
    }),
  ]);
}
