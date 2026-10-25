import type { GameState } from '@/shared/types/game';
import { dayLayouts } from './day_layouts';
import { nightLayouts } from './night_layouts';
import type { StageLayout } from './types';
import { actorComposition, propComposition } from './compositions';

export function sceneLayout(state: GameState): StageLayout {
  const base =
    dayLayouts[state.sceneKey || ''] ||
    nightLayouts[state.sceneKey || ''] ||
    nightLayouts.mini_room;
  const props = propComposition(state, state.sceneKey === 'mini_death' ? [] : base.props).map(
    (prop) => {
      if (state.sceneKey === 'mini_register' && ['register', 'keys', 'permit'].includes(prop.id)) {
        // These three props are painted into the generated registration
        // layers. Keep their interaction hotspots, but avoid drawing a second
        // SVG key/ledger over the full-canvas asset.
        return { ...prop, draw: false };
      }
      if (prop.id === 'tower' || prop.id === 'plaque') {
        // These landmarks are already visible in the authored corridor/room
        // plates. Retain the hotspot while avoiding a generic sign drawing.
        return { ...prop, draw: false };
      }
      if (prop.id === 'vase' && state.shotKey === 'listen_vase')
        return { ...prop, kind: 'shards' as const, name: '碎花瓶', command: '检查花瓶碎片' };
      if (prop.id === 'latch' && state.sceneKey === 'mini_three_knocks')
        return { ...prop, command: '核对门外身份' };
      return prop;
    },
  );
  return { ...base, actors: actorComposition(state, base.actors), props };
}

export const shotTitles: Record<string, string> = {
  arrival_linlan: '车门边 · 相机与阳光',
  arrival_zhouyan: '山门梁架 · 偏房一侧',
  arrival_xuzhi: '台阶边 · 卡住的行李车',
  arrival_luchen: '登记桌旁 · 檐下旧灯',
  arrival_inner: '车门停下 · 树影与低钟',
  arrival_cat: '山门侧 · 晒太阳的花猫',
  arrival_plaque: '新匾侧面 · 明照寺旧字',
  register_desk: '登记桌前 · 写下名字',
  register_key_tags: '登记桌面 · 四块铜牌',
  register_rooms: '东院入口 · 四把房牌',
  register_drag_mark: '回廊地砖 · 旧拖痕',
  register_camera_bell: '听房门边 · 铜铃余音',
  register_ribbon: '入住须知 · 蓝色发圈',
  refectory_table: '同一张饭桌',
  refectory_bread: '饭桌边 · 掰开的素饼',
  refectory_porridge: '勺底的肉纤维',
  refectory_lamp: '斋堂灯下 · 碗签与木勺',
  refectory_curtain: '长明灯后的半张脸',
  corridor_candles: '陆沉逐人发烛',
  corridor_warning: '嘘，小声',
  corridor_lamp: '檐灯亮起 · 五更的话',
  corridor_lock: '钟楼门锁 · 错开的声源',
  corridor_two_gongs: '两声更锣 · 房门前',
  room_table: '门房 · 矮桌前',
  room_candle: '一寸烛光',
  room_history: '寺史册 · 被撕去的验身栏',
  room_scripture: '清心静神经 · 四句短偈',
  wake_candle: '三更 · 熄灭的烛芯',
  four_knocks: '门闩后 · 四下敲门',
  three_knocks: '门闩后 · 三下敲门',
  listen_door: '贴墙 · 半掩的门',
  listen_skin: '门缝中的背影',
  listen_vase: '脚边 · 花瓶碎了',
  oracle_table: '偏殿 · 杯筊桌',
  oracle_question: '偏殿 · 只求回到门房',
  oracle_rules: '偏殿 · 一平一凸，两平两凸',
  oracle_cast: '杯筊落地',
  oracle_rescue: '红烛引路',
  oracle_stone: '指尖变成了石头',
  double_enter: '另一个房门突然撞开',
  double_candle: '烛光前的劝说',
  double_exit: '只看一眼？',
  double_frenzy: '衣领下的缝线',
  double_calm: '伏在床脚的影子',
  double_scripture_1: '心不逐声，眼不随影',
  double_scripture_2: '一念既起，归于清明',
  double_scripture_3: '灯在我前',
  double_scripture_4: '门在我后',
  dawn_gongs: '近处之后，还有远处',
  dawn_knocks: '门外又响了三下',
  dawn_wait: '守着红烛等一等',
  dawn_courtyard: '晨光照进东院',
  dawn_axis: '门轴新痕 · 方向未明',
  dawn_gate: '山门下 · 归还通行凭',
  ending_bus: '大巴后排 · 回家的路',
};
