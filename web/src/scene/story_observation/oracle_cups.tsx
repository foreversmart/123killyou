import { storyAssets } from '@/shared/lib/story_assets';
import { oracleFaces } from './oracle_faces';
import styles from './style.module.css';

export function OracleCups({
  flags,
  falling,
}: {
  flags: Record<string, boolean>;
  falling: boolean;
}) {
  const faces = oracleFaces(flags);
  if (!faces) return null;
  return (
    <div className={styles.cups} data-falling={falling} aria-label="落地后的两片杯面">
      {faces.map((face, index) => (
        <img
          key={index}
          data-cup-face={face}
          src={face === 'flat' ? storyAssets.props.jiaobeiFlat : storyAssets.props.jiaobeiCurved}
          alt={face === 'flat' ? '平面朝上' : '凸面朝上'}
        />
      ))}
    </div>
  );
}
