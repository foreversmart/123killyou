import { useId } from 'react';
import type { GameState } from '@/shared/types/game';
import { ArtDefs } from '@/scene/story_art/common';
import { CourtyardArt } from '@/scene/story_art/courtyard';
import { RefectoryArt } from '@/scene/story_art/refectory';
import { BedroomArt } from '@/scene/story_art/bedroom';
import { ListenRoomArt } from '@/scene/story_art/listen_room';
import { OracleArt } from '@/scene/story_art/oracle';
import { DawnGateArt, DepartureArt } from '@/scene/story_art/departure';
import { storyAssets } from '@/shared/lib/story_assets';
import styles from './style.module.css';

const descriptions: Record<string, string> = {
  mini_register:
    '东院登记桌前，四间偏房沿回廊排开。听、灯、纸、门的铜牌挂在门上，地砖旧拖痕延伸到偏殿。',
  mini_refectory:
    '落日穿过斋堂格窗，四只粥碗各有碗签，热馒头、咸菜、笋干和本地香菇青菜放在长桌上。右后帘内亮着一盏长明灯。',
  mini_corridor_candle: '靛蓝夜色中的东院回廊。四扇偏房门被檐灯照亮，远处钟楼门已经封闭。',
  mini_room: '你站在门房内：床在左侧，矮桌在眼前，门闩在正前方，右侧窗外是回廊与低月。',
  mini_wake_three_gongs:
    '三更的同一间门房。蜡芯冒出淡烟，床铺在左，门仍紧闭，月光斜落在无人地砖上。',
  mini_four_knocks:
    '从门闩内看向紧闭的门，门缝红蜡还在。床、矮桌和窗的位置没有变化，门眼外只有黑暗。',
  mini_three_knocks: '你仍站在门房内，面对门外的三次敲门。窗外是清冷月光，门缝没有透露来人的真容。',
  mini_listen:
    '贴墙望入半掩的灯房，床在右后方，床沿垂下一只手。左前方的花瓶紧贴脚边，猫食碟和鸟笼在墙侧。',
  mini_oracle:
    '大殿东侧的偏殿。杯筊桌在眼前，佛像半张脸在阴影里，猫食碟、鸟笼和一支红烛守着微弱灯线。',
  mini_double: '回到同一间门房。床在左，红烛矮桌在眼前，门闩在前，右侧月光投下的影子缺了一角。',
  mini_dawn_trap: '五更前的门房。窗外仍是深夜，云遮住月亮，红烛的光停在紧闭的门前。',
  mini_dawn: '真正的晨光照亮东院。四间偏房的门打开，檐灯熄了，地砖上的旧拖痕依然可见。',
  mini_ending: '大巴里的座位与车窗。晨雾从窗外退去，后视镜中旧匾明照寺短暂显现。',
  mini_death: '眼前的场景被逐渐压暗，原先的门、桌和灯线仍在，红烛的光已经消失。',
};

export function StoryArt({ state }: { state: GameState }) {
  const id = useId().replaceAll(':', '');
  const key = state.sceneKey || '';
  const shot = state.shotKey || '';
  const environment = () => {
    if (
      key === 'mini_register' ||
      key === 'mini_corridor_candle' ||
      (key === 'mini_dawn' && shot !== 'dawn_gate')
    )
      return <CourtyardArt id={id} state={state} />;
    if (key === 'mini_refectory') return <RefectoryArt id={id} state={state} />;
    if (key === 'mini_listen' || shot === 'death_mini_listen')
      return <ListenRoomArt id={id} state={state} />;
    if (key === 'mini_oracle' || shot === 'death_mini_oracle')
      return <OracleArt id={id} state={state} />;
    if (key === 'mini_dawn' && shot === 'dawn_gate') return <DawnGateArt id={id} />;
    if (key === 'mini_ending') return <DepartureArt id={id} />;
    return <BedroomArt id={id} state={state} />;
  };

  const assetScene = selectSceneAsset(key, shot, state.flags);

  const roomAsset =
    assetScene === storyAssets.scenes.playerRoom ||
    assetScene === storyAssets.scenes.playerRoomMoonlit ||
    assetScene === storyAssets.scenes.playerRoomFalseDawn;
  return (
    <div className={styles.art} data-scene-art={key} data-shot-art={shot}>
      <svg
        viewBox="0 0 1000 600"
        preserveAspectRatio="none"
        role="img"
        aria-label={state.sceneText || descriptions[key]}
      >
        <ArtDefs id={id} />
        {assetScene ? (
          <>
            <image
              href={assetScene}
              x="0"
              y="0"
              width="1000"
              height="600"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            />
            {key === 'mini_corridor_candle' && (
              <rect width="1000" height="600" fill="#102630" opacity=".46" />
            )}
            {roomAsset && <rect width="1000" height="600" fill="#07141b" opacity=".08" />}
          </>
        ) : (
          environment()
        )}
        {key === 'mini_death' && <rect width="1000" height="600" fill="#100c16" opacity=".38" />}
      </svg>
    </div>
  );
}

function selectSceneAsset(
  key: string,
  shot: string,
  flags: Record<string, boolean>,
): string | undefined {
  if (key === 'mini_register') return storyAssets.scenes.registration;
  if (key === 'mini_refectory') return storyAssets.scenes.diningHall;
  if (key === 'mini_corridor_candle')
    return shot === 'corridor_warning' || shot === 'corridor_two_gongs'
      ? storyAssets.scenes.eastCourtyardNight
      : storyAssets.scenes.eastCourtyardDusk;
  if (key === 'mini_listen') return storyAssets.scenes.guestRoomNight;
  if (key === 'mini_oracle') return storyAssets.scenes.shrineNight;
  if (key === 'mini_dawn')
    return shot === 'dawn_gate'
      ? storyAssets.scenes.templeGateDawn
      : storyAssets.scenes.eastCourtyardDawn;
  if (key === 'mini_ending') return storyAssets.scenes.busDeparture;
  if (key === 'mini_dawn_trap') return storyAssets.scenes.playerRoomFalseDawn;
  if (key === 'mini_wake_three_gongs') return storyAssets.scenes.playerRoomMoonlit;
  if (key === 'mini_four_knocks') return storyAssets.scenes.peepholeEmpty;
  if (key === 'mini_death') {
    if (shot === 'death_mini_listen') return storyAssets.scenes.guestRoomNight;
    if (shot === 'death_mini_oracle') return storyAssets.scenes.shrineNight;
    return storyAssets.scenes.playerRoomMoonlit;
  }
  if (key === 'mini_room' || key === 'mini_three_knocks' || key === 'mini_double')
    return flags.red_candle_lit
      ? storyAssets.scenes.playerRoom
      : storyAssets.scenes.playerRoomMoonlit;
  return undefined;
}
