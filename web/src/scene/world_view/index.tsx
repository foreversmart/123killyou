import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '@/shared/types/game';
import { createWorld } from '@/scene/world/create_world';
import { performanceKey } from '@/scene/world/performance_key';
import { visualKey } from '@/scene/world/visual_key';
import { scenePlace } from '@/scene/world/scene_state';
import type { WorldMode, V3 } from '@/scene/world/types';
import { TempleRenderer } from '@/scene/renderer/engine';
import { project } from '@/scene/renderer/frame';
import styles from '@/scene/world_view/style.module.css';
import { WorldOverlay } from '@/scene/world_view/world_overlay';
import { carryCharacterContinuity } from '@/scene/world_view/continuity';
import {
  createPlayerControls,
  updateMouseLook,
  updatePlayerView,
  type PlayerControls,
} from '@/scene/world_view/player_controls';
type Props = {
  state: GameState;
  speaker?: string;
  mode?: WorldMode;
  interactive?: boolean;
  motionPaused?: boolean;
  onAction?: (command: string) => Promise<void>;
  onAvailability?: (available: boolean) => void;
};
export function WorldView({
  state,
  speaker = '',
  mode = 'story',
  interactive = false,
  motionPaused = false,
  onAction,
  onAvailability,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const hotspots = useRef<HTMLDivElement>(null);
  const engine = useRef<TempleRenderer | null>(null);
  const controls = useRef<PlayerControls>(createPlayerControls());
  const sceneKey = visualKey(state, mode);
  const world = useMemo(() => createWorld({ state, mode }), [sceneKey]);
  const previousSceneKey = useRef(sceneKey);
  const [settling, setSettling] = useState(false);
  const actionKey = performanceKey(state, mode);
  const latest = useRef({
    world,
    actionKey,
    speaker,
    state,
    paused: state.paused,
    motionPaused,
    onAvailability,
  });
  latest.current = {
    world,
    actionKey,
    speaker,
    state,
    paused: state.paused,
    motionPaused,
    onAvailability,
  };
  const aim = useRef<V3>([0, 0, 0]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const enabled =
    interactive && status === 'ready' && !state.paused && !state.caught && !state.overlay;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  useEffect(() => {
    const isEditable = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      return Boolean(element?.closest('input, textarea, select, button, [contenteditable="true"]'));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!enabledRef.current || modeRef.current !== 'story' || isEditable(event.target)) return;
      const key = event.key.toLowerCase();
      if (!['w', 'a', 's', 'd'].includes(key)) return;
      controls.current.keys.add(key);
      event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      controls.current.keys.delete(event.key.toLowerCase());
    };
    const clear = () => controls.current.keys.clear();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', clear);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', clear);
    };
  }, []);
  useEffect(() => {
    if (previousSceneKey.current === sceneKey) return;
    previousSceneKey.current = sceneKey;
    if (mode !== 'story' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setSettling(true);
    const timer = window.setTimeout(() => setSettling(false), 280);
    return () => window.clearTimeout(timer);
  }, [mode, sceneKey]);
  useEffect(() => {
    let disposed = false,
      failed = false,
      frame = 0,
      activeWorld = world,
      activeActionKey = actionKey,
      activeSceneKey = state.sceneKey,
      activeMode = mode,
      activeState = state;
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
            const continuingGateTableau =
              activeMode === 'story' &&
              modeRef.current === 'story' &&
              activeSceneKey === latest.current.state.sceneKey &&
              scenePlace(activeState, 'story') === 'gate' &&
              scenePlace(latest.current.state, 'story') === 'gate';
            if (continuingGateTableau) {
              carryCharacterContinuity(activeWorld, latest.current.world, clock);
            }
            activeWorld = latest.current.world;
            renderer.setWorld(activeWorld);
            if (activeActionKey !== latest.current.actionKey && !continuingGateTableau) clock = 0;
            activeActionKey = latest.current.actionKey;
            activeSceneKey = latest.current.state.sceneKey;
            activeMode = modeRef.current;
            activeState = latest.current.state;
          }
          if (!latest.current.paused && !latest.current.motionPaused) clock += delta;
          activeWorld.speaker = latest.current.speaker;
          updatePlayerView(
            controls.current,
            activeWorld,
            latest.current.state,
            latest.current.paused ? 0 : delta,
            enabledRef.current && modeRef.current === 'story',
          );
          try {
            const matrix = renderer.render(
              activeWorld,
              clock,
              latest.current.paused ? 0 : delta,
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
      className={settling ? `${styles.world} ${styles['world--settling']}` : styles.world}
      data-world-status={status}
      data-world-scene={state.sceneKey}
      data-world-mode={mode}
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse') return;
        if (controls.current.dragging && controls.current.pointerId === event.pointerId) {
          const dx = event.clientX - controls.current.lastPointer[0];
          const dy = event.clientY - controls.current.lastPointer[1];
          controls.current.lastPointer = [event.clientX, event.clientY];
          updateMouseLook(controls.current, dx, dy);
          return;
        }
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
      onPointerDown={(event) => {
        if (
          event.pointerType !== 'mouse' ||
          !enabledRef.current ||
          mode !== 'story' ||
          (event.target as HTMLElement).closest('button')
        )
          return;
        controls.current.dragging = true;
        controls.current.pointerId = event.pointerId;
        controls.current.lastPointer = [event.clientX, event.clientY];
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerUp={(event) => {
        if (!controls.current.dragging || controls.current.pointerId !== event.pointerId) return;
        controls.current.dragging = false;
        controls.current.pointerId = undefined;
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onLostPointerCapture={() => {
        controls.current.dragging = false;
        controls.current.pointerId = undefined;
      }}
      onPointerCancel={() => {
        controls.current.dragging = false;
        controls.current.pointerId = undefined;
      }}
    >
      <canvas
        ref={canvas}
        className={styles.canvas}
        aria-label={(state.sceneName || state.roomName) + '，实时 3D 场景'}
        role="img"
      />
      <WorldOverlay
        mode={mode}
        status={status}
        error={error}
        enabled={
          mode === 'story' && interactive && !state.paused && !state.caught && !state.overlay
        }
        hotspots={world.hotspots}
        hotspotsRef={hotspots}
        onAction={onAction}
      />
    </div>
  );
}
