import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '@/shared/types/game';
import { createWorld } from '@/scene/world/create_world';
import { visualKey } from '@/scene/world/visual_key';
import { continuityKey } from '@/scene/world/continuity_key';
import { isSleepInterlude } from '@/scene/world/sleep';
import type { World, WorldMode, V3 } from '@/scene/world/types';
import { TempleRenderer } from '@/scene/renderer/engine';
import { project } from '@/scene/renderer/frame';
import styles from '@/scene/world_view/style.module.css';
import { WorldOverlay } from '@/scene/world_view/world_overlay';
import { carryCharacterContinuity } from '@/scene/world_view/continuity';
import { carryPropContinuity } from '@/scene/world_view/prop_continuity';
import {
  createPlayerControls,
  carryPlayerView,
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
  onElapsed?: (seconds: number) => void;
};
export function WorldView({
  state,
  speaker = '',
  mode = 'story',
  interactive = false,
  motionPaused = false,
  onAction,
  onAvailability,
  onElapsed,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const hotspots = useRef<HTMLDivElement>(null);
  const engine = useRef<TempleRenderer | null>(null);
  const controls = useRef<PlayerControls>(createPlayerControls());
  const sceneKey = visualKey(state, mode);
  const placeKey = continuityKey(state, mode);
  const previousWorld = useRef<{ world: World; placeKey: string } | undefined>(undefined);
  const world = useMemo(() => {
    const previous = previousWorld.current;
    const next = createWorld(
      { state, mode },
      previous?.placeKey === placeKey ? previous.world : undefined,
    );
    previousWorld.current = { world: next, placeKey };
    return next;
  }, [sceneKey]);
  const latest = useRef({
    world,
    placeKey,
    speaker,
    state,
    paused: state.paused,
    motionPaused,
    onAvailability,
    onElapsed,
  });
  latest.current = {
    world,
    placeKey,
    speaker,
    state,
    paused: state.paused,
    motionPaused,
    onAvailability,
    onElapsed,
  };
  const aim = useRef<V3>([0, 0, 0]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const enabled =
    interactive &&
    status === 'ready' &&
    !state.paused &&
    !state.caught &&
    !state.overlay &&
    !isSleepInterlude(state);
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
    let disposed = false,
      failed = false,
      frame = 0,
      activeWorld = world,
      activePlaceKey = placeKey;
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
          try {
            if (activeWorld !== latest.current.world) {
              const next = latest.current.world;
              if (activePlaceKey === latest.current.placeKey) {
                carryCharacterContinuity(activeWorld, next, clock);
                carryPropContinuity(activeWorld, next, clock);
                carryPlayerView(controls.current, activeWorld, next);
              } else clock = 0;
              renderer.setWorld(next);
              activeWorld = next;
              activePlaceKey = latest.current.placeKey;
            }
            const motionDelta = latest.current.paused || latest.current.motionPaused ? 0 : delta;
            clock += motionDelta;
            activeWorld.speaker = latest.current.speaker;
            updatePlayerView(
              controls.current,
              activeWorld,
              latest.current.state,
              motionDelta,
              enabledRef.current && modeRef.current === 'story',
            );
            const matrix = renderer.render(
              activeWorld,
              clock,
              motionDelta,
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
            latest.current.onElapsed?.(clock);
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
          mode === 'story' &&
          interactive &&
          !state.paused &&
          !state.caught &&
          !state.overlay &&
          !isSleepInterlude(state)
        }
        hotspots={world.hotspots}
        hotspotsRef={hotspots}
        onAction={onAction}
      />
    </div>
  );
}
