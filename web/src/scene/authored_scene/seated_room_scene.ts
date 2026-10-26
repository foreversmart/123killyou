import { storyAssets } from '@/shared/lib/story_assets';
import type { GameState } from '@/shared/types/game';
import { completeScene } from './complete_scene';
import type { SceneComposition } from './types';

const solitaryScenes = new Set([
  'mini_room',
  'mini_wake_three_gongs',
  'mini_four_knocks',
  'mini_three_knocks',
  'mini_dawn_trap',
]);

/** The sole occupant and furniture are painted into each candle-lighting state. */
export function seatedRoomScene(state: GameState): SceneComposition | undefined {
  if (!solitaryScenes.has(state.sceneKey || '')) return undefined;
  // The three-gong wake shot always presents the extinguished wick.
  const lit = state.sceneKey !== 'mini_wake_three_gongs' && Boolean(state.flags.red_candle_lit);
  return completeScene(
    lit ? storyAssets.scenes.playerRoomSeatedLit : storyAssets.scenes.playerRoomSeatedUnlit,
  );
}
