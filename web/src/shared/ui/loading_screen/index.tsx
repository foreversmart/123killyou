import { Icon } from '@/shared/ui/icon';
import styles from './style.module.css';

export function LoadingScreen({ error }: { error: string }) {
  return (
    <main className={styles['loading-screen']}>
      <Icon kind="seal" />
      <p>{error || '灯火正在亮起……'}</p>
      <small>红烛无声 · 红烛寺</small>
    </main>
  );
}
