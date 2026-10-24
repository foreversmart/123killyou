import { PaperPanel, PaperEyebrow, PaperInstruction } from '@/shared/ui/paper_panel';
import type { GameState } from '@/shared/types/game';
import styles from './style.module.css';

export function ItemDetails({ item }: { item: GameState['inventory'][number] }) {
  return (
    item && (
      <PaperPanel className={styles['item-sheet']}>
        <PaperEyebrow>随身之物</PaperEyebrow>
        <div className={styles['item-detail']}>
          <img src={item.image} alt={item.name} />
          <div>
            <h2>{item.name}</h2>
            <span className={styles['paper-rule']} />
            <p>{item.description}</p>
          </div>
        </div>
        <PaperInstruction>直接说出要对它做的事 · 说“返回”收起</PaperInstruction>
      </PaperPanel>
    )
  );
}
