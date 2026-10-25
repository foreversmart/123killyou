import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameState } from '@/shared/types/game';
import type { RoomPhase } from '@/scene/room/useRoomTransition';
import { storyAssets } from '@/shared/lib/story_assets';
import { CharacterAvatar } from '@/shared/ui/character_avatar';
import styles from './style.module.css';

type TravelBeat = {
  id: string;
  title: string;
  kind: 'walk' | 'sleep';
  backdrop: string;
  interlude?: string;
  durationMs?: number;
};

const travelBeats: Record<string, TravelBeat> = {
  mini_register: {
    id: 'arrival_walk_register',
    title: '跟随陆沉进入东院',
    kind: 'walk',
    backdrop: storyAssets.scenes.eastCourtyardAfternoon,
    durationMs: 3000,
  },
  mini_refectory: {
    id: 'register_walk_refectory',
    title: '经过红竹寺大殿，走向斋堂',
    kind: 'walk',
    backdrop: storyAssets.scenes.eastCourtyardAfternoon,
    interlude: storyAssets.scenes.mainHallAfternoon,
    durationMs: 2600,
  },
  mini_corridor_candle: {
    id: 'refectory_walk_corridor',
    title: '晚膳后沿回廊返回',
    kind: 'walk',
    backdrop: storyAssets.scenes.eastCourtyardDusk,
  },
  mini_room: {
    id: 'corridor_return_room',
    title: '二更了，各自回房',
    kind: 'walk',
    backdrop: storyAssets.scenes.eastCourtyardNight,
  },
  mini_listen: {
    id: 'companion_walk_listen',
    title: '沿回廊走向半掩的偏房',
    kind: 'walk',
    backdrop: storyAssets.scenes.eastCourtyardNight,
    durationMs: 3000,
  },
  mini_wake_three_gongs: {
    id: 'room_sleep_blackout',
    title: '红烛压低，三更入梦',
    kind: 'sleep',
    backdrop: storyAssets.scenes.playerRoom,
  },
  mini_ending: {
    id: 'dawn_walk_bus',
    title: '晨光下走回大巴',
    kind: 'walk',
    backdrop: storyAssets.scenes.templeGateDawn,
  },
};

export function StoryTransition({ state, phase }: { state: GameState; phase: RoomPhase }) {
  const sceneKey = state.sceneKey || '';
  const previousScene = useRef<string | null>(null);
  const [active, setActive] = useState<TravelBeat | null>(null);
  useEffect(() => {
    const previous = previousScene.current;
    previousScene.current = sceneKey;
    if (!previous || previous === sceneKey || state.flags.debug_scene_skipped) return;
    const next = travelBeats[sceneKey];
    if (!next || (sceneKey === 'mini_listen' && !state.flags.companion_present)) {
      setActive(null);
      return;
    }
    setActive(next);
    const timer = window.setTimeout(() => setActive(null), next.durationMs ?? 2200);
    return () => window.clearTimeout(timer);
  }, [sceneKey, state.flags.companion_present, state.flags.debug_scene_skipped]);

  const beat = active || (phase !== 'idle' ? travelBeats[sceneKey] : null);
  if (!beat || state.flags.debug_scene_skipped) return null;
  const showWalkers = beat.id === 'companion_walk_listen' && state.flags.companion_present;
  const walkers = showWalkers
    ? (state.actors || []).filter(
        (actor) =>
          actor.visible &&
          (actor.id === 'player' || ['linlan', 'zhouyan', 'xuzhi'].includes(actor.id)),
      )
    : [];
  return (
    <div
      key={beat.id}
      className={styles.transition}
      data-transition={beat.id}
      data-kind={beat.kind}
      style={{ '--travel-duration': `${beat.durationMs ?? 2200}ms` } as CSSProperties}
      role="status"
      aria-live="polite"
    >
      <img className={styles.backdrop} src={beat.backdrop} alt="" aria-hidden="true" />
      {beat.interlude && (
        <img
          className={styles.interludeBackdrop}
          src={beat.interlude}
          alt="红竹寺大殿"
          aria-hidden="true"
        />
      )}
      {showWalkers && (
        <div className={styles.walkers} aria-hidden="true">
          {walkers.map((actor, index) => (
            <div
              className={styles.walker}
              data-walker={actor.id}
              key={actor.id}
              style={{ '--walker-delay': `${index * -0.22}s` } as CSSProperties}
            >
              <CharacterAvatar id={actor.id} name={actor.name} />
            </div>
          ))}
        </div>
      )}
      <div className={styles.shade} aria-hidden="true" />
      <div className={styles.copy}>
        <strong>{beat.title}</strong>
      </div>
    </div>
  );
}
