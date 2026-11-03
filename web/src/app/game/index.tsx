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
import { OpeningJourney } from '@/scene/opening_journey';
import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';

export default function Game({ voiceReady }: { voiceReady?: boolean }) {
  const game = useGameController({ voiceReady });
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
    openingFlow,
    openingPhase,
    selecting,
    finishOpeningVideo,
    begin,
    togglePause,
  } = game;
  const speaker =
    voice.status === 'speaking' ? voice.caption?.speaker || state?.dialogue.speaker : '';
  if (!state) return <LoadingScreen error={error} />;
  return (
    <main className={cx(styles['app-frame'], debug && styles['app-frame--debug'])}>
      <section
        className={styles['game-shell']}
        data-paused={state.paused ? 'true' : 'false'}
        aria-label="红烛无声，语音密室逃脱"
      >
        <PlayerStatus
          state={state}
          demo={demo}
          voiceStarted={voiceStarted}
          playbackOn={voice.playbackOn}
          connected={connected}
          onPauseToggle={togglePause}
        />
        <Room
          state={state}
          speaker={speaker}
          phase={roomPhase}
          onAction={voice.submit}
          interactive={connected && !openingFlow && game.sceneReady}
          onAvailability={game.setSceneReady}
          onTravelActive={game.setTravelActive}
          motionPaused={openingFlow}
        >
          <Overlays state={state} />
          {showNotice && <ActionNotice text={notice} />}
        </Room>
        {(openingPhase === 'alighting' || openingPhase === 'done') && <Inventory state={state} />}
        {(!openingFlow || openingPhase === 'alighting') && (
          <DialoguePanel
            state={state}
            voice={voice}
            demo={demo}
            demoText={demoText}
            connected={connected}
            onTour={tour}
          />
        )}
        {(openingPhase === 'reel' || openingPhase === 'ready') && (
          <StartChoices
            ready={openingPhase === 'ready'}
            busy={selecting}
            voiceActive={voiceStarted}
            paused={state.paused}
            onReady={finishOpeningVideo}
            onBegin={begin}
          />
        )}
        {(openingPhase === 'road' || openingPhase === 'alighting') && (
          <OpeningJourney
            phase={openingPhase}
            state={state}
            speaker={speaker}
            onAvailability={game.setJourneyReady}
          />
        )}
      </section>
      <div className={styles['outside-caption']}>
        <span>红烛无声 · 红烛寺</span>
        {sceneSkipEnabled && <SceneSkip onSkip={() => voice.submit('调试跳到下一剧情场景')} />}
        <span>第一视角 / 道具微光 / 按住空格说话</span>
      </div>
      <ProblemNotice message={voice.problem} />
      <ProblemNotice message={error} />
      {debug && <CommandPanel onSubmit={voice.submit} />}
    </main>
  );
}
