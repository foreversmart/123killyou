import type { CSSProperties } from 'react';
import type { GameState, SceneActor } from '@/shared/types/game';
import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';
import visual from './visual.module.css';
import { ArrivalInteraction } from '@/scene/arrival';

type StoryAction = { label: string; command: string; quiet?: boolean };
type Actor = SceneActor & { side: 'left' | 'center' | 'right'; tone: string };
type FallbackActor = {
  name: string;
  role: string;
  side: 'left' | 'center' | 'right';
  tone: string;
};

const actorsByScene: Record<string, FallbackActor[]> = {
  mini_register: [
    { name: '陆沉', role: '登记桌后', side: 'center', tone: 'keeper' },
    { name: '林岚', role: '听房', side: 'left', tone: 'guest' },
    { name: '周砚', role: '偏房拖痕', side: 'right', tone: 'guest' },
    { name: '许栀', role: '入住须知', side: 'left', tone: 'guest' },
  ],
  mini_refectory: [
    { name: '陆沉', role: '斋堂桌边', side: 'right', tone: 'keeper' },
    { name: '慧普', role: '帘后长明灯', side: 'right', tone: 'host' },
    { name: '林岚·周砚·许栀', role: '同桌三人', side: 'left', tone: 'guest' },
  ],
  mini_corridor_candle: [
    { name: '陆沉', role: '逐门发烛', side: 'center', tone: 'keeper' },
    { name: '四位游客', role: '东院回廊', side: 'left', tone: 'guest' },
  ],
  mini_room: [{ name: '你', role: '门房·矮桌前', side: 'center', tone: 'player' }],
  mini_wake_three_gongs: [{ name: '你', role: '床上惊醒', side: 'center', tone: 'player' }],
  mini_four_knocks: [{ name: '你', role: '门闩后', side: 'center', tone: 'player' }],
  mini_three_knocks: [
    { name: '你', role: '门闩后', side: 'center', tone: 'player' },
    { name: '同行人', role: '门外三敲', side: 'right', tone: 'double' },
  ],
  mini_listen: [
    { name: '慧普', role: '偏房内·背皮空洞', side: 'right', tone: 'host' },
    { name: '同行人', role: '你身后', side: 'left', tone: 'guest' },
    { name: '你', role: '花瓶旁', side: 'center', tone: 'player' },
  ],
  mini_oracle: [{ name: '神公', role: '偏殿杯筊桌', side: 'center', tone: 'oracle' }],
  mini_double: [
    { name: '你', role: '红烛旁', side: 'left', tone: 'player' },
    { name: '换皮同行人', role: '床脚·影子不全', side: 'right', tone: 'double' },
  ],
  mini_dawn_trap: [{ name: '你', role: '门闩后', side: 'center', tone: 'player' }],
  mini_dawn: [
    { name: '四位游客', role: '山门与行李', side: 'left', tone: 'guest' },
    { name: '陆沉', role: '目送大巴', side: 'right', tone: 'keeper' },
  ],
};

function visualActors(state: GameState, key: string): Actor[] {
  const saved = state.actors?.filter((actor) => actor.visible);
  if (saved && saved.length > 0) {
    return saved.map((actor) => ({
      ...actor,
      side:
        actor.position.includes('左') || actor.position.includes('旁')
          ? 'left'
          : actor.position.includes('右')
            ? 'right'
            : 'center',
      tone:
        actor.id === 'player'
          ? 'player'
          : actor.id === 'luchen'
            ? 'keeper'
            : actor.id === 'huipu'
              ? 'host'
              : actor.id.includes('double') || actor.id === 'unknown'
                ? 'double'
                : 'guest',
    }));
  }
  return (actorsByScene[key] || []).map((actor, index) => ({
    id: `fallback-${index}`,
    name: actor.name,
    role: actor.role,
    position: actor.role,
    portrait: '',
    status: '',
    visible: true,
    side: actor.side,
    tone: actor.tone,
  }));
}

