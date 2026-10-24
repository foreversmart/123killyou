import { useGameController } from './useGameController';
import { Room } from '@/scene/room';
import { Overlays } from '@/features/overlays';
import { PlayerStatus } from '@/features/hud/player_status';
import { Inventory } from '@/features/inventory/inventory';
import { DialoguePanel } from '@/features/dialogue/dialogue_panel';
import { CommandPanel } from '@/features/debug/command_panel';
import { ActionNotice } from '@/shared/ui/action_notice';
import { ProblemNotice } from '@/shared/ui/problem_notice';
import { LoadingScreen } from '@/shared/ui/loading_screen';
import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';

export default function Game() {
  const game = useGameController();
  const debug = new URLSearchParams(location.search).has('debug');
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
  } = game;
  if (!state) return <LoadingScreen error={error} />;
  return (
    <main className={cx(styles['app-frame'], debug && styles['app-frame--debug'])}>
      <section className={styles['game-shell']} aria-label="第一夜，语音密室逃脱">
        <PlayerStatus state={state} demo={demo} voiceStarted={voiceStarted} connected={connected} />
        <Room state={state} phase={roomPhase}>
          <Overlays state={state} />
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
        <span>第一夜 · 交互原型</span>
        <span>固定视角 / 按住空格说话 / 剧情暂定</span>
      </div>
      <ProblemNotice message={voice.problem} />
      <ProblemNotice message={error} />
      {debug && <CommandPanel onSubmit={voice.submit} />}
    </main>
  );
}
