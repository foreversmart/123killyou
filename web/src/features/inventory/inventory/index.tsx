import type { GameState } from '@/shared/types/game';
import { Icon } from '@/shared/ui/icon';
import { cx } from '@/shared/lib/cx';
import surface from '@/shared/styles/surfaces.module.css';
import styles from './style.module.css';

export function Inventory({ state }: { state: GameState }) {
  return (
    <aside className={cx(surface.framed, styles['inventory'])} aria-label="随身物品">
      <div className={styles['inventory-title']}>
        <span />
        随身物品
        <span />
      </div>
      <div className={styles['inventory-grid']}>
        {Array.from({ length: 6 }, (_, index) => {
          const item = state.inventory[index];
          return (
            <div
              className={cx(
                styles['item-card'],
                !item && styles['item-card--empty'],
                item?.id === state.focusItem && styles['item-card--focused'],
              )}
              key={item?.id || `empty-${index}`}
            >
              {item ? (
                <>
                  <img src={item.image} alt={item.name} draggable="false" />
                  <span>{item.name}</span>
                </>
              ) : (
                <Icon kind="seal" />
              )}
            </div>
          );
        })}
      </div>
      <div className={styles['voice-library']}>
        <span className={styles['voice-library-title']}>语音可查看</span>
        <div>
          <figure>
            <Icon kind="map" />
            <figcaption>地图</figcaption>
          </figure>
          <figure>
            <Icon kind="journal" />
            <figcaption>线索</figcaption>
          </figure>
          <figure>
            <Icon kind="journal" />
            <figcaption>手记</figcaption>
          </figure>
        </div>
      </div>
      <div className={styles['inventory-bottom-mark']}>
        <span />
        <Icon kind="seal" />
        <span />
      </div>
    </aside>
  );
}
