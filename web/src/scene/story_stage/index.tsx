import type { GameState } from '@/shared/types/game';
import { ScenePerson } from '@/scene/scene_person';
import { SceneProp } from '@/scene/scene_prop';
import { MealDiscussion } from '@/scene/meal_discussion';
import { StoryReading } from '@/scene/story_reading';
import { storyAssets } from '@/shared/lib/story_assets';
import { sceneLayout, shotTitles } from './layouts';
import { sceneChoices } from './choices';
import { cx } from '@/shared/lib/cx';
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
  const enabled =
    interactive && !state.paused && (!state.caught || Boolean(state.flags.story_dead));
  const speaker = state.dialogue.speaker;
  const actors = (state.actors || []).filter(
    (actor) =>
      actor.visible && actor.id !== 'player' && !(actor.id === 'victim' && state.flags.skin_seen),
  );
  const unseenSpeaker = state.actors?.find(
    (actor) =>
      !actor.visible &&
      (speaker.startsWith(actor.name) || (speaker.includes('门外') && actor.id !== 'player')),
  );
  return (
    <div
      className={cx(styles.stage, layout.daylight && styles.daylight)}
      data-scene={state.sceneKey}
      data-shot={state.shotKey || ''}
    >
      <header className={styles.heading}>
        <span>{layout.chapter}</span>
        <h2>{shotTitles[state.shotKey || ''] || layout.title}</h2>
        <p>{layout.atmosphere}</p>
      </header>
      <div className={styles.staging} aria-label="人物位置与现场道具">
        {actors.map((actor, index) => (
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
        {state.sceneKey === 'mini_register' && (
          <>
            <img
              className={styles.registrationForeground}
              src={storyAssets.scenes.registrationDesk}
              alt=""
              aria-hidden="true"
            />
            <img
              className={`${styles.registrationItem} ${styles.registrationLedger}`}
              src={
                state.shotKey === 'register_rooms'
                  ? storyAssets.scenes.registrationLedgerClosed
                  : storyAssets.scenes.registrationLedgerOpen
              }
              alt=""
              aria-hidden="true"
            />
            <img
              className={`${styles.registrationItem} ${styles.registrationKey}`}
              src={storyAssets.scenes.registrationCopperKey}
              alt=""
              aria-hidden="true"
            />
            <img
              className={`${styles.registrationItem} ${styles.registrationPermit}`}
              src={
                state.shotKey === 'register_luggage'
                  ? storyAssets.scenes.registrationPermitSingle
                  : storyAssets.scenes.registrationPermitStack
              }
              alt=""
              aria-hidden="true"
            />
            {[
              'register_key_tags',
              'register_rooms',
              'register_drag_mark',
              'register_camera_bell',
              'register_ribbon',
              'register_luggage',
            ].includes(state.shotKey || '') ? (
              <div className={styles.registrationTags} aria-hidden="true">
                <span>听</span>
                <span>灯</span>
                <span>纸</span>
                <span>门</span>
              </div>
            ) : null}
          </>
        )}
        {state.sceneKey === 'mini_refectory' && (
          <img
            className={styles.diningForeground}
            src={storyAssets.scenes.diningTable}
            alt=""
            aria-hidden="true"
          />
        )}
        {state.sceneKey === 'mini_oracle' && (
          <img
            className={styles.shrineForeground}
            src={storyAssets.scenes.shrineTable}
            alt=""
            aria-hidden="true"
          />
        )}
        {state.sceneKey === 'mini_listen' && state.flags.skin_seen && (
          <img
            className={styles.victimPartial}
            src={storyAssets.scenes.victimPartial}
            alt="房内床沿垂下一只手"
            aria-hidden="true"
          />
        )}
        {layout.props.map((prop) => (
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
      <div className={styles.choices} aria-label="主角的内心想法">
        <span className={styles.thought}>我心里想……</span>
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
