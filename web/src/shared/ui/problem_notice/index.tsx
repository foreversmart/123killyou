import styles from './style.module.css';

export function ProblemNotice({ message }: { message: string }) {
  return message ? (
    <aside className={styles['voice-problem']} role="alert">
      {message}
    </aside>
  ) : null;
}
