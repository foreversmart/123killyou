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
  const dialogue = voice.caption?.text ? voice.caption : state.dialogue;
  const hasPortrait = Boolean(dialogue.portrait) && dialogue.speaker !== '系统';
  return (
    <footer
      className={cx(
        surface.framed,
        styles['dialogue-panel'],
        !hasPortrait && styles['dialogue-panel--narrator'],
      )}
    >
      {hasPortrait && (
        <div className={styles['speaker-portrait']} key={dialogue.portrait}>
          <img src={`/art/portrait-${dialogue.portrait}.webp`} alt={`${dialogue.speaker}头像`} />
          <PortraitCorners />
        </div>
      )}
      <div className={styles['dialogue-content']}>
        <div className={styles['speaker-name']}>
          <span>{dialogue.speaker}</span>
          <i />
          {demo && <span className={styles['heard-text']}>演示：“{demoText}”</span>}
        </div>
        <p className={styles['dialogue-text']}>{dialogue.text}</p>
      </div>
      <VoiceDock
        voice={voice}
        demo={demo}
        paused={state.paused}
        connected={connected}
        storyMode={Boolean(state.storyMode || state.sceneKey)}
        onTour={onTour}
        showTour={!state.sceneKey}
      />
    </footer>
  );
}
