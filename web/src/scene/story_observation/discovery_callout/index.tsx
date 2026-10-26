import { storyAssets } from '@/shared/lib/story_assets';
import styles from './style.module.css';

export function DiscoveryCallout({ drawing }: { drawing: boolean }) {
  const title = drawing ? '周砚的修缮图' : '登记室门槛 · 旧划痕';
  return (
    <figure className={styles.callout} data-observation="register_drag_mark">
      <figcaption>{title}</figcaption>
      <img
        src={drawing ? storyAssets.props.repairDrawing : storyAssets.details.dragMarks}
        alt={title}
      />
    </figure>
  );
}
