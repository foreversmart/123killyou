import { PaperPanel, PaperEyebrow, PaperInstruction } from '@/shared/ui/paper_panel';
import type { GameState } from '@/shared/types/game';
import styles from './style.module.css';

export function BagPanel({ state }: { state: GameState }) {
  return (
    <PaperPanel className={styles['bag-sheet']}>
      <PaperEyebrow>你从未真正放下它们</PaperEyebrow>
      <h2>随身物品</h2>
      <div className={styles['bag-items']}>
        {state.inventory.map((item) => (
          <div key={item.id}>
            <img src={item.image} alt="" />
            <strong>{item.name}</strong>
          </div>
        ))}
      </div>
      <PaperInstruction>说出物品名称查看 · 说“返回”收起</PaperInstruction>
    </PaperPanel>
  );
}
