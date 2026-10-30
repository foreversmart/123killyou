import type { GameState } from '@/shared/types/game';
import { StoryReading } from '@/scene/story_reading';
import { WorldEvidence } from '@/scene/world_evidence';
import { SceneHeading } from '@/scene/scene_heading';
import { sceneLayout, shotTitles } from './layouts';
import { sceneChoices } from './choices';
import { DeathFeedback } from '@/scene/death_feedback';
import styles from './style.module.css';

export function StoryStage({
  state,
  interactive = true,
  onAction,
}: {
  state: GameState;
  interactive?: boolean;
  onAction: (command: string) => Promise<void>;
}) {
  const layout = sceneLayout(state);
  const mealEating = state.sceneKey === 'mini_refectory' && state.shotKey === 'refectory_eating';
  const enabled =
    interactive && !state.paused && (!state.caught || Boolean(state.flags.story_dead));
  const speaker = state.dialogue.speaker;
  const unseenSpeaker = state.actors?.find(
    (actor) =>
      !actor.visible &&
      (speaker.startsWith(actor.name) || (speaker.includes('门外') && actor.id !== 'player')),
  );
  return (
    <div
      className={styles.stage}
      data-scene={state.sceneKey}
      data-shot={state.shotKey || ''}
      data-meal-animation={mealEating ? 'active' : undefined}
    >
      <SceneHeading
        chapter={layout.chapter}
        title={shotTitles[state.shotKey || ''] || layout.title}
        description={layout.atmosphere}
      />
      {unseenSpeaker && (
        <div className={styles.source} role="status">
          <i />
          {speaker} · 声音从门外传来
        </div>
      )}
      <StoryReading shot={state.shotKey || ''} />
      <WorldEvidence state={state} />
      {state.shotKey?.startsWith('double_scripture_') && (
        <div className={styles.scripture} aria-label="念诵进度">
          {['观身如身', '观受如受', '观心如心', '观法如法'].map((line, index) => (
            <span key={line} data-read={index < Number(state.shotKey?.split('_').at(-1))}>
              {line}
            </span>
          ))}
        </div>
      )}
      {state.sceneKey === 'mini_death' && <DeathFeedback state={state} />}
      {!mealEating && (
        <div className={styles.choices} aria-label="接下来的行动">
          <span className={styles.thought}>接下来……</span>
          <div>
            {sceneChoices(state).map((choice) => (
              <button
                type="button"
                key={choice.command}
                disabled={!enabled}
                data-tone={choice.tone}
                onClick={() => void onAction(choice.command)}
              >
                {choice.thought}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
