import type { CSSProperties } from 'react';
import type { StageProp } from '@/scene/story_stage/types';
import { PropArt } from './art';
import styles from './style.module.css';

export function SceneProp({
  prop,
  enabled,
  lit,
  onAction,
}: {
  prop: StageProp;
  enabled: boolean;
  lit: boolean;
  onAction: (command: string) => Promise<void>;
}) {
  const graphic =
    prop.draw === false ? null : <PropArt kind={prop.kind} name={prop.name} lit={lit} />;
  const style = {
    left: `${prop.x}%`,
    top: `${prop.y}%`,
    width: `${prop.width || 7}%`,
    '--rotate': `${prop.rotate || 0}deg`,
  } as CSSProperties;
  if (!prop.command)
    return (
      <div className={styles.prop} style={style} role="img" aria-label={prop.name}>
        {graphic}
      </div>
    );
  return (
    <button
      className={`${styles.prop} ${prop.draw === false ? styles['prop--hotspot'] : ''}`}
      data-interactive="true"
      data-prop={prop.id}
      style={style}
      disabled={!enabled}
      aria-label={`观察${prop.name}`}
      onClick={() => void onAction(prop.command!)}
    >
      {graphic}
      <i className={styles.glimmer} aria-hidden="true" />
      <span className={styles.name}>{prop.name}</span>
    </button>
  );
}
