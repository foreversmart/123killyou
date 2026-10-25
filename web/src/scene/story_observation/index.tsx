import type { GameState } from '@/shared/types/game';
import { storyAssets } from '@/shared/lib/story_assets';
import { DoorDetail, CandleDetail, ShadowDetail } from './detail_art';
import { DragMarkDetail, BowlTagDetail } from './evidence_art';
import { OracleCups } from './oracle_cups';
import styles from './style.module.css';

const props = storyAssets.props;
const closeups: Record<string, { title: string; asset: string }> = {
  arrival_cat: { title: '石阶旁', asset: props.catResting },
  listen_cat: { title: '廊下猫食碟', asset: props.catDish },
  oracle_cat: { title: '桌边猫食碟', asset: props.catDish },
  listen_bird: { title: '梁下鸟笼', asset: props.birdcage },
  oracle_bird: { title: '梁下鸟笼', asset: props.birdcage },
  room_beads: { title: '掌心念珠', asset: storyAssets.items.beads },
  room_key: { title: '旧铜钥匙', asset: '/art/story/props/copper_key/inventory.webp' },
  room_oil_lamp: { title: '矮桌油灯', asset: props.oilLampUnlit },
  register_camera_bell: { title: '听房门边', asset: props.cameraCap },
  register_ribbon: { title: '纸房房牌后', asset: props.blueTieNotice },
  listen_vase: { title: '脚边碎瓷', asset: props.vaseBroken },
};

export function StoryObservation({ state }: { state: GameState }) {
  const shot = state.shotKey || '';
  const closeup = closeups[shot];
  const latch = ['room_latch', 'wake_door', 'four_peephole'].includes(shot);
  const candle = [
    'room_candle',
    'room_candle_detail',
    'wake_candle',
    'wake_candle_detail',
  ].includes(shot);
  const shadow = ['double_enter', 'double_candle', 'double_exit'].includes(shot);
  const drag = shot === 'register_drag_mark';
  const bowlTags = shot === 'refectory_porridge' && Boolean(state.flags.bowl_tags_seen);
  const cups = ['oracle_cast', 'oracle_stone', 'oracle_rescue'].includes(shot);
  if (!closeup && !latch && !candle && !shadow && !drag && !bowlTags && !cups) return null;
  return (
    <figure className={styles.closeup} data-observation={shot} key={shot}>
      <figcaption>
        {closeup?.title ||
          (cups
            ? '地砖上的杯面'
            : latch
              ? '门内侧'
              : candle
                ? '烛台前'
                : drag
                  ? '灯房门边'
                  : bowlTags
                    ? '施食记与碗签'
                    : '烛光边缘')}
      </figcaption>
      {cups ? (
        <OracleCups flags={state.flags} falling={shot === 'oracle_cast'} />
      ) : drag ? (
        <DragMarkDetail drawing={/图/.test(state.lastHeard)} />
      ) : bowlTags ? (
        <BowlTagDetail />
      ) : closeup ? (
        <img src={closeup.asset} alt={closeup.title} />
      ) : latch ? (
        <DoorDetail wet={shot === 'wake_door'} peephole={shot === 'four_peephole'} />
      ) : candle ? (
        <CandleDetail lit={Boolean(state.flags.red_candle_lit)} />
      ) : (
        <ShadowDetail seam={shot === 'double_exit'} />
      )}
      {shot.endsWith('_bird') && <img className={styles.bird} src={props.sparrow} alt="笼中麻雀" />}
      {shot === 'register_camera_bell' && (
        <img className={styles.bell} src={props.bell} alt="相机盖旁的铜铃" />
      )}
    </figure>
  );
}
