import type { GameState } from '@/shared/types/game';
import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';

type StoryAction = { label: string; command: string; quiet?: boolean };

const actionsByScene: Record<string, StoryAction[]> = {
  mini_arrival: [
    { label: '登记入住', command: '登记入住' },
    { label: '看看山门', command: '看看山门', quiet: true },
  ],
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
    { label: '打开门', command: '开门', quiet: true },
  ],
  mini_dawn: [
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
  const actions = actionsByScene[key] || [];
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
      {state.sceneProps && state.sceneProps.length > 0 && (
        <div className={styles['scene-props']} aria-label="当前可见道具">
          {state.sceneProps.map((prop) => (
            <span className={styles['scene-prop']} key={prop}>
              <i aria-hidden="true" />
              {prop}
            </span>
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
