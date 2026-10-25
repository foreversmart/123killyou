import type { CSSProperties } from 'react';
import type { StageProp } from '@/scene/story_stage/types';
import { PropArt } from './art';
import { FoodArt } from './food_art';
import type { GameState } from '@/shared/types/game';
import { storyAssets } from '@/shared/lib/story_assets';
import styles from './style.module.css';

export function SceneProp({
  prop,
  enabled,
  lit,
  onAction,
  state,
}: {
  prop: StageProp;
  enabled: boolean;
  lit: boolean;
  onAction: (command: string) => Promise<void>;
  state?: GameState;
}) {
  const asset = state ? getPropAsset(prop.id, state, lit) : undefined;
  const graphic =
    prop.draw === false ? null : ['bread', 'pickles', 'local_vegetables'].includes(prop.id) ? (
      <FoodArt id={prop.id} />
    ) : asset ? (
      <img className={styles.assetProp} src={asset} alt="" />
    ) : (
      <PropArt kind={prop.kind} name={prop.name} lit={lit} />
    );
  const style = {
    left: `${prop.x}%`,
    top: `${prop.y}%`,
    width: `${prop.width || 7}%`,
    '--rotate': `${prop.rotate || 0}deg`,
  } as CSSProperties;
  if (!prop.command)
    return (
      <div className={styles.prop} style={style} role="img" aria-label={prop.name}>
        {graphic}
      </div>
    );
  return (
    <button
      className={`${styles.prop} ${prop.draw === false ? styles['prop--hotspot'] : ''}`}
      data-interactive="true"
      data-prop={prop.id}
      style={style}
      disabled={!enabled}
      aria-label={`观察${prop.name}`}
      onClick={() => void onAction(prop.command!)}
    >
      {graphic}
      <i className={styles.glimmer} aria-hidden="true" />
      <span className={styles.name}>{prop.name}</span>
    </button>
  );
}

function getPropAsset(id: string, state: GameState, lit: boolean): string | undefined {
  const props = storyAssets.props;
  if (id === 'player_bowl')
    return state.flags.meal_player_ate ? props.porridgeEmpty : props.porridgeFull;
  if (id === 'linlan_bowl')
    return state.flags.meal_linlan_ate ? props.porridgeEmpty : props.porridgeFull;
  if (id === 'zhouyan_bowl')
    return state.shotKey === 'refectory_porridge'
      ? props.porridgeInspect
      : state.flags.meal_zhouyan_ate
        ? props.porridgeEmpty
        : props.porridgeFull;
  if (id === 'xuzhi_bowl')
    return state.flags.meal_xuzhi_ate ? props.porridgeEmpty : props.porridgeFull;
  if (id === 'spoon') return props.porridgeSpoon;
  if (id === 'candle') {
    if (state.sceneKey === 'mini_wake_three_gongs') return props.candleExtinguished;
    if (state.sceneKey === 'mini_dawn_trap') return props.candleShort;
    return lit ? props.candleBurning : props.candleUnlit;
  }
  if (id === 'matches') return props.matches;
  if (id === 'beads') return props.prayerBeads;
  if (id === 'map') return props.repairDrawing;
  if (id === 'notice') return props.blueTieNotice;
  if (id === 'offering') return props.tornPage;
  if (id === 'seal') return props.permit;
  if (id === 'history') return props.historyClosed;
  if (id === 'scripture') return props.scriptureClosed;
  if (id === 'page') return props.tornPage;
  if (id === 'lamp') return props.oilLampUnlit;
  if (id === 'keeper_lamp' || id === 'curtain_lamp') return props.oilLampUnlit;
  if (id === 'torch') return props.flashlight;
  // The tower and room plaque are painted into the authored background plates.
  // Keep their hotspots for dialogue actions without stacking a generic SVG sign.
  if (id === 'tower' || id === 'plaque') return undefined;
  if (id === 'latch') {
    if (state.sceneKey === 'mini_death') return props.doorBulging;
    if (state.shotKey === 'double_exit') return props.doorOpen;
  }
  if (id === 'vase') return state.flags.vase_broken ? props.vaseBroken : props.vaseIntact;
  if (id === 'bird') return props.birdcage;
  if (id === 'cat') return props.catDish;
  if (id === 'bell') return props.bell;
  if (id === 'cups') {
    if (state.flags.cup_failed) return props.jiaobeiCurved;
    if (state.flags.cup_jiao_rescue) return props.jiaobeiFlat;
    return props.jiaobeiSealed;
  }
  if (id === 'bags') return props.travelBags;
  if (id === 'camera') return props.cameraCap;
  if (id === 'water') return props.hotWater;
  if (id === 'bamboo') return props.bambooShoots;
  if (id === 'ribbon') return props.blueTieNotice;
  return undefined;
}
