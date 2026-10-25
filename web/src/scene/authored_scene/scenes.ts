import type { GameState } from '@/shared/types/game';
import { dayScene } from './day_scenes';
import { nightScene } from './night_scenes';
import { exteriorScene } from './exterior_scenes';
import type { SceneComposition } from './types';

export function authoredScene(state: GameState): SceneComposition | undefined {
  return dayScene(state) || nightScene(state) || exteriorScene(state);
}
