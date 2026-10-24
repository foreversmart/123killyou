import type { GameState } from '@/shared/types/game';
import { PortraitCorners } from '@/shared/ui/portrait_corners';
import { cx } from '@/shared/lib/cx';
import surface from '@/shared/styles/surfaces.module.css';
import styles from './style.module.css';

export function PlayerStatus({
  state,
  demo,
  voiceStarted,
  connected,
}: {
  state: GameState;
  demo: boolean;
  voiceStarted: boolean;
  connected: boolean;
}) {
  return (
    <header className={cx(surface.framed, styles['topbar'])}>
      <div className={styles['player-card']}>
        <img src="/art/portrait-player.webp" alt="主角头像" />
        <PortraitCorners />
      </div>
      <div className={styles['devotion']}>
        <span className={styles['devotion-label']}>
          虔诚度 <strong>{state.devotion}</strong>
        </span>
        <div
          className={styles['devotion-meter']}
          role="meter"
          aria-label="虔诚度"
          aria-valuenow={state.devotion}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div style={{ width: `${state.devotion}%` }} />
        </div>
        <span className={cx(styles.identity, state.caught && styles['identity--exposed'])}>
          {state.caught ? '身份已暴露' : state.devotion < 45 ? '有人在怀疑' : '身份未暴露'}
        </span>
      </div>
      <h1>
        第一夜<span>·</span>
        {state.sceneName || state.roomName}
      </h1>
      <div className={styles['connection-status']}>
        <span>{demo ? '演示进行中' : voiceStarted ? '语音会话' : '语音待启用'}</span>
        <i className={voiceStarted || demo ? styles['is-active'] : undefined} />
        <small
          title={
            state.savedAt
              ? `最近保存：${new Date(state.savedAt).toLocaleString('zh-CN')}`
              : undefined
          }
        >
          {connected ? (state.savedAt ? '进度已保存' : '本地原型') : '服务重连中'}
        </small>
      </div>
    </header>
  );
}
