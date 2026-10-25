import styles from './style.module.css';

export function StoryReading({ shot }: { shot: string }) {
  const history = shot === 'room_history';
  if (!history && shot !== 'room_scripture') return null;
  return (
    <article
      className={styles.page}
      aria-label={history ? '游客版寺史册展开页' : '清心静神经展开页'}
    >
      <span className={styles.binding} aria-hidden="true" />
      <small>{history ? '灯影寺 · 游客版' : '门房案头 · 末页短偈'}</small>
      <h3>{history ? '明照旧事' : '清心静神经'}</h3>
      {history ? (
        <>
          <p>七年前，方丈顾怀山于方丈室圆寂。</p>
          <p>灯灭即成佛，诸弟子毋近。</p>
          <div className={styles.torn}>验身记录　…………</div>
          <small>这一栏的纸，沿装订线被撕走了。</small>
        </>
      ) : (
        <>
          <p>心不逐声，眼不随影。</p>
          <p>一念既起，归于清明。</p>
          <p>灯在我前，门在我后。</p>
          <small>把这几句记在心里，别只记住声音。</small>
        </>
      )}
    </article>
  );
}
