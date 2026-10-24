import { PaperPanel, PaperEyebrow, PaperInstruction } from '@/shared/ui/paper_panel';
import type { GameState } from '@/shared/types/game';
import { Icon } from '@/shared/ui/icon';
import styles from './style.module.css';

export function JournalPanel({ state }: { state: GameState }) {
  return (
    <PaperPanel className={styles['journal-sheet']}>
      <PaperEyebrow>所见所闻，留待查证</PaperEyebrow>
      <h2>夜行手记</h2>
      {state.clues.length ? (
        <ol>
          {state.clues.map((clue) => (
            <li key={clue}>{clue}</li>
          ))}
        </ol>
      ) : (
        <div className={styles['empty-journal']}>
          <Icon kind="journal" />
          <p>纸页还空着。先看看守夜人桌上的账本。</p>
        </div>
      )}
      <PaperInstruction>说“看看账本”调查 · 说“返回”收起</PaperInstruction>
    </PaperPanel>
  );
}
