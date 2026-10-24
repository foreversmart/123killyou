import { Icon } from '@/shared/ui/icon';
import styles from './style.module.css';

export function LoadingScreen({ error }: { error: string }) {
  return (
    <main className={styles['loading-screen']}>
      <Icon kind="seal" />
      <p>{error || '灯火正在亮起……'}</p>
      <small>第一夜 · 网页原型</small>
    </main>
  );
}
