import { PaperPanel, PaperEyebrow, PaperInstruction } from '@/shared/ui/paper_panel';
import styles from './style.module.css';

export function SettingsPanel({ soundOn }: { soundOn: boolean }) {
  return (
    <PaperPanel className={styles['settings-sheet']}>
      <PaperEyebrow>房间之外</PaperEyebrow>
      <h2>声音设置</h2>
      <div className={styles['sound-setting']}>
        <span>读白与环境声</span>
        <strong>{soundOn ? '已开启' : '已关闭'}</strong>
      </div>
      <p>
        说“关闭声音”或“打开声音”调整。
        <br />
        语音聆听会保持开启。
      </p>
      <PaperInstruction>说“返回”收起</PaperInstruction>
    </PaperPanel>
  );
}
