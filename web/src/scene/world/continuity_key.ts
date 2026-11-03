import type { GameState } from '@/shared/types/game';
import type { WorldMode } from '@/scene/world/types';
import { isDaylight, scenePlace } from '@/scene/world/scene_state';
import { listenRoomSide } from '@/scene/world/listen_route';

/** Story beats share a physical space; a restored run starts a fresh performance. */
export function continuityKey(state: GameState, mode: WorldMode) {
  return JSON.stringify([
    state.id,
    state.runId,
    mode,
    scenePlace(state, mode),
    isDaylight(state, mode),
    state.sceneKey === 'mini_death',
    state.sceneKey === 'mini_listen' ? listenRoomSide(state) : null,
    mode === 'story' ? null : state.sceneKey,
  ]);
}
