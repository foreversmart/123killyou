import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '@/shared/types/game';
import { createWorld } from '@/scene/world/create_world';
import { performanceKey } from '@/scene/world/performance_key';
import type { WorldMode, V3 } from '@/scene/world/types';
import { TempleRenderer } from '@/scene/renderer/engine';
import { project } from '@/scene/renderer/frame';
import styles from '@/scene/world_view/style.module.css';

type Props = {
  state: GameState;
  mode?: WorldMode;
  interactive?: boolean;
  onAction?: (command: string) => Promise<void>;
  onAvailability?: (available: boolean) => void;
};

export function WorldView({
  state,
  mode = 'story',
  interactive = false,
  onAction,
  onAvailability,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const hotspots = useRef<HTMLDivElement>(null);
  const engine = useRef<TempleRenderer | null>(null);
  const world = useMemo(() => createWorld({ state, mode }), [state, mode]);
  const actionKey = performanceKey(state, mode);
  const latest = useRef({ world, actionKey, paused: state.paused, onAvailability });
  latest.current = { world, actionKey, paused: state.paused, onAvailability };
  const aim = useRef<V3>([0, 0, 0]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const enabled = interactive && status === 'ready' && !state.paused && !state.caught;

  useEffect(() => {
    let disposed = false,
      failed = false,
      frame = 0,
      activeWorld = world,
      activeActionKey = actionKey;
    let clock = 0,
      previous = performance.now();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fail = (message: string) => {
      if (disposed) return;
      failed = true;
      setError(message);
      setStatus('error');
      latest.current.onAvailability?.(false);
      cancelAnimationFrame(frame);
    };
    latest.current.onAvailability?.(false);
    void TempleRenderer.create(canvas.current!, fail)
      .then((renderer) => {
        if (disposed) {
          renderer.dispose();
          return;
        }
        engine.current = renderer;
        renderer.setWorld(activeWorld);
        const tick = (now: number) => {
          if (disposed) return;
          const delta = Math.min((now - previous) / 1000, 0.05);
          previous = now;
          if (document.visibilityState === 'hidden') {
            frame = requestAnimationFrame(tick);
            return;
          }
          if (activeWorld !== latest.current.world) {
            activeWorld = latest.current.world;
            renderer.setWorld(activeWorld);
            if (activeActionKey !== latest.current.actionKey) clock = 0;
            activeActionKey = latest.current.actionKey;
          }
          if (!latest.current.paused) clock += delta;
          try {
            const matrix = renderer.render(
              activeWorld,
              reduced ? 10 : clock,
              delta,
              reduced ? [0, 0, 0] : aim.current,
            );
            for (const button of hotspots.current?.querySelectorAll<HTMLButtonElement>('button') ||
              []) {
              const point = activeWorld.hotspots.find((prop) => prop.id === button.dataset.prop);
              const screen = point ? project(point.position, matrix) : null;
              button.hidden = !screen;
              if (screen) {
                button.style.left = screen.x + '%';
                button.style.top = screen.y + '%';
              }
            }
          } catch (error) {
            fail('3D 画面未能完成绘制：' + String(error));
            return;
          }
          frame = requestAnimationFrame(tick);
        };
        tick(performance.now());
        if (!failed) {
          setStatus('ready');
          latest.current.onAvailability?.(true);
        }
      })
      .catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);

  return (
    <div
      className={styles.world}
      data-world-status={status}
      data-world-scene={state.sceneKey}
      data-world-mode={mode}
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse') return;
        const rect = event.currentTarget.getBoundingClientRect();
        aim.current = [
          ((event.clientX - rect.left) / rect.width - 0.5) * 0.16,
          -((event.clientY - rect.top) / rect.height - 0.5) * 0.045,
          0,
        ];
      }}
      onPointerLeave={() => {
        aim.current = [0, 0, 0];
      }}
    >
      <canvas
        ref={canvas}
        className={styles.canvas}
        aria-label={(state.sceneName || state.roomName) + '，实时 3D 场景'}
        role="img"
      />
      {mode === 'story' && (
        <div ref={hotspots} className={styles.hotspots} aria-label="场景中的可调查道具">
          {world.hotspots.map((prop) => (
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
    </div>
  );
}
