import { useGameController } from './useGameController';
import { Room } from '@/scene/room';
import { Overlays } from '@/features/overlays';
import { PlayerStatus } from '@/features/hud/player_status';
import { Inventory } from '@/features/inventory/inventory';
import { DialoguePanel } from '@/features/dialogue/dialogue_panel';
import { CommandPanel } from '@/features/debug/command_panel';
import { SceneSkip } from '@/features/debug/scene_skip';
import { ActionNotice } from '@/shared/ui/action_notice';
import { ProblemNotice } from '@/shared/ui/problem_notice';
import { LoadingScreen } from '@/shared/ui/loading_screen';
import { StartChoices } from '@/features/session/start_choices';
import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';

export default function Game() {
  const game = useGameController();
  const debug = new URLSearchParams(location.search).has('debug');
  const sceneSkipEnabled = import.meta.env.DEV || debug;
  const {
    state,
    error,
    voice,
    demo,
    demoText,
    connected,
    roomPhase,
    notice,
    showNotice,
    tour,
    voiceStarted,
    opening,
    selecting,
    begin,
    resume,
  } = game;
  if (!state) return <LoadingScreen error={error} />;
  return (
    <main className={cx(styles['app-frame'], debug && styles['app-frame--debug'])}>
      <section className={styles['game-shell']} aria-label="红烛无声，语音密室逃脱">
        <PlayerStatus
          state={state}
          demo={demo}
          voiceStarted={voiceStarted}
          playbackOn={voice.playbackOn}
          connected={connected}
        />
        <Room state={state} phase={roomPhase} onAction={voice.submit} interactive={connected}>
          <Overlays state={state} />
          {opening && <StartChoices busy={selecting} onBegin={begin} onResume={resume} />}
          {showNotice && <ActionNotice text={notice} />}
        </Room>
        <Inventory state={state} />
        <DialoguePanel
          state={state}
          voice={voice}
          demo={demo}
          demoText={demoText}
          connected={connected}
          onTour={tour}
        />
      </section>
      <div className={styles['outside-caption']}>
        <span>红烛无声 · 灯影寺</span>
        {sceneSkipEnabled && <SceneSkip onSkip={() => voice.submit('调试跳到下一剧情场景')} />}
        <span>第一视角 / 道具微光 / 按住空格说话</span>
      </div>
      <ProblemNotice message={voice.problem} />
      <ProblemNotice message={error} />
      {debug && <CommandPanel onSubmit={voice.submit} />}
    </main>
  );
}
