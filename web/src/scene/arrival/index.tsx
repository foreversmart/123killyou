import type { GameState } from '@/shared/types/game';
import { SceneHeading } from '@/scene/scene_heading';
import { storyAssets } from '@/shared/lib/story_assets';
import openingStyles from './opening_reel.module.css';
import interaction from './interaction.module.css';

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
      <details className={openingStyles.reel}>
        <summary>片头回放</summary>
        <video
          className={openingStyles.video}
          src={storyAssets.video.opening}
          poster={storyAssets.video.titleCard}
          controls
          preload="none"
          aria-label="红烛寺片头回放"
        />
      </details>
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
