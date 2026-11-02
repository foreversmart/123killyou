import type { RefObject } from 'react';
import type { Hotspot } from '@/scene/world/types';
import styles from '@/scene/world_view/style.module.css';
import { WorldHotspots } from '@/scene/world_view/hotspots';

export function WorldOverlay({
  mode,
  status,
  error,
  enabled,
  hotspots,
  hotspotsRef,
  onAction,
}: {
  mode: string;
  status: 'loading' | 'ready' | 'error';
  error: string;
  enabled: boolean;
  hotspots: Hotspot[];
  hotspotsRef: RefObject<HTMLDivElement | null>;
  onAction?: (command: string) => Promise<void>;
}) {
  return (
    <>
      {mode === 'story' && (
        <WorldHotspots
          hotspots={hotspots}
          container={hotspotsRef}
          enabled={enabled}
          onAction={onAction}
        />
      )}
      {status !== 'ready' && (
        <div className={styles.feedback} role={status === 'error' ? 'alert' : 'status'}>
          <strong>{status === 'error' ? '3D 画面暂时无法显示' : '正在走近红烛寺……'}</strong>
          <p>{status === 'error' ? error : '正在准备场景、人物和灯光'}</p>
          {status === 'error' && (
            <button type="button" onClick={() => location.reload()}>
              重新检测并载入
            </button>
          )}
        </div>
      )}
      {mode === 'story' && enabled && status === 'ready' && (
        <div className={styles.controlsHint} aria-hidden="true">
          <span>WASD</span> 移动 · 按住鼠标拖动视角
        </div>
      )}
    </>
  );
}
