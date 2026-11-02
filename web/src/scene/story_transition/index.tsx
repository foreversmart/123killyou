import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameState } from '@/shared/types/game';
import type { RoomPhase } from '@/scene/room/useRoomTransition';
import {
  CORRIDOR_TRAVEL_LISTEN_SECONDS,
  CORRIDOR_TRAVEL_REFECTORY_SECONDS,
  CORRIDOR_TRAVEL_REGISTER_SECONDS,
  CORRIDOR_TRAVEL_RETURN_SECONDS,
  HALL_TRAVEL_SECONDS,
} from '@/shared/lib/story_timing';
import { WorldView } from '@/scene/world_view';
import styles from './style.module.css';

type TravelPhase = {
  mode: 'travel' | 'hall';
  title: string;
  durationMs: number;
};

type TravelBeat = {
  id: string;
  title: string;
  kind: 'walk' | 'sleep';
  interlude?: string;
  durationMs?: number;
  interludeDurationMs?: number;
  phases?: TravelPhase[];
};

const travelBeats: Record<string, TravelBeat> = {
  mini_register: {
    id: 'arrival_walk_register',
    title: '慢速跟随陆沉进入东院',
    kind: 'walk',
    durationMs: CORRIDOR_TRAVEL_REGISTER_SECONDS * 1000,
  },
  mini_refectory: {
    id: 'register_walk_refectory',
    title: '穿过东院回廊，经过大殿，走向斋堂',
    kind: 'walk',
    interlude: 'hall',
    // The route is deliberately staged: guests leave their rooms through
    // the covered corridor, cross the main hall, then arrive at the dining
    // hall. Keeping the hall as its own phase gives the lateral tableau room
    // to read before the refectory scene appears.
    phases: [
      {
        mode: 'travel',
        title: '先穿过东院回廊',
        durationMs: CORRIDOR_TRAVEL_REFECTORY_SECONDS * 1000,
      },
      { mode: 'hall', title: '经过大殿（从右向左通行）', durationMs: HALL_TRAVEL_SECONDS * 1000 },
    ],
    durationMs: (CORRIDOR_TRAVEL_REFECTORY_SECONDS + HALL_TRAVEL_SECONDS) * 1000,
    interludeDurationMs: HALL_TRAVEL_SECONDS * 1000,
  },
  mini_corridor_candle: {
    id: 'refectory_walk_corridor',
    title: '晚膳后沿回廊返回',
    kind: 'walk',
    durationMs: CORRIDOR_TRAVEL_RETURN_SECONDS * 1000,
  },
  mini_room: {
    id: 'corridor_return_room',
    title: '二更了，各自回房',
    kind: 'walk',
    durationMs: CORRIDOR_TRAVEL_RETURN_SECONDS * 1000,
  },
  mini_listen: {
    id: 'companion_walk_listen',
    title: '沿回廊走向半掩的偏房',
    kind: 'walk',
    durationMs: CORRIDOR_TRAVEL_LISTEN_SECONDS * 1000,
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
  const [phaseIndex, setPhaseIndex] = useState(0);
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
    setPhaseIndex(0);
    setReady(false);
    setActive(next);
  }, [sceneKey, state.flags.companion_present, state.flags.debug_scene_skipped]);
  useEffect(() => {
    if (!active || !ready || state.paused) return;
    const phases = active.phases;
    const duration = phases?.[phaseIndex]?.durationMs ?? active.durationMs ?? 2200;
    const timer = window.setTimeout(() => {
      if (phases && phaseIndex < phases.length - 1) {
        setReady(false);
        setPhaseIndex((index) => index + 1);
      } else {
        setActive(null);
      }
    }, duration);
    return () => window.clearTimeout(timer);
  }, [active, phaseIndex, ready, state.paused]);

  const beat = active || (phase !== 'idle' ? travelBeats[sceneKey] : null);
  if (
    !beat ||
    state.flags.debug_scene_skipped ||
    (beat.id === 'companion_walk_listen' && !state.flags.companion_present)
  )
    return null;
  const currentPhase = beat.phases?.[phaseIndex];
  const mode =
    currentPhase?.mode ?? (beat.kind === 'sleep' ? 'story' : beat.interlude ? 'hall' : 'travel');
  const title = currentPhase?.title ?? beat.title;
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
          '--travel-duration': `${currentPhase?.durationMs ?? beat.durationMs ?? 2200}ms`,
          '--interlude-duration': `${currentPhase?.durationMs ?? beat.interludeDurationMs ?? beat.durationMs ?? 2200}ms`,
        } as CSSProperties
      }
      role="status"
      aria-live="polite"
    >
      <WorldView
        key={`${beat.id}-${phaseIndex}`}
        state={state}
        mode={mode}
        onAvailability={setReady}
      />
      <div className={styles.shade} aria-hidden="true" />
      <div className={styles.copy}>
        <strong>{title}</strong>
      </div>
    </div>
  );
}
