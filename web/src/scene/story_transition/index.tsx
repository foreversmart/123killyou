import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameState } from '@/shared/types/game';
import type { RoomPhase } from '@/scene/room/useRoomTransition';
import { storyAssets } from '@/shared/lib/story_assets';
import styles from './style.module.css';
import { travelParty } from './party';

type TravelBeat = {
  id: string;
  title: string;
  detail: string;
  landmark: string;
  kind: 'walk' | 'sleep';
  backdrop: string;
  durationMs?: number;
};

const travelBeats: Record<string, TravelBeat> = {
  mini_register: {
    id: 'arrival_walk_register',
    title: '跟随陆沉进入东院',
    detail: '守夜人提灯走在前面，三位同伴带着行李跟上。',
    landmark: '山门石阶 · 铜铃 · 晒太阳的花猫',
    kind: 'walk',
    backdrop: storyAssets.scenes.eastCourtyardAfternoon,
    durationMs: 3000,
  },
  mini_refectory: {
    id: 'register_walk_refectory',
    title: '穿过长廊去斋堂',
    detail: '檐灯一盏盏亮起，脚步声沿着旧拖痕传向饭堂。',
    landmark: '东院回廊 · 封闭钟楼门 · 夕阳格窗',
    kind: 'walk',
    backdrop: storyAssets.scenes.eastCourtyardAfternoon,
  },
  mini_corridor_candle: {
    id: 'refectory_walk_corridor',
    title: '晚膳后沿回廊返回',
    detail: '陆沉收起斋碗，抱着烛盒走在前方，大家回到东院再逐人领取红烛。',
    landmark: '斋堂后门 · 檐灯 · 四间偏房',
    kind: 'walk',
    backdrop: storyAssets.scenes.eastCourtyardDusk,
  },
  mini_room: {
    id: 'corridor_return_room',
    title: '二更了，各自回房',
    detail: '陆沉停在回廊中央，四个人在各自的房门前散开。',
    landmark: '听 · 灯 · 纸 · 门',
    kind: 'walk',
    backdrop: storyAssets.scenes.eastCourtyardNight,
  },
  mini_wake_three_gongs: {
    id: 'room_sleep_blackout',
    title: '红烛压低，三更入梦',
    detail: '更锣从远处传来，寺史册和经文沉入烛影，门外没有人影。',
    landmark: '烛芯 · 寺史册 · 清心静神经',
    kind: 'sleep',
    backdrop: storyAssets.scenes.playerRoom,
  },
  mini_ending: {
    id: 'dawn_walk_bus',
    title: '晨光下走回大巴',
    detail: '三位同伴提起行李，陆沉在门内收回通行凭，花猫停在旧匾下目送。',
    landmark: '东院石阶 · 明照寺旧匾 · 晨雾公路',
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
    if (!next) return;
    setActive(next);
    const timer = window.setTimeout(() => setActive(null), next.durationMs ?? 2200);
    return () => window.clearTimeout(timer);
  }, [sceneKey, state.flags.debug_scene_skipped]);

  const beat = active || (phase !== 'idle' ? travelBeats[sceneKey] : null);
  if (!beat || state.flags.debug_scene_skipped) return null;
  return (
    <div className={styles.transition} data-transition={beat.id} role="status" aria-live="polite">
      <img
        className={styles.backdrop}
        src={beat.backdrop}
        alt=""
        aria-hidden="true"
        style={
          {
            position: 'absolute',
            zIndex: 0,
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: 0.3,
            filter: 'saturate(0.7) brightness(0.68)',
            '--travel-duration': `${(beat.durationMs ?? 2200) / 1000}s`,
          } as CSSProperties
        }
      />
      <div className={styles.sky} aria-hidden="true" />
      {beat.kind === 'sleep' ? (
        <div className={styles.sleepScene} aria-hidden="true">
          <span className={styles.candleFlame} />
          <img className={styles.sleepBook} src={storyAssets.props.historyClosed} alt="寺史册" />
          <img
            className={styles.sleepBook}
            src={storyAssets.props.scriptureClosed}
            alt="清心静神经"
          />
          <i className={styles.gongRing} />
        </div>
      ) : (
        <>
          <div className={styles.landmark} aria-hidden="true">
            <span className={styles.roof} />
            <span className={styles.lantern} />
            <img className={styles.cat} src={storyAssets.props.catResting} alt="" />
          </div>
          <div className={styles.path} aria-hidden="true" />
          <div className={styles.walkers} aria-hidden="true">
            {travelParty(sceneKey).map((person, index) => (
              <div
                key={person.id}
                className={styles.traveler}
                data-traveler={person.id}
                data-waiting={person.waiting}
                style={
                  {
                    left: `${person.x}%`,
                    top: `${person.y}%`,
                    height: `${person.height}%`,
                    zIndex: Math.round(person.y),
                    '--delay': `${index * -0.13}s`,
                    '--facing': person.facing === 'left' ? -1 : 1,
                  } as CSSProperties
                }
              >
                <img
                  className={styles.walker}
                  src={
                    person.id === 'luchen'
                      ? storyAssets.characterPoses.luchen.lantern
                      : storyAssets.characters[person.id]
                  }
                  alt={person.name}
                />
              </div>
            ))}
          </div>
        </>
      )}
      <div className={styles.copy}>
        <strong>{beat.title}</strong>
        <span>{beat.detail}</span>
        <small>{beat.landmark}</small>
      </div>
    </div>
  );
}
