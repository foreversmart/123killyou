import type { GameState } from '@/shared/types/game';
import { DiscoveryCallout } from '@/scene/story_observation/discovery_callout';
import { BowlTagDetail } from '@/scene/story_observation/evidence_art';
import styles from '@/scene/world_evidence/style.module.css';

// Written evidence stays legible; physical objects are inspected by the 3D camera.
export function WorldEvidence({ state }: { state: GameState }) {
  if (state.shotKey === 'register_drag_mark')
    return <DiscoveryCallout drawing={/图/.test(state.lastHeard)} />;
  if (state.shotKey === 'refectory_porridge' && state.flags.bowl_tags_seen)
    return (
      <figure className={styles.evidence}>
        <figcaption>四只木碗签</figcaption>
        <BowlTagDetail />
      </figure>
    );
  return null;
}
