import type { GameState } from '@/shared/types/game';
import { StoryObservation } from '@/scene/story_observation';
import { storyAssets } from '@/shared/lib/story_assets';
import { SceneHeading } from '@/scene/scene_heading';
import { AuthoredScene } from '@/scene/authored_scene';
import { composeLayout } from '@/scene/authored_scene/compose';
import type { AuthoredLayout } from '@/scene/authored_scene/types';
import gateLayout from '../../../../assets/scenes/temple_gate/layout.json';
import styles from './style.module.css';
import openingStyles from './opening_reel.module.css';
import interaction from './interaction.module.css';

// Gameplay begins after stepping off the bus. The opening end card keeps its
// own bus interior; all gate props and people share this exterior coordinate space.
const arrivalComposition = composeLayout(gateLayout as unknown as AuthoredLayout, 'temple_gate', {
  time: 'afternoon',
  bags: true,
  cat: true,
  companions: true,
  keeper: true,
});

export function ArrivalBackdrop() {
  return (
    <div
      className={styles.arrival}
      role="img"
      aria-label="下车后站在红烛寺山门前，三位同伴在石阶旁等候，陆沉从门内迎来；花猫与行李放在地面上。"
    >
      <AuthoredScene composition={arrivalComposition} />
      <details className={openingStyles.reel}>
        <summary>片头回放</summary>
        <video
          className={openingStyles.video}
          src={storyAssets.video.opening}
          poster={storyAssets.video.titleCard}
          controls
          preload="metadata"
          aria-label="红烛寺片头回放"
        />
      </details>
    </div>
  );
}

const hotspots = [
  { id: 'bell', name: '山门铜铃', command: '看铜铃' },
  { id: 'cat', name: '晒太阳的花猫', command: '看看花猫' },
  { id: 'plaque', name: '明照寺旧匾', command: '看看山门' },
];

export function ArrivalInteraction({
  state,
  onAction,
  interactive: enabled,
}: {
  state: GameState;
  onAction: (command: string) => Promise<void>;
  interactive: boolean;
}) {
  const disabled = !enabled || state.paused || state.caught;
  return (
    <div className={interaction.interaction} aria-label="第一幕：大巴抵达红烛寺">
      <SceneHeading
        chapter="第一幕 · 晴天下午"
        title="01 · 大巴抵达红烛寺"
        description="周末，四个人，一次说好的散心。"
      />
      {hotspots.map((prop) => (
        <button
          className={interaction.hotspot}
          data-prop={prop.id}
          type="button"
          key={prop.id}
          aria-label={`观察${prop.name}`}
          disabled={disabled}
          onClick={() => void onAction(prop.command)}
        >
          <i aria-hidden="true" />
          <span>{prop.name}</span>
        </button>
      ))}
      <StoryObservation state={state} />
      <div className={interaction.actions} aria-label="接下来的行动">
        <button disabled={disabled} type="button" onClick={() => void onAction('听第一话')}>
          听听他们在说什么
        </button>
        <button disabled={disabled} type="button" onClick={() => void onAction('登记入住')}>
          我先去登记入住 →
        </button>
      </div>
    </div>
  );
}
