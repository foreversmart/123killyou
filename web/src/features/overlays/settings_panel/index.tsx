import { PaperPanel, PaperInstruction } from '@/shared/ui/paper_panel';
import styles from './style.module.css';

export function SettingsPanel() {
  return (
    <PaperPanel className={styles['settings-sheet']}>
      <h2>系统设置</h2>
      <div className={styles['reset-setting']}>
        <h3>重置进度</h3>
        <p>重新开始游戏，已命名的存档仍可读取。</p>
      </div>
      <PaperInstruction>说“重置进度”重新开始 · 说“返回”关闭</PaperInstruction>
    </PaperPanel>
  );
}
