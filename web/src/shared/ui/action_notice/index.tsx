import styles from './style.module.css';

export function ActionNotice({ text }: { text: string }) {
  return (
    <div className={styles['action-notice']} role="status" key={text}>
      <span />
      {text}
    </div>
  );
}
