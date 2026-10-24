import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';

export function PortraitCorners() {
  return (
    <>
      <span className={cx(styles['portrait-corner'], styles['portrait-corner--tl'])} />
      <span className={cx(styles['portrait-corner'], styles['portrait-corner--br'])} />
    </>
  );
}
