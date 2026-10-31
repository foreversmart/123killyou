import type { GameState } from '@/shared/types/game';
import { PaperPanel, PaperInstruction } from '@/shared/ui/paper_panel';
import styles from './style.module.css';

export function StoryMap({ state }: { state: GameState }) {
  const key = state.sceneKey || '';
  const east = /room|wake|knocks|double|dawn_trap|corridor|listen|mini_register/.test(key);
  const gate = state.room === 'gate' || /arrival|dawn_gate|ending/.test(key);
  const refectory = state.room === 'refectory' || key === 'mini_refectory';
  const register = state.room === 'register' || key === 'mini_register';
  const oracle = key === 'mini_oracle';
  const rear = /hall|dawn_courtyard/.test(key);
  return (
    <PaperPanel className={styles.map}>
      <small>红烛寺 · 你走过的院落</small>
      <h2>中轴院落舆图</h2>
      <div className={styles.drawing}>
        <div className={styles.backCourt}>
          <div className={styles.building}>
            方丈院<span>后院 · 住持起居</span>
          </div>
          <div className={styles.building} data-current={rear}>
            藏经阁<span>经卷库房</span>
          </div>
          <div className={styles.building}>
            香积厨 / 库房<span>后院 · 斋务与杂物</span>
          </div>
        </div>
        <div className={styles.axisLine} />
        <div className={styles.mainCourt}>
          <div className={styles.sideWing}>
            <div className={styles.building}>
              钟楼<span>西南角</span>
            </div>
            <div className={styles.building} data-current={east}>
              西客寮院<span>四间偏房 · 回廊</span>
            </div>
            <div className={styles.building}>
              客堂<span>西侧接待与香客休息</span>
            </div>
            <div className={styles.building}>
              西偏殿<span>伽蓝与香客小殿</span>
            </div>
            <div className={styles.roomRow} aria-label="西客寮院四间偏房">
              {['听', '灯', '纸', '门'].map((room) => (
                <b key={room} data-current={room === '门' && east}>
                  {room}
                </b>
              ))}
            </div>
          </div>
          <div className={styles.axisBuildings}>
            <div className={styles.building}>
              天王殿<span>四大天王 · 前殿</span>
            </div>
            <div className={styles.path} />
            <div className={styles.building} data-current={oracle}>
              大雄宝殿<span>主殿 · 东侧偏殿为杯筊桌</span>
            </div>
            <div className={styles.path} />
            <div className={styles.building} data-current={rear}>
              藏经楼 / 法堂<span>后殿 · 讲经与祖师牌位</span>
            </div>
          </div>
          <div className={styles.sideWing}>
            <div className={styles.building}>
              鼓楼<span>东南角</span>
            </div>
            <div className={styles.building}>
              东偏殿<span>祖师与功德牌位</span>
            </div>
            <div className={styles.building} data-current={refectory}>
              斋堂<span>素斋与晚膳</span>
            </div>
            <div className={styles.building}>
              僧舍 / 库房<span>东院 · 香火杂物</span>
            </div>
            <div className={styles.building}>
              净房<span>后院 · 盥洗杂役</span>
            </div>
          </div>
        </div>
        <div className={styles.axisLine} />
        <div className={styles.foreCourt}>
          <div className={styles.building} data-current={register}>
            登记房<span>东院入口 · 领取房牌</span>
          </div>
          <div className={styles.building} data-current={gate}>
            山门<span>牌楼 · 大巴停靠处</span>
          </div>
          <div className={styles.building}>
            放生池<span>东南角 · 山门内</span>
          </div>
        </div>
      </div>
      <p>现在：{state.sceneName || state.roomName} · 中轴由山门向后院递进，钟鼓楼分列两侧</p>
      <PaperInstruction>先认清眼前的门与灯 · 说“返回”收起</PaperInstruction>
    </PaperPanel>
  );
}
