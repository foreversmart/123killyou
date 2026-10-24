import { PaperPanel, PaperInstruction } from '@/shared/ui/paper_panel';
import { Icon } from '@/shared/ui/icon';
import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';

export function MapPanel({ room }: { room: string }) {
  return (
    <PaperPanel className={styles['map-sheet']}>
      <div className={styles['map-heading']}>
        <span>第一夜 · 已知区域</span>
        <Icon kind="seal" />
      </div>
      <h2>院落舆图</h2>
      <p className={styles['paper-subtitle']}>循着灯光走，别惊动这里的人。</p>
      <div className={styles['map-drawing']}>
        <div className={cx(styles['map-room'], room === 'watch' && styles['map-room--current'])}>
          <span className={styles['map-roof']} />
          <strong>值守室</strong>
          <small>{room === 'watch' ? '你在这里' : '守夜人在此'}</small>
        </div>
        <div className={styles['map-path']}>
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className={cx(styles['map-room'], room === 'corridor' && styles['map-room--current'])}>
          <span className={styles['map-roof']} />
          <strong>走廊</strong>
          <small>{room === 'corridor' ? '你在这里' : '可前往'}</small>
        </div>
        <div className={cx(styles['map-path'], styles['map-path--closed'])}>
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className={cx(styles['map-room'], styles['map-room--locked'])}>
          <span className={styles['map-roof']} />
          <strong>内堂</strong>
          <small>门扉紧闭</small>
        </div>
      </div>
      <div className={styles['map-legend']}>
        <span className={styles['map-current-dot']} /> 当前所在{' '}
        <span className={styles['map-legend-line']} /> 已知通路
      </div>
      <PaperInstruction>说“去走廊”或“回值守室”前往 · 说“返回”收起</PaperInstruction>
    </PaperPanel>
  );
}
