import type { ReactNode } from 'react';
import type { GameState } from '@/shared/types/game';
import { Scene } from '../background';
import type { RoomPhase } from './useRoomTransition';
import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';

export function Room({
  state,
  phase,
  children,
}: {
  state: GameState;
  phase: RoomPhase;
  children: ReactNode;
}) {
  return (
    <section className={styles['room']} aria-label={state.roomName} aria-busy={phase !== 'idle'}>
      <Scene state={state} />
      <div className={styles['scene-shading']} />
      {children}
      <div className={styles['scene-caption']}>
        <span className={styles['caption-line']} />
        <span>{state.room === 'watch' ? '有人在等你的回答' : '不要惊动长廊里的寂静'}</span>
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
