import type { GameState } from '@/shared/types/game';
import { ArrivalInteraction } from '@/scene/arrival';
import { StoryStage } from '@/scene/story_stage';

export function StoryScene({
  state,
  onAction,
  interactive = true,
}: {
  state: GameState;
  onAction: (command: string) => Promise<void>;
  interactive?: boolean;
}) {
  if (!state.storyMode && !state.sceneKey) return null;
  return state.sceneKey === 'mini_arrival' ? (
    <ArrivalInteraction state={state} onAction={onAction} interactive={interactive} />
  ) : (
    <StoryStage state={state} onAction={onAction} interactive={interactive} />
  );
}
