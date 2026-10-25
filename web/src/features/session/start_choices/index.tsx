import styles from './style.module.css';

export function StartChoices({
  busy,
  onBegin,
  onResume,
}: {
  busy: boolean;
  onBegin: () => Promise<void>;
  onResume: () => Promise<void>;
}) {
  return (
    <aside className={styles.choices} aria-label="选择旅程">
      <span>周末 · 午后</span>
      <h2>灯影寺，一夜之行</h2>
      <p>大巴刚刚停稳。山门前，同行的三个人正在等你下车。</p>
      <button disabled={busy} onClick={() => void onBegin()}>
        {busy ? '正在准备…' : '开始旅程 · 第一幕'}
      </button>
      <button className={styles.resume} disabled={busy} onClick={() => void onResume()}>
        继续上次进度
      </button>
    </aside>
  );
}
