import type { GameState } from '@/shared/types/game';
import { storyAssets } from '@/shared/lib/story_assets';
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
  if (source === 'mini_double') return '烛光暗下，鬼影从黑暗中冲来，门闩在耳边断裂。';
  if (source === 'mini_dawn_trap') return '假报晓的声音引你离开门房，肉色月光里只剩下拖行的脚步。';
  return '黑影贴上你的后背，门闩断裂声成了这一夜最后的回音。';
}

export function DeathFeedback({ state }: { state: GameState }) {
  return (
    <section
      key={`${state.runId}:${state.shotKey}`}
      className={styles.feedback}
      role="alert"
      aria-live="assertive"
      aria-label="死亡结算"
      data-source={state.retryScene || state.shotKey?.replace(/^death_/, '')}
    >
      <div className={styles['blood-vignette']} aria-hidden="true" />
      <div className={styles['kill-sequence']} aria-hidden="true">
        <img
          className={styles.ghost}
          src={storyAssets.props.intrusionShadow}
          alt=""
          data-death-ghost="true"
        />
        <div className={styles['impact-flash']} />
      </div>
      <svg
        className={styles['blood-pool']}
        viewBox="0 0 600 150"
        aria-hidden="true"
        data-death-blood="true"
      >
        <g fill="#62151c" opacity=".88">
          <path d="M99 92C105 84 127 86 137 82C151 77 173 83 180 89C190 99 167 105 150 102C132 108 117 101 106 102C91 102 88 97 99 92Z" />
          <path d="M230 113C246 106 268 111 281 107C297 103 315 107 319 113C336 120 315 126 293 123C273 128 256 122 243 124C226 124 218 119 230 113Z" />
          <path d="M381 78C390 71 411 75 421 71C434 68 455 74 452 80C460 87 439 92 424 88C408 93 394 87 386 88C375 87 374 82 381 78Z" />
          <path d="M469 115C480 110 492 113 498 116C505 120 490 125 479 122C468 124 458 119 469 115Z" />
          <ellipse cx="67" cy="115" rx="9" ry="2.6" />
          <ellipse cx="194" cy="121" rx="5" ry="2" />
          <ellipse cx="207" cy="78" rx="7" ry="2.2" />
          <ellipse cx="349" cy="97" rx="10" ry="2.7" />
          <ellipse cx="364" cy="126" rx="4" ry="1.7" />
          <ellipse cx="525" cy="91" rx="7" ry="2.2" />
        </g>
      </svg>
      <div className={styles.card}>
        <span className={styles.kicker}>死亡结算 · {deathSource(state)}</span>
        <h2>你被鬼抓住了</h2>
        <p>{deathMessage(state)}</p>
        <span className={styles.status}>生还记录中断 · 最近安全节点已保留</span>
      </div>
    </section>
  );
}
