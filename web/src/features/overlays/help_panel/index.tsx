import { PaperPanel, PaperEyebrow, PaperInstruction } from '@/shared/ui/paper_panel';
import styles from './style.module.css';

export function HelpPanel() {
  return (
    <PaperPanel className={styles['help-sheet']}>
      <PaperEyebrow>在这里，让声音替你行动</PaperEyebrow>
      <h2>按住空格，说出行动</h2>
      <p>松开空格发送。NPC 回应时再次按住空格，可以打断并说话。</p>
      <dl>
        <div>
          <dt>观察</dt>
          <dd>“看看桌上的账本”</dd>
        </div>
        <div>
          <dt>移动</dt>
          <dd>“去走廊”“回休息室”</dd>
        </div>
        <div>
          <dt>交付</dt>
          <dd>“把铜钥匙给守夜人”</dd>
        </div>
        <div>
          <dt>查看</dt>
          <dd>“看看地图”“看看手记”</dd>
        </div>
        <div>
          <dt>存档</dt>
          <dd>“保存为入堂前”“回到入堂前”</dd>
        </div>
        <div>
          <dt>停留</dt>
          <dd>“暂停游戏”“继续游戏”</dd>
        </div>
      </dl>
      <PaperInstruction>进度自动保存 · 说“看看存档”查看检查点</PaperInstruction>
    </PaperPanel>
  );
}
