import type { GameState } from '@/shared/types/game';
import { StoryObservation } from '@/scene/story_observation';
import { storyAssets } from '@/shared/lib/story_assets';
import styles from './style.module.css';
import artwork from './artwork.module.css';
import openingStyles from './opening_reel.module.css';
import temple from './temple.module.css';
import people from './people.module.css';
import interaction from './interaction.module.css';

const visitors = [
  { id: 'linlan', name: '林岚', place: '左侧台阶 · 举起相机', detail: '相机' },
  { id: 'zhouyan', name: '周砚', place: '山门右侧 · 看梁架', detail: '修缮图' },
  { id: 'xuzhi', name: '许栀', place: '行李车旁 · 蓝色发圈', detail: '旅行包' },
  { id: 'luchen', name: '陆沉', place: '山门内侧 · 登记桌后', detail: '照尘 · 守夜人' },
];

export function ArrivalBackdrop() {
  return (
    <div
      className={styles.arrival}
      data-authored="true"
      role="img"
      aria-label="晴天下午，你站在大巴车门台阶。左侧林岚举起相机，许栀在行李车旁；右侧周砚看山门梁架，守夜人陆沉在灯影寺山门内的登记桌后等候。旧匾明照寺露在新匾侧面，铜铃垂在檐下，花猫在石阶旁晒太阳。"
    >
      <div className={styles.sun} />
      <div className={styles['distant-hills']} />
      <div className={styles['temple-wall']} />
      <div className={styles['stone-court']} />
      <div className={styles['tree-shadow']} />
      <img
        className={styles['asset-gate']}
        src={storyAssets.scenes.busArrival}
        alt=""
        aria-hidden="true"
      />
      <details className={openingStyles.reel}>
        <summary>片头回放</summary>
        <video
          className={openingStyles.video}
          src={storyAssets.video.opening}
          poster={storyAssets.video.titleCard}
          controls
          preload="metadata"
          aria-label="灯影寺片头回放"
        />
      </details>
      <div className={styles.tree}>
        <i />
        <i />
        <i />
      </div>
      <div className={styles.bus}>
        <span className={styles['bus-route']}>周末 · 山寺接驳</span>
        <div className={styles['bus-window']} />
        <div className={styles['bus-door']}>
          <i />
          <i />
          <span>车门</span>
        </div>
        <div className={styles['bus-stripe']} />
        <span className={styles['bus-number']}>灯影寺</span>
        <div className={styles.wheel} />
      </div>
      <div className={temple['temple-gate']} data-asset-gate="true">
        <div className={temple.roof} />
        <div className={temple['roof-edge']} />
        <div className={temple['gate-wall']} />
        <div className={temple['gate-door']} />
        <div className={temple['gate-column']} />
        <div className={temple['gate-column-right']} />
        <div className={temple.plaque}>灯影寺</div>
        <div className={temple['old-plaque']}>明照寺</div>
        <div className={temple['gate-steps']} />
      </div>
      <div className={temple.bell} aria-hidden="true">
        <i />
      </div>
      <div className={temple['direction-sign']}>
        <span>香客登记 →</span>
        <small>接驳车停靠处</small>
      </div>
      <div className={people['luggage-cart']} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className={people['registration-desk']}>
        <span>登记簿</span>
        <i />
      </div>
      {visitors.map((person) => (
        <div className={people.person} data-person={person.id} key={person.id}>
          <div className={people.figure} data-asset={person.id}>
            <img
              className={people['asset-figure']}
              src={storyAssets.characters[person.id as keyof typeof storyAssets.characters]}
              alt=""
              aria-hidden="true"
            />
            <i className={people.head} />
            <i className={people.body} />
            <span className={people.accessory}>{person.detail}</span>
          </div>
          <div className={people['name-tag']}>
            <b>{person.name}</b>
            <span>{person.place}</span>
          </div>
        </div>
      ))}
      <div className={styles.cat} aria-hidden="true">
        <i />
        <i />
      </div>
      <img
        className={artwork.assetCat}
        src={storyAssets.props.catResting}
        alt=""
        aria-hidden="true"
      />
      <div className={styles['door-step']}>
        <span>你 · 车门台阶</span>
      </div>
      <div className={styles['sun-rays']} />
    </div>
  );
}

const hotspots = [
  { id: 'bell', name: '山门铜铃', command: '看铜铃' },
  { id: 'cat', name: '晒太阳的花猫', command: '看看花猫' },
  { id: 'plaque', name: '明照寺旧匾', command: '看看山门' },
];

export function ArrivalInteraction({
  state,
  onAction,
  interactive: enabled,
}: {
  state: GameState;
  onAction: (command: string) => Promise<void>;
  interactive: boolean;
}) {
  const disabled = !enabled || state.paused || state.caught;
  return (
    <div className={interaction.interaction} aria-label="第一幕：大巴抵达灯影寺">
      <div className={interaction.heading}>
        <span>第一幕 · 晴天下午</span>
        <h2>01 · 大巴抵达灯影寺</h2>
        <p>周末，四个人，一次说好的散心。</p>
      </div>
      {hotspots.map((prop) => (
        <button
          className={interaction.hotspot}
          data-prop={prop.id}
          type="button"
          key={prop.id}
          aria-label={`观察${prop.name}`}
          disabled={disabled}
          onClick={() => void onAction(prop.command)}
        >
          <i aria-hidden="true" />
          <span>{prop.name}</span>
        </button>
      ))}
      <StoryObservation state={state} />
      <div className={interaction.actions} aria-label="接下来的行动">
        <button disabled={disabled} type="button" onClick={() => void onAction('听第一话')}>
          听听他们在说什么
        </button>
        <button disabled={disabled} type="button" onClick={() => void onAction('登记入住')}>
          我先去登记入住 →
        </button>
      </div>
    </div>
  );
}
