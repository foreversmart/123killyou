import type { GameState } from '@/shared/types/game';
import { PaperPanel, PaperInstruction } from '@/shared/ui/paper_panel';
import styles from './style.module.css';
const rooms = ['听', '灯', '纸', '门'];
export function StoryMap({ state }: { state: GameState }) {
  const key = state.sceneKey || '';
  const east = /room|wake|knocks|double|dawn_trap|corridor|listen/.test(key);
  return (
    <PaperPanel className={styles.map}>
      <small>红烛寺 · 你走过的院落</small>
      <h2>循着灯线认路</h2>
      <div className={styles.drawing}>
        <div className={styles.hall} data-current={key === 'mini_oracle'}>
          大雄宝殿<span>东侧偏殿 · 杯筊桌</span>
        </div>
        <div className={styles.path} />
        <div className={styles.courtyard} data-current={east}>
          <span>东院回廊</span>
          <div>
            {rooms.map((room) => (
              <b
                key={room}
                data-current={room === '门' && /room|wake|knocks|double|dawn_trap/.test(key)}
              >
                {room}
                <small>
                  {room === '门'
                    ? '你的房间'
                    : room === '听'
                      ? '林岚'
                      : room === '灯'
                        ? '周砚'
                        : '许栀'}
                </small>
              </b>
            ))}
          </div>
        </div>
        <div className={styles.path} />
        <div className={styles.bottom}>
          <div data-current={key === 'mini_refectory'}>
            斋堂<span>晚膳处</span>
          </div>
          <i />
          <div data-current={key === 'mini_register'}>
            登记桌<span>东院入口</span>
          </div>
        </div>
        <div className={styles.path} />
        <div className={styles.gate} data-current={/arrival|dawn$|ending/.test(key)}>
          红烛寺山门<span>大巴停靠处</span>
        </div>
      </div>
      <p>现在：{state.sceneName || state.roomName}</p>
      <PaperInstruction>先认清眼前的门与灯 · 说“返回”收起</PaperInstruction>
    </PaperPanel>
  );
}