const propCommands: Record<string, string> = {
  山门铜铃: '看铜铃',
  晒太阳的花猫: '看看花猫',
  明照寺旧匾: '看看山门',
  灯影寺山门: '看看山门',
  登记簿: '看登记簿',
  残页: '查看残页',
  房牌: '看房牌',
  四把房牌: '看房牌',
  四碗肉粥: '查看粥碗',
  四只带碗签的粥碗: '查看粥碗',
  木勺: '查看粥碗',
  施食记残页: '查看粥碗',
  红烛: '点燃红烛',
  寺史册: '查看寺庙历史',
  游客版寺史册: '查看寺庙历史',
  清心静神经: '阅读清心静神经',
  门眼: '听门外的声音',
  碎花瓶: '检查花瓶碎片',
  猫食碟: '检查猫食碟',
  鸟笼: '检查鸟笼',
  杯筊: '查看杯筊规矩',
};

function commandForProp(sceneKey: string, prop: string) {
  if (sceneKey === 'mini_corridor_candle' && prop === '红烛') return '拿红烛';
  if (sceneKey === 'mini_wake_three_gongs' && prop === '熄灭的红烛') return '续燃红烛';
  if (sceneKey === 'mini_four_knocks' && prop === '门闩') return '检查门缝红蜡';
  return propCommands[prop] || '';
}

const discoverableProps = new Set([
  '山门铜铃',
  '晒太阳的花猫',
  '明照寺旧匾',
  '登记簿',
  '残页',
  '四碗肉粥',
  '红烛',
  '熄灭的红烛',
  '寺史册',
  '游客版寺史册',
  '清心静神经',
  '门闩',
  '碎花瓶',
  '猫食碟',
  '鸟笼',
  '杯筊',
]);

const actionsByScene: Record<string, StoryAction[]> = {
  mini_register: [
    { label: '去斋堂', command: '去斋堂吃晚膳' },
    { label: '查看残页', command: '查看残页', quiet: true },
  ],
  mini_refectory: [
    { label: '我不吃肉粥', command: '我拒绝吃肉粥' },
    { label: '劝大家不吃', command: '劝大家不要吃粥', quiet: true },
    { label: '查看碗里', command: '查看粥碗', quiet: true },
  ],
  mini_corridor_candle: [
    { label: '拿红烛', command: '拿红烛' },
    { label: '听回廊对白', command: '继续听回廊对白', quiet: true },
    { label: '回自己的房间', command: '回自己的房间', quiet: true },
  ],
  mini_room: [
    { label: '点燃红烛', command: '点燃红烛' },
    { label: '查看寺庙历史', command: '查看寺庙历史', quiet: true },
    { label: '阅读清心静神经', command: '阅读清心静神经', quiet: true },
    { label: '睡下', command: '睡下', quiet: true },
  ],
  mini_wake_three_gongs: [
    { label: '续燃红烛', command: '续燃红烛' },
    { label: '听门外', command: '听门外的声音', quiet: true },
    { label: '不点红烛', command: '不续燃红烛', quiet: true },
  ],
  mini_four_knocks: [
    { label: '不开门，问是谁', command: '不开门并问是谁' },
    { label: '检查门缝', command: '检查门缝红蜡', quiet: true },
    { label: '打开门', command: '开门', quiet: true },
  ],
  mini_three_knocks: [
    { label: '跟同伴去偷听', command: '跟同伴去偷听住持' },
    { label: '留在房间', command: '留在房间观察', quiet: true },
  ],
  mini_listen: [
    { label: '模仿猫叫', command: '模仿猫叫' },
    { label: '模仿鸟叫', command: '模仿鸟叫' },
    { label: '跑回自己的房间', command: '跑回自己的房间并关门', quiet: true },
    { label: '跑向大殿找神公', command: '跑向大殿找神公', quiet: true },
  ],
  mini_oracle: [
    { label: '求神公带我回房', command: '求神公救我回房' },
    { label: '查看杯筊规矩', command: '查看杯筊规矩', quiet: true },
  ],
  mini_double: [
    { label: '坚持点烛', command: '我不吹灭红烛' },
    { label: '朗读清心静神经', command: '朗读清心静神经', quiet: true },
    { label: '关门不跟出去', command: '关上房门不跟出去', quiet: true },
  ],
  mini_dawn_trap: [
    { label: '不开门，等真正五更', command: '不开门等待真正的五更' },
    { label: '重听钟声', command: '重听五更和钟声', quiet: true },
    { label: '把钟声算作第六声', command: '把钟声算作第六声', quiet: true },
    { label: '打开门', command: '开门', quiet: true },
  ],
  mini_dawn: [
    { label: '听天亮对白', command: '听天亮对白', quiet: true },
    { label: '坐大巴回家', command: '坐大巴回家' },
    { label: '询问住持去向', command: '询问住持去了哪里', quiet: true },
  ],
};

