import type { GameState } from '@/shared/types/game';
import type { useVoice } from '@/features/voice/useVoice';
import { VoiceDock } from '@/features/voice/voice_dock';
import { PortraitCorners } from '@/shared/ui/portrait_corners';
import { CharacterAvatar } from '@/shared/ui/character_avatar';
import { storyAssets } from '@/shared/lib/story_assets';
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
  const portraitAsset = getPortraitAsset(dialogue.portrait, dialogue.speaker, state);
  const hasPortrait =
    (Boolean(dialogue.portrait) || Boolean(portraitAsset)) && dialogue.speaker !== '系统';
  const inner = dialogue.speaker.includes('心声');
  return (
    <footer
      className={cx(
        surface.framed,
        styles['dialogue-panel'],
        !hasPortrait && styles['dialogue-panel--narrator'],
        inner && styles.inner,
      )}
    >
      {hasPortrait && (
        <div className={styles['speaker-portrait']} key={dialogue.portrait}>
          {portraitAsset ? (
            <img src={portraitAsset} alt={`${dialogue.speaker}头像`} />
          ) : (
            <CharacterAvatar id={dialogue.portrait} name={dialogue.speaker} portrait />
          )}
          <PortraitCorners />
        </div>
      )}
      <div className={styles['dialogue-content']}>
        <div className={styles['speaker-name']}>
          <span>{dialogue.speaker}</span>
          <small>
            {inner
              ? '内心独白'
              : dialogue.speaker.includes('门外')
                ? '隔门传来'
                : hasPortrait
                  ? '现场对白'
                  : dialogue.speaker === '旁白'
                    ? '旁白'
                    : dialogue.speaker === '系统'
                      ? '操作反馈'
                      : '声音来处未明'}
          </small>
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

function getPortraitAsset(id: string, speaker: string, state: GameState): string | null {
  if (id === 'player') return '/art/portrait-player.webp';
  const aliases: Record<string, keyof typeof storyAssets.portraits> = {
    keeper: 'luchen',
    luchen: 'luchen',
    linlan: 'linlan',
    zhouyan: 'zhouyan',
    xuzhi: 'xuzhi',
    huipu: 'huipu',
    shangong: 'shangong',
  };
  const mapped = aliases[id];
  if (mapped) return getStoryPortrait(mapped, state);
  if (speaker.includes('门外') || speaker.includes('帘后')) return storyAssets.portraits.unknown;
  return null;
}

function getStoryPortrait(id: keyof typeof storyAssets.portraits, state: GameState): string {
  const shot = state.shotKey || '';
  const poses = storyAssets.characterPoses[id as keyof typeof storyAssets.characterPoses] as
    Record<string, string> | undefined;
  if (!poses) return storyAssets.portraits[id];
  if (id === 'linlan') {
    if (state.sceneKey === 'mini_dawn') return poses.tired || storyAssets.portraits[id];
    if (shot === 'listen_skin' || shot === 'listen_vase')
      return poses.afraid || storyAssets.portraits[id];
    if (shot === 'refectory_porridge') return poses.alert || storyAssets.portraits[id];
  }
  if (id === 'zhouyan') {
    if (state.sceneKey === 'mini_dawn') return poses.tired || storyAssets.portraits[id];
    if (shot === 'listen_skin' || shot === 'listen_vase')
      return poses.tense || storyAssets.portraits[id];
    if (shot === 'refectory_porridge') return poses.doubtful || storyAssets.portraits[id];
  }
  if (id === 'xuzhi') {
    if (state.sceneKey === 'mini_dawn') return poses.tired || storyAssets.portraits[id];
    if (shot === 'listen_skin' || shot === 'listen_vase')
      return poses.resolute || storyAssets.portraits[id];
    if (shot === 'refectory_porridge') return poses.concerned || storyAssets.portraits[id];
  }
  if (id === 'luchen' && state.sceneKey === 'mini_corridor_candle')
    return poses.scrutinizing || storyAssets.portraits[id];
  return storyAssets.portraits[id];
}
