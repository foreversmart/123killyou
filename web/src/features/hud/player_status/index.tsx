import type { GameState } from '@/shared/types/game';
import { cx } from '@/shared/lib/cx';
import surface from '@/shared/styles/surfaces.module.css';
import styles from './style.module.css';

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
  return (
    <header className={cx(surface.framed, styles['topbar'])}>
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