export function StoryScene({
  state,
  onAction,
  interactive = true,
}: {
  state: GameState;
  onAction: (command: string) => Promise<void>;
  interactive?: boolean;
}) {
  if (!state.storyMode && !state.sceneKey) return null;
  const key = state.sceneKey || 'mini_arrival';
  if (key === 'mini_arrival') {
    return <ArrivalInteraction state={state} onAction={onAction} interactive={interactive} />;
  }
  const actions = actionsByScene[key] || [];
  const actors = visualActors(state, key);
  return (
    <div className={styles['story-scene']} aria-label={state.sceneName || '剧情场景'}>
      <div className={styles['scene-header']}>
        <div>
          <span className={styles['scene-index']}>{key.replace('mini_', 'SCENE ')}</span>
          <h2>{state.sceneName || state.roomName}</h2>
        </div>
        <span className={styles['scene-mark']}>第一夜</span>
      </div>
      {state.sceneText && <p className={styles['scene-text']}>{state.sceneText}</p>}
      <div className={visual['scene-visual']} aria-label="人物位置与现场关系">
        <div className={visual['visual-ground']} />
        {actors.map((actor, index) => (
          <span
            className={cx(visual['actor-marker'], visual[`actor-marker--${actor.side}`])}
            data-tone={actor.tone}
            style={{ '--actor-index': index } as CSSProperties}
            key={`${actor.name}-${actor.role}`}
          >
            <i aria-hidden="true" />
            <b>{actor.name}</b>
            <small title={`${actor.role} · ${actor.position}`}>{actor.position}</small>
          </span>
        ))}
      </div>
      {state.sceneProps && state.sceneProps.length > 0 && (
        <div className={styles['scene-props']} aria-label="当前可见道具">
          {state.sceneProps.map((prop, index) => (
            <button
              className={cx(
                styles['scene-prop'],
                commandForProp(key, prop) && visual['scene-prop--glow'],
                discoverableProps.has(prop) && visual['scene-prop--discoverable'],
              )}
              key={prop}
              type="button"
              style={{ '--prop-index': index } as CSSProperties}
              aria-label={`调查${prop}`}
              disabled={!interactive || state.paused || state.caught || !commandForProp(key, prop)}
              onClick={() => commandForProp(key, prop) && void onAction(commandForProp(key, prop))}
            >
              <i aria-hidden="true" />
              <span>{prop}</span>
            </button>
          ))}
        </div>
      )}
      {actions.length > 0 && (
        <div className={styles['scene-actions']}>
          {actions.map((action) => (
            <button
              className={cx(styles['scene-action'], action.quiet && styles['scene-action--quiet'])}
              disabled={!interactive || state.paused || state.caught}
              key={action.command}
              type="button"
              onClick={() => void onAction(action.command)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      <div className={styles['scene-placeholder']} aria-hidden="true">
        <span>场景占位图</span>
        <strong>{state.sceneName?.split('·')[0] || state.roomName}</strong>
        <small>人物、道具与环境音由对白展开</small>
      </div>
    </div>
  );
}
