import type { GameState } from '@/shared/types/game';
import styles from './style.module.css';

// Include the portable-item inspections accepted by storyInspection at the gate.
const observationShots = new Set([
  'arrival_plaque',
  'arrival_cat',
  'arrival_inner',
  'register_camera_bell',
  'register_drag_mark',
  'register_ribbon',
  'room_key',
  'room_beads',
  'room_permit',
  'room_oil_lamp',
]);

export function ArrivalObservation({ state }: { state: GameState }) {
  const text =
    state.sceneKey === 'mini_arrival' &&
    observationShots.has(state.shotKey || '') &&
    !state.dialogue.text.trim()
      ? state.sceneText?.trim()
      : '';
  return (
    <p className={styles.observation} role="status" aria-atomic="true">
      {text}
    </p>
  );
}
