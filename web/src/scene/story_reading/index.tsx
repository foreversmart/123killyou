import styles from './style.module.css';

export function StoryReading({ shot }: { shot: string }) {
  const history = shot === 'room_history';
  const page = shot === 'room_page';
  const permit = shot === 'room_permit';
  if (!history && !page && !permit && shot !== 'room_scripture') return null;
  return (
    <article
      className={styles.page}
      aria-label={
        page
          ? '入住须知残页'
          : permit
            ? '通行凭背面'
            : history
              ? '游客版寺史册展开页'
              : '大念处经展开页'
      }
    >
      <span className={styles.binding} aria-hidden="true" />
      <small>
        {page
          ? '入住须知 · 残页'
          : permit
            ? '红烛寺 · 外客凭据'
            : history
              ? '红烛寺 · 游客版'
              : '门房案头 · 四句经文'}
      </small>
      <h3>{page ? '夜间须知' : permit ? '通行凭' : history ? '明照旧事' : '大念处经'}</h3>
      {page ? (
        <p className={styles.ink}>
          钟响之后，
          <br />
          不要回答自己的名字。
        </p>
      ) : permit ? (
        <>
          <p>只许去，不许问。</p>
          <div className={styles.seal}>红烛寺</div>
        </>
      ) : history ? (
        <>
          <p>七年前，方丈顾怀山于方丈室圆寂。</p>
          <p>灯灭即成佛，诸弟子毋近。</p>
          <div className={styles.torn}>验身记录　…………</div>
        </>
      ) : (
        <>
          <p>观身如身、观受如受、</p>
          <p>观心如心、观法如法。</p>
        </>
      )}
    </article>
  );
}
