import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameState } from '@/shared/types/game';
import type { RoomPhase } from '@/scene/room/useRoomTransition';
import { WorldView } from '@/scene/world_view';
import styles from './style.module.css';

type TravelBeat = {
  id: string;
  title: string;
  kind: 'walk' | 'sleep';
  interlude?: string;
  durationMs?: number;
  interludeDurationMs?: number;
};

const travelBeats: Record<string, TravelBeat> = {
  mini_register: {
    id: 'arrival_walk_register',
    title: '跟随陆沉进入东院',
    kind: 'walk',
    durationMs: 3000,
  },
  mini_refectory: {
    id: 'register_walk_refectory',
    title: '经过红竹寺大殿，走向斋堂',
    kind: 'walk',
    interlude: 'hall',
    durationMs: 7000,
    interludeDurationMs: 7000,
  },
  mini_corridor_candle: {
    id: 'refectory_walk_corridor',
    title: '晚膳后沿回廊返回',
    kind: 'walk',
    durationMs: 4000,
  },
  mini_room: {
    id: 'corridor_return_room',
    title: '二更了，各自回房',
    kind: 'walk',
  },
  mini_listen: {
    id: 'companion_walk_listen',
    title: '沿回廊走向半掩的偏房',
    kind: 'walk',
    durationMs: 3000,
  },
  mini_wake_three_gongs: {
    id: 'room_sleep_blackout',
    title: '红烛压低，三更入梦',
    kind: 'sleep',
  },
  mini_ending: {
    id: 'dawn_walk_bus',
    title: '晨光下走回大巴',
    kind: 'walk',
  },
};

export function StoryTransition({
  state,
  phase,
  onActive,
}: {
  state: GameState;
  phase: RoomPhase;
  onActive?: (active: boolean) => void;
}) {
  const sceneKey = state.sceneKey || '';
  const previousScene = useRef<string | null>(null);
  const [active, setActive] = useState<TravelBeat | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    onActive?.(Boolean(active));
    return () => onActive?.(false);
  }, [active, onActive]);
  useEffect(() => {
    const previous = previousScene.current;
    previousScene.current = sceneKey;
    if (state.flags.debug_scene_skipped) {
      setActive(null);
      return;
    }
    if (!previous || previous === sceneKey) return;
    const next = travelBeats[sceneKey];
    if (!next || (sceneKey === 'mini_listen' && !state.flags.companion_present)) {
      setActive(null);
      return;
    }
    setReady(false);
    setActive(next);
  }, [sceneKey, state.flags.companion_present, state.flags.debug_scene_skipped]);
  useEffect(() => {
    if (!active || !ready || state.paused) return;
    const timer = window.setTimeout(() => setActive(null), active.durationMs ?? 2200);
    return () => window.clearTimeout(timer);
  }, [active, ready, state.paused]);

  const beat = active || (phase !== 'idle' ? travelBeats[sceneKey] : null);
  if (
    !beat ||
    state.flags.debug_scene_skipped ||
    (beat.id === 'companion_walk_listen' && !state.flags.companion_present)
  )
    return null;
  return (
    <div
      key={beat.id}
      className={styles.transition}
      data-transition={beat.id}
      data-kind={beat.kind}
      data-ready={ready}
      data-paused={state.paused}
      data-interlude-pan={beat.interlude ? 'horizontal' : undefined}
      style={
        {
          '--travel-duration': `${beat.durationMs ?? 2200}ms`,
          '--interlude-duration': `${beat.interludeDurationMs ?? beat.durationMs ?? 2200}ms`,
        } as CSSProperties
      }
      role="status"
      aria-live="polite"
    >
      <WorldView
        key={beat.id}
        state={state}
        mode={beat.kind === 'sleep' ? 'story' : beat.interlude ? 'hall' : 'travel'}
        onAvailability={setReady}
      />
      <div className={styles.shade} aria-hidden="true" />
      <div className={styles.copy}>
        <strong>{beat.title}</strong>
      </div>
    </div>
  );
}
