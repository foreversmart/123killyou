import { useState } from 'react';
import type { GameState } from '@/shared/types/game';
import styles from './style.module.css';

const people = [
  { id: 'linlan', name: '林岚' },
  { id: 'zhouyan', name: '周砚' },
  { id: 'xuzhi', name: '许栀' },
];
export function MealDiscussion({
  state,
  enabled,
  onAction,
}: {
  state: GameState;
  enabled: boolean;
  onAction: (command: string) => Promise<void>;
}) {
  const [person, setPerson] = useState('');
  return (
    <div className={styles.meals} aria-label="与同行人商量吃粥">
      <div className={styles.people}>
        {people.map(({ id, name }) => (
          <button
            type="button"
            key={id}
            disabled={!enabled}
            aria-expanded={person === name}
            onClick={() => setPerson(person === name ? '' : name)}
          >
            {name}
            <span>
              {state.flags[`meal_${id}_ate`]
                ? '已喝粥'
                : state.flags[`meal_${id}_refused`]
                  ? '换素饼'
                  : '还在犹豫'}
            </span>
          </button>
        ))}
      </div>
      {person && (
        <div className={styles.discussion}>
          <span>我对{person}说……</span>
          <button disabled={!enabled} onClick={() => void onAction(`劝${person}别吃肉粥，换素饼`)}>
            先别喝，换素饼吧
          </button>
          <button disabled={!enabled} onClick={() => void onAction(`让${person}喝粥`)}>
            也许只是招待游客的粥
          </button>
          <button disabled={!enabled} onClick={() => void onAction(`让${person}暂缓`)}>
            先等等，问清楚
          </button>
        </div>
      )}
    </div>
  );
}
