import { storyAssets } from '@/shared/lib/story_assets';
import styles from './style.module.css';

export function OpeningJourney({ phase }: { phase: 'road' | 'alighting' }) {
  return (
    <div className={styles.journey} data-opening-phase={phase}>
      <img
        className={styles.road}
        src={storyAssets.scenes.busJourney}
        alt={phase === 'road' ? '顶视远景：小小的大巴沿林海中的山路驶向红烛寺' : ''}
        aria-hidden={phase !== 'road'}
      />
      <img
        className={styles.alighting}
        src={storyAssets.scenes.busArrival}
        alt={phase === 'alighting' ? '第一视角：跟随同伴从大巴下车，山门内陆沉合十相迎' : ''}
        aria-hidden={phase !== 'alighting'}
      />
    </div>
  );
}
