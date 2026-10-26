import type { CSSProperties } from 'react';
import { AuthoredScene, type SceneComposition } from '@/scene/authored_scene';
import styles from './style.module.css';

export function DeparturePan({
  composition,
  skipTravel,
  paused,
}: {
  composition: SceneComposition;
  skipTravel: boolean;
  paused: boolean;
}) {
  return (
    <div
      className={styles.departure}
      data-departure-pan="true"
      data-paused={paused}
      style={{ '--departure-delay': skipTravel ? '0ms' : '2200ms' } as CSSProperties}
    >
      <div className={styles.landscape}>
        <AuthoredScene composition={composition} />
      </div>
    </div>
  );
}
