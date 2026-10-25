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
          <dd>“看看桌上的经书”“查看肉粥”</dd>
        </div>
        <div>
          <dt>移动</dt>
          <dd>“登记入住”“去斋堂”“回自己的房间”</dd>
        </div>
        <div>
          <dt>对白</dt>
          <dd>“继续听”“重听当前对白”</dd>
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
