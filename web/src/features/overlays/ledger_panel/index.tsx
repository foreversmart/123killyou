import { HtmlClue } from '@/scene/html_clue';
import styles from './style.module.css';

export function LedgerPanel() {
  return (
    <div className={styles['ledger-sheet']}>
      <HtmlClue />
      <p className={styles['overlay-voice-hint']}>线索已记入手记 · 说“返回”收起</p>
    </div>
  );
}
