import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameState } from '@/shared/types/game';
import type { RoomPhase } from '@/scene/room/useRoomTransition';
import {
  BOARDING_TRAVEL_SECONDS,
  CORRIDOR_TRAVEL_LISTEN_SECONDS,
  CORRIDOR_TRAVEL_REFECTORY_SECONDS,
  CORRIDOR_TRAVEL_REGISTER_SECONDS,
  CORRIDOR_TRAVEL_RETURN_SECONDS,
  HALL_TRAVEL_SECONDS,
  ROOM_SLEEP_ACTION_SECONDS,
  ROOM_SLEEP_WAIT_SECONDS,
} from '@/shared/lib/story_timing';
import { WorldView } from '@/scene/world_view';
import { useTravelClock } from '@/scene/story_transition/useTravelClock';
import styles from './style.module.css';

type TravelPhase = {
  mode: 'travel' | 'hall';
  title: string;
  durationMs: number;
};

type TravelBeat = {
  id: string;
  title: string;
  kind: 'walk';
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
    title: '与同伴走到半掩的房门前',
    kind: 'walk',
    durationMs: CORRIDOR_TRAVEL_LISTEN_SECONDS * 1000,
  },
  mini_ending: {
    id: 'dawn_walk_bus',
    title: '一起走到大巴旁，依次上车',
    kind: 'walk',
    durationMs: BOARDING_TRAVEL_SECONDS * 1000,
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
  const sleeping = sceneKey === 'mini_wake_three_gongs' && state.shotKey === 'room_sleep_wait';
  const previousScene = useRef<string | null>(null);
  const [active, setActive] = useState<TravelBeat | null>(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Include the first render of a scene change in the active window. The
    // pending beat is painted before the scene-tracking effect promotes it to
    // `active`; reporting false here would let auto-play submit the next
    // command while the travel overlay is still starting.
    const pending =
      previousScene.current !== null && previousScene.current !== sceneKey
        ? travelBeats[sceneKey]
        : null;
    const beat = active || pending;
    const suppressed =
      state.flags.debug_scene_skipped ||
      (beat?.id === 'companion_walk_listen' && !state.flags.companion_present);
    onActive?.(Boolean(beat && !suppressed && !sleeping));
    return () => onActive?.(false);
  }, [
    active,
    onActive,
    sceneKey,
    sleeping,
    state.flags.companion_present,
    state.flags.debug_scene_skipped,
  ]);
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
  // Scene state and effects are committed in separate render phases. Without
  // staging the changed scene here, the destination scene (the refectory) can
  // paint for one frame before the effect below installs its travel beat. That
  // makes the route look like “arrive, then flash back to the hall”. Keep the
  // first frame of a scene change on the travel overlay and let the effect
  // promote it to `active` after the commit.
  const sceneChanged = previousScene.current !== null && previousScene.current !== sceneKey;
  const pending = sceneChanged ? travelBeats[sceneKey] : null;
  const beat = pending || active || (phase !== 'idle' ? travelBeats[sceneKey] : null);
  const renderPhaseIndex = pending ? 0 : phaseIndex;
  const renderReady = pending ? false : ready;
  const currentPhase = beat?.phases?.[renderPhaseIndex];
  const finalPhase = !beat?.phases || renderPhaseIndex === beat.phases.length - 1;
  const durationMs = currentPhase?.durationMs ?? beat?.durationMs ?? 2200;
  const phaseKey = `${sceneKey}:${beat?.id || ''}:${renderPhaseIndex}`;
  const { overlay, onElapsed } = useTravelClock({
    phaseKey,
    durationMs,
    ready: renderReady,
    paused: state.paused,
    onComplete: () => {
      if (finalPhase) setActive(null);
      else {
        setReady(false);
        setPhaseIndex((index) => index + 1);
      }
    },
  });
  // Keep the room's existing renderer and animation clock visible while the
  // player walks to bed. Only the final quiet tail fades to black; treating
  // sleep as travel created another WorldView and hid the action too early.
  if (sleeping) {
    const darkenAt = Math.round((ROOM_SLEEP_ACTION_SECONDS + 0.2) * 1000);
    return (
      <div
        className={styles.sleep_blackout}
        data-transition="room_sleep_blackout"
        data-paused={state.paused}
        style={
          {
            '--sleep-darken-delay': `${darkenAt}ms`,
            '--sleep-darken-duration': `${ROOM_SLEEP_WAIT_SECONDS * 1000 - darkenAt}ms`,
          } as CSSProperties
        }
        aria-hidden="true"
      />
    );
  }
  if (
    !beat ||
    state.flags.debug_scene_skipped ||
    (beat.id === 'companion_walk_listen' && !state.flags.companion_present)
  )
    return null;
  const mode = currentPhase?.mode ?? (beat.interlude ? 'hall' : 'travel');
  const title = currentPhase?.title ?? beat.title;
  return (
    <div
      key={phaseKey}
      ref={overlay}
      className={styles.transition}
      data-transition={beat.id}
      data-kind={beat.kind}
      data-ready={renderReady}
      data-final-phase={finalPhase}
      data-paused={state.paused}
      data-interlude-pan={beat.interlude ? 'horizontal' : undefined}
      style={
        {
          '--travel-duration': `${durationMs}ms`,
          '--travel-elapsed': '0ms',
          '--interlude-duration': `${currentPhase?.durationMs ?? beat.interludeDurationMs ?? beat.durationMs ?? 2200}ms`,
        } as CSSProperties
      }
      role="status"
      aria-live="polite"
    >
      <WorldView
        key={`${beat.id}-${renderPhaseIndex}`}
        state={state}
        mode={mode}
        onAvailability={setReady}
        onElapsed={onElapsed}
      />
      <div className={styles.shade} aria-hidden="true" />
      <div className={styles.copy}>
        <strong>{title}</strong>
      </div>
    </div>
  );
}
