import type { GameState } from '@/shared/types/game';
import { WorldView } from '@/scene/world_view';
import styles from './style.module.css';

export function OpeningJourney({
  phase,
  state,
  onAvailability,
}: {
  phase: 'road' | 'alighting';
  state: GameState;
  onAvailability: (available: boolean) => void;
}) {
  return (
    <div className={styles.journey} data-opening-phase={phase}>
      <WorldView key={phase} state={state} mode={phase} onAvailability={onAvailability} />
    </div>
  );
}
