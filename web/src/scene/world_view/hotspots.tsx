import type { RefObject } from 'react';
import type { Hotspot } from '@/scene/world/types';
import styles from '@/scene/world_view/style.module.css';

export function WorldHotspots({
  hotspots,
  container,
  enabled,
  onAction,
}: {
  hotspots: Hotspot[];
  container: RefObject<HTMLDivElement | null>;
  enabled: boolean;
  onAction?: (command: string) => Promise<void>;
}) {
  return (
    <div ref={container} className={styles.hotspots} aria-label="场景中的可调查道具">
      {hotspots.map((prop) => (
        <button
          key={prop.id}
          data-prop={prop.id}
          className={styles.hotspot}
          type="button"
          disabled={!enabled}
          aria-label={'观察' + prop.name}
          onClick={() => {
            if (enabled) void onAction?.(prop.command);
          }}
        >
          <i aria-hidden="true" />
          <span>{prop.name}</span>
        </button>
      ))}
    </div>
  );
}
