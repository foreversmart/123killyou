import type { GameState } from '@/shared/types/game';
import { WorldView } from '@/scene/world_view';
import styles from './style.module.css';

export function OpeningJourney({
  state,
  speaker,
  onAvailability,
}: {
  state: GameState;
  speaker?: string;
  onAvailability: (available: boolean) => void;
}) {
  return (
    <div className={styles.journey} data-opening-phase="road">
      <WorldView state={state} speaker={speaker} mode="road" onAvailability={onAvailability} />
    </div>
  );
}
