import { storyAssets } from '@/shared/lib/story_assets';
import type { SceneComposition } from './types';
import { completeScene } from './complete_scene';

/** The group and candle handoff share one fixed illustration; rules own the inventory. */
export function candleScene(): SceneComposition {
  return completeScene(storyAssets.scenes.corridorCandleDistribution, 'candle_distribution');
}
