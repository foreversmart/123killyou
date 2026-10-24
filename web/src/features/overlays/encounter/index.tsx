import { Icon } from '@/shared/ui/icon';
import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';

export function Encounter({ caught }: { caught: boolean }) {
  return caught ? (
    <div className={cx(styles['scene-overlay'], styles['caught-overlay'])}>
      <span>异　类</span>
      <h2>他们认出了你</h2>
      <p>门在身后合上。你的解释已经没有人听。</p>
      <small>说“重新开始”，重回这一夜。</small>
    </div>
  ) : (
    <div className={cx(styles['scene-overlay'], styles['pause-overlay'])}>
      <Icon kind="seal" />
      <span>灯火未尽，长夜未央</span>
      <h2>时间停在这里</h2>
      <p>说“继续游戏”，回到房间。</p>
    </div>
  );
}
