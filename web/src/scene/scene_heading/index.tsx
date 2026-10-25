import { cx } from '@/shared/lib/cx';
import surface from '@/shared/styles/surfaces.module.css';
import styles from './style.module.css';

export function SceneHeading({
  chapter,
  title,
  description,
}: {
  chapter: string;
  title: string;
  description: string;
}) {
  return (
    <header className={cx(surface.framed, styles.heading)}>
      <span className={styles.chapter}>{chapter}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  );
}
