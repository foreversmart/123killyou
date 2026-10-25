import type { GameState } from '@/shared/types/game';
import { DeathFigure } from '@/scene/scene_person/death_figure';
import styles from './style.module.css';

const sourceNames: Record<string, string> = {
  mini_room: '未点红烛',
  mini_four_knocks: '四敲空门',
  mini_wake_three_gongs: '三更熄烛',
  mini_three_knocks: '三敲误判',
  mini_listen: '半掩偏房',
  mini_oracle: '偏殿求筊',
  mini_double: '同屋换皮',
  mini_dawn_trap: '假报晓',
};

function deathSource(state: GameState): string {
  const source = state.retryScene || state.shotKey?.replace(/^death_/, '') || '';
  return sourceNames[source] || '未知歧路';
}

function deathMessage(state: GameState): string {
  const source = state.retryScene || state.shotKey?.replace(/^death_/, '') || '';
  if (source === 'mini_room') return '红烛没有亮起，门缝后的黑影撞开门闩，把你拖进了无光处。';
  if (source === 'mini_listen') return '门缝里的影子扑了过来，最后一寸烛光被血色吞没。';
  if (source === 'mini_oracle') return '杯筊落地，神公的石手没有来得及指向生路。';
  if (source === 'mini_four_knocks') return '门外的东西越过门槛，冰冷的手扣住了你的喉咙。';
  if (source === 'mini_double') return '熟悉的脸贴近烛光，裂开的皮肤先一步缠住了你的手腕。';
  if (source === 'mini_dawn_trap') return '假报晓的声音引你离开门房，肉色月光里只剩下拖行的脚步。';
  return '黑影贴上你的后背，门闩断裂声成了这一夜最后的回音。';
}

export function DeathFeedback({ state }: { state: GameState }) {
  const figurePose = state.retryScene === 'mini_four_knocks' ? 'death_mini_four_knocks' : undefined;
  return (
    <section className={styles.feedback} role="alert" aria-live="assertive" aria-label="死亡结算">
      <div className={styles['blood-vignette']} aria-hidden="true" />
      <div className={styles['kill-sequence']} aria-hidden="true">
        <div className={styles['death-figure']}>
          <DeathFigure pose={figurePose} />
        </div>
        <div className={styles['impact-flash']} />
      </div>
      <div className={styles['blood-scratch']} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className={styles.card}>
        <span className={styles.kicker}>死亡结算 · {deathSource(state)}</span>
        <h2>你被鬼抓住了</h2>
        <p>{deathMessage(state)}</p>
        <span className={styles.status}>生还记录中断 · 最近安全节点已保留</span>
      </div>
    </section>
  );
}
