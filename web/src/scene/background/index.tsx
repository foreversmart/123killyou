import type { GameState } from '@/shared/types/game';
import { WorldView } from '@/scene/world_view';

export function Scene({
  state,
  speaker,
  onAction,
  interactive,
  motionPaused,
  onAvailability,
}: {
  state: GameState;
  speaker?: string;
  onAction: (command: string) => Promise<void>;
  interactive?: boolean;
  motionPaused?: boolean;
  onAvailability?: (available: boolean) => void;
}) {
  return (
    <WorldView
      state={state}
      speaker={speaker}
      onAction={onAction}
      interactive={interactive}
      motionPaused={motionPaused}
      onAvailability={onAvailability}
    />
  );
}
