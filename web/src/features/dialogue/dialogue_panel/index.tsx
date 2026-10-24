import type { GameState } from '@/shared/types/game';
import type { useVoice } from '@/features/voice/useVoice';
import { VoiceDock } from '@/features/voice/voice_dock';
import { PortraitCorners } from '@/shared/ui/portrait_corners';
import { cx } from '@/shared/lib/cx';
import surface from '@/shared/styles/surfaces.module.css';
import styles from './style.module.css';

export function DialoguePanel({
  state,
  voice,
  demo,
  demoText,
  connected,
  onTour,
}: {
  state: GameState;
  voice: ReturnType<typeof useVoice>;
  demo: boolean;
  demoText: string;
  connected: boolean;
  onTour: () => Promise<void>;
}) {
  return (
    <footer className={cx(surface.framed, styles['dialogue-panel'])}>
      <div className={styles['speaker-portrait']} key={state.dialogue.portrait}>
        <img
          src={`/art/portrait-${state.dialogue.portrait}.webp`}
          alt={`${state.dialogue.speaker}头像`}
        />
        <PortraitCorners />
      </div>
      <div className={styles['dialogue-content']}>
        <div className={styles['speaker-name']}>
          <span>{state.dialogue.speaker}</span>
          <i />
          {(demo || voice.transcript) && (
            <span className={styles['heard-text']}>
              {demo ? '演示' : '听见你说'}：“
              {demo ? demoText : voice.transcript}”
            </span>
          )}
        </div>
        <p className={styles['dialogue-text']} key={`${state.revision}-${state.dialogue.text}`}>
          {state.dialogue.text}
        </p>
      </div>
      <VoiceDock
        voice={voice}
        demo={demo}
        paused={state.paused}
        connected={connected}
        onTour={onTour}
      />
    </footer>
  );
}
