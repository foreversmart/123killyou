import type { GameState } from '@/shared/types/game';
import { ScenePerson } from '@/scene/scene_person';
import { canShowScenePerson } from '@/scene/scene_person/visibility';
import { SceneProp } from '@/scene/scene_prop';
import { MealDiscussion } from '@/scene/meal_discussion';
import { StoryReading } from '@/scene/story_reading';
import { StoryObservation } from '@/scene/story_observation';
import { SceneHeading } from '@/scene/scene_heading';
import { storyAssets } from '@/shared/lib/story_assets';
import { sceneLayout, shotTitles } from './layouts';
import { authoredScene } from '@/scene/authored_scene/scenes';
import { sceneChoices } from './choices';
import { DeathFeedback } from '@/scene/death_feedback';
import styles from './style.module.css';
import registrationStyles from './registration.module.css';

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
  const authored = Boolean(authoredScene(state));
  const enabled =
    interactive && !state.paused && (!state.caught || Boolean(state.flags.story_dead));
  const speaker = state.dialogue.speaker;
  const actors = (state.actors || []).filter(
    (actor) => canShowScenePerson(actor) && !(actor.id === 'victim' && state.flags.skin_seen),
  );
  const unseenSpeaker = state.actors?.find(
    (actor) =>
      !actor.visible &&
      (speaker.startsWith(actor.name) || (speaker.includes('门外') && actor.id !== 'player')),
  );
  return (
    <div className={styles.stage} data-scene={state.sceneKey} data-shot={state.shotKey || ''}>
      <SceneHeading
        chapter={layout.chapter}
        title={shotTitles[state.shotKey || ''] || layout.title}
        description={layout.atmosphere}
      />
      <div className={styles.staging} aria-label="人物位置与现场道具">
        {!authored &&
          actors.map((actor, index) => (
            <ScenePerson
              key={actor.id}
              actor={actor}
              placement={layout.actors[actor.id] || { x: 35 + index * 13, y: 74, height: 32 }}
              speaking={speaker.startsWith(actor.name) && !speaker.includes('心声')}
              pose={state.shotKey}
              sceneKey={state.sceneKey}
              flags={state.flags}
            />
          ))}
        {!authored && state.sceneKey === 'mini_register' && (
          <>
            <img
              className={styles.registrationForeground}
              src={storyAssets.scenes.registrationDesk}
              alt=""
              aria-hidden="true"
            />
            <div
              className={`${styles.registrationItem} ${registrationStyles.registrationLedger} ${
                state.shotKey === 'register_rooms'
                  ? registrationStyles.registrationLedgerClosed
                  : ''
              }`}
              aria-hidden="true"
            >
              <img
                src={
                  state.shotKey === 'register_rooms'
                    ? storyAssets.scenes.registrationLedgerClosed
                    : storyAssets.scenes.registrationLedgerOpen
                }
                alt=""
              />
            </div>
            {state.shotKey === 'register_desk' && (
              <div
                className={registrationStyles.registrationWriting}
                aria-label="陆沉正在用毛笔登记姓名"
              >
                <span className={registrationStyles.brush} />
                <span className={registrationStyles.inkStroke} />
                <span className={registrationStyles.inkStroke} />
                <span className={registrationStyles.inkStroke} />
              </div>
            )}
            {state.shotKey !== 'register_desk' &&
              ['register_key_tags', 'register_rooms', 'register_luggage'].includes(
                state.shotKey || '',
              ) && (
                <img
                  className={`${styles.registrationItem} ${registrationStyles.registrationKey}`}
                  src={storyAssets.scenes.registrationCopperKey}
                  alt=""
                  aria-hidden="true"
                />
              )}
            {['register_key_tags', 'register_rooms', 'register_luggage'].includes(
              state.shotKey || '',
            ) ? (
              <div className={registrationStyles.registrationTags} aria-hidden="true">
                <span>听</span>
                <span>灯</span>
                <span>纸</span>
                <span>门</span>
              </div>
            ) : null}
          </>
        )}
        {!authored && state.sceneKey === 'mini_refectory' && (
          <img
            className={styles.diningForeground}
            src={storyAssets.scenes.diningTable}
            alt=""
            aria-hidden="true"
          />
        )}
        {!authored && state.sceneKey === 'mini_oracle' && (
          <img
            className={styles.shrineForeground}
            src={storyAssets.scenes.shrineTable}
            alt=""
            aria-hidden="true"
          />
        )}
        {!authored && state.sceneKey === 'mini_listen' && state.flags.skin_seen && (
          <img
            className={styles.victimPartial}
            src={storyAssets.scenes.victimPartial}
            alt="房内床沿垂下一只手"
            aria-hidden="true"
          />
        )}
        {!authored &&
          layout.props.map((prop) => (
            <SceneProp
              key={prop.id}
              prop={prop}
              enabled={enabled}
              lit={Boolean(
                state.flags.red_candle_lit ||
                (prop.id === 'candle' && state.sceneKey === 'mini_oracle'),
              )}
              onAction={onAction}
              state={state}
            />
          ))}
      </div>
      {unseenSpeaker && (
        <div className={styles.source} role="status">
          <i />
          {speaker} · 声音从门外传来
        </div>
      )}
      {state.sceneKey === 'mini_refectory' && (
        <MealDiscussion state={state} enabled={enabled} onAction={onAction} />
      )}
      <StoryReading shot={state.shotKey || ''} />
      <StoryObservation state={state} />
      {state.sceneKey === 'mini_dawn_trap' && (
        <div className={styles.soundLines} aria-label="近处与远处两段声音">
          <span>
            廊外近处 <i>▂▆▃▁ ▂▆▃▁ ▂▆▃▁ ▂▆▃▁ ▂▆▃▁</i>
          </span>
          <span>
            钟楼方向 <i>▁▂▄▆████▆▄▂▁</i>
          </span>
        </div>
      )}
      {state.shotKey?.startsWith('double_scripture_') && (
        <div className={styles.scripture} aria-label="念诵进度">
          {['心不逐声，眼不随影', '一念既起，归于清明', '灯在我前', '门在我后'].map(
            (line, index) => (
              <span key={line} data-read={index < Number(state.shotKey?.split('_').at(-1))}>
                {line}
              </span>
            ),
          )}
        </div>
      )}
      {state.sceneKey === 'mini_death' && <DeathFeedback state={state} />}
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
    </div>
  );
}
