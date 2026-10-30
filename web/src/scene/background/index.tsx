import type { GameState } from '@/shared/types/game';
import { WorldView } from '@/scene/world_view';

export function Scene({
  state,
  onAction,
  interactive,
  onAvailability,
}: {
  state: GameState;
  onAction: (command: string) => Promise<void>;
  interactive?: boolean;
  onAvailability?: (available: boolean) => void;
}) {
  return (
    <WorldView
      state={state}
      onAction={onAction}
      interactive={interactive}
      onAvailability={onAvailability}
    />
  );
}
