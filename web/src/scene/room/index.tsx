import type { ReactNode } from 'react';
import type { GameState } from '@/shared/types/game';
import { Scene } from '../background';
import { StoryScene } from '../story_scene';
import type { RoomPhase } from './useRoomTransition';
import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';

export function Room({
  state,
  phase,
  children,
  onAction,
  interactive,
}: {
  state: GameState;
  phase: RoomPhase;
  children: ReactNode;
  onAction: (command: string) => Promise<void>;
  interactive?: boolean;
}) {
  return (
    <section
      className={styles['room']}
      aria-label={state.sceneName || state.roomName}
      aria-busy={phase !== 'idle'}
    >
      <Scene state={state} />
      <div className={styles['scene-shading']} />
      <StoryScene state={state} onAction={onAction} interactive={interactive} />
      {children}
      <div className={styles['scene-caption']}>
        <span className={styles['caption-line']} />
        <span>
          {state.sceneKey
            ? '先看清声源，再走下一步'
            : state.room === 'watch'
              ? '有人在等你的回答'
              : '不要惊动长廊里的寂静'}
        </span>
        <span className={styles['caption-line']} />
      </div>
      <div
        className={cx(
          styles['scene-transition'],
          (phase === 'leaving' || phase === 'black') && styles['scene-transition--black'],
          phase === 'leaving' && styles['scene-transition--leaving'],
        )}
        data-phase={phase}
        aria-hidden="true"
      />
    </section>
  );
}
