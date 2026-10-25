import type { GameState } from '@/shared/types/game';
import { cx } from '@/shared/lib/cx';
import surface from '@/shared/styles/surfaces.module.css';
import styles from './style.module.css';

const nightScenes = [
  'mini_room',
  'mini_wake_three_gongs',
  'mini_four_knocks',
  'mini_three_knocks',
  'mini_listen',
  'mini_oracle',
  'mini_double',
  'mini_dawn_trap',
  'mini_death',
];

export function PlayerStatus({
  state,
  demo,
  voiceStarted,
  playbackOn,
  connected,
}: {
  state: GameState;
  demo: boolean;
  voiceStarted: boolean;
  playbackOn?: boolean;
  connected: boolean;
}) {
  const devotion = Math.max(0, Math.min(100, state.devotion));
  const devotionLow = devotion <= 30;
  const nightThreat = devotionLow && nightScenes.includes(state.sceneKey || '');
  return (
    <header className={cx(surface.framed, styles['topbar'])}>
      <div
        className={cx(styles.devotion, devotionLow && styles['devotion--low'])}
        aria-label={`虔诚度 ${devotion}%`}
      >
        <div className={styles['devotion-heading']}>
          <span>虔诚度</span>
          <strong>{devotion}</strong>
        </div>
        <div
          className={styles['devotion-track']}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={devotion}
        >
          <span style={{ width: `${devotion}%` }} />
        </div>
        {nightThreat && <small className={styles['devotion-warning']}>门外的东西在靠近</small>}
      </div>
      <h1>{state.sceneName || state.roomName}</h1>
      <div className={styles['connection-status']}>
        <span>
          {demo
            ? '演示进行中'
            : voiceStarted
              ? '语音会话'
              : playbackOn
                ? '对白已开启'
                : '语音待启用'}
        </span>
        <i className={voiceStarted || playbackOn || demo ? styles['is-active'] : undefined} />
        <small
          title={
            state.savedAt
              ? `最近保存：${new Date(state.savedAt).toLocaleString('zh-CN')}`
              : undefined
          }
        >
          {!state.id ? '旅程尚未开始' : connected ? '进度已保存' : '服务重连中'}
        </small>
      </div>
    </header>
  );
}
