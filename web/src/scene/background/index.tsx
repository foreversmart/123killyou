import type { GameState } from '@/shared/types/game';
import { WorldView } from '@/scene/world_view';

export function Scene({
  state,
  speaker,
  onAction,
  interactive,
  onAvailability,
}: {
  state: GameState;
  speaker?: string;
  onAction: (command: string) => Promise<void>;
  interactive?: boolean;
  onAvailability?: (available: boolean) => void;
}) {
  return (
    <WorldView
      state={state}
      speaker={speaker}
      onAction={onAction}
      interactive={interactive}
      onAvailability={onAvailability}
    />
  );
}
