import type { GameState } from '@/shared/types/game';
import type { ActorPlacement, StageProp } from './types';
type ArtPoint = [number, number, boolean?];
const roomPoints: Record<string, ArtPoint> = {
  candle: [350, 427],
  history: [294, 442],
  scripture: [404, 433],
  page: [438, 450],
  beads: [312, 462],
  latch: [650, 307, false],
  lamp: [480, 379, false],
  matches: [375, 453],
};
const points: Record<string, Record<string, ArtPoint>> = {
  mini_register: {
    register: [423, 433, false],
    keys: [485, 425],
    permit: [515, 435],
    page: [395, 451],
    beads: [460, 444],
    bags: [205, 465],
    camera: [145, 330, false],
    ribbon: [646, 260, false],
    map: [383, 342, false],
  },
  mini_refectory: {
    player_bowl: [365, 470, false],
    linlan_bowl: [335, 405, false],
    zhouyan_bowl: [567, 400, false],
    xuzhi_bowl: [663, 464, false],
    bread: [480, 446, false],
    water: [748, 406, false],
    bamboo: [247, 464, false],
    spoon: [433, 482],
    offering: [786, 471],
    curtain_lamp: [790, 155, false],
  },
  mini_corridor_candle: {
    candle: [475, 366],
    keeper_lamp: [510, 161, false],
    bell: [145, 200],
    notice: [625, 370],
    tower: [938, 264, false],
  },
  mini_listen: {
    vase: [235, 455, false],
    cat: [350, 513, false],
    bird: [320, 264, false],
    plaque: [666, 128, false],
    torch: [375, 470],
  },
  mini_oracle: {
    cups: [420, 407, false],
    seal: [416, 404, false],
    candle: [537, 336, false],
    cat: [214, 465, false],
    bird: [794, 320, false],
    lamp: [228, 187, false],
  },
};
const cast: Record<string, Record<string, ActorPlacement>> = {
  mini_register: {
    luchen: { x: 47, y: 67.5, height: 32 },
    linlan: { x: 14.5, y: 68.3, height: 30 },
    zhouyan: { x: 37.5, y: 68.3, height: 30 },
    xuzhi: { x: 62.5, y: 68.3, height: 30 },
  },
  mini_refectory: {
    luchen: { x: 65, y: 58, height: 32 },
    huipu: { x: 79, y: 48.3, height: 26 },
    linlan: { x: 22, y: 66, height: 29 },
    zhouyan: { x: 54, y: 60, height: 28 },
    xuzhi: { x: 76, y: 75.3, height: 33 },
  },
  mini_corridor_candle: {
    luchen: { x: 51, y: 68.3, height: 38 },
    linlan: { x: 14.5, y: 69, height: 30 },
    zhouyan: { x: 37.5, y: 69, height: 30 },
    xuzhi: { x: 62.5, y: 69, height: 30 },
  },
  mini_listen: {
    victim: { x: 85, y: 63, height: 22 },
    huipu: { x: 74.2, y: 62.7, height: 38 },
    linlan: { x: 39.3, y: 77.2, height: 34 },
    zhouyan: { x: 39.3, y: 77.2, height: 34 },
    xuzhi: { x: 39.3, y: 77.2, height: 34 },
  },
  mini_oracle: { shangong: { x: 44.9, y: 63.5, height: 36 } },
  mini_double: { skin_double: { x: 64.5, y: 67.5, height: 38 } },
  mini_ending: {
    linlan: { x: 23, y: 66.7, height: 25 },
    zhouyan: { x: 62, y: 66.7, height: 25 },
    xuzhi: { x: 82, y: 73.3, height: 25 },
  },
};
export function propComposition(state: GameState, props: StageProp[]): StageProp[] {
  let map = points[state.sceneKey || ''] || roomPoints;
  if (state.sceneKey === 'mini_dawn')
    map =
      state.shotKey === 'dawn_gate'
        ? {
            camera: [338, 392, false],
            map: [538, 384, false],
            ribbon: [456, 338, false],
            bags: [560, 510],
            permit: [660, 424],
            page: [610, 504],
          }
        : {
            camera: [145, 327, false],
            map: [383, 342, false],
            ribbon: [646, 260, false],
            bags: [280, 477],
            permit: [475, 366],
            page: [438, 477],
          };
  if (state.sceneKey === 'mini_ending')
    map = { camera: [230, 325, false], map: [628, 342, false], ribbon: [840, 306, false] };
  if (state.sceneKey === 'mini_oracle' && state.shotKey === 'oracle_rescue')
    map = { ...map, candle: [592, 326, false] };
  return props.map((prop) => {
    const point = map[prop.id];
    return point ? { ...prop, x: point[0] / 10, y: point[1] / 6, draw: point[2] ?? true } : prop;
  });
}
export function actorComposition(state: GameState, fallback: Record<string, ActorPlacement>) {
  if (state.sceneKey === 'mini_death') {
    const source = state.retryScene || '';
    const evil =
      source === 'mini_listen'
        ? { x: 74.2, y: 68, height: 48 }
        : source === 'mini_oracle'
          ? { x: 88, y: 70, height: 50 }
          : { x: 65, y: 70, height: 52 };
    return { evil };
  }
  const placement = { ...(cast[state.sceneKey || ''] || fallback) };
  if (state.sceneKey === 'mini_double') {
    if (state.shotKey === 'double_calm') placement.skin_double = { x: 17.5, y: 78.3, height: 16 };
    else if (state.shotKey === 'double_frenzy' || state.shotKey === 'double_exit')
      placement.skin_double = { x: 65, y: 69, height: 38 };
    else if (state.shotKey !== 'double_enter') placement.skin_double = { x: 53, y: 77, height: 40 };
  }
  if (state.sceneKey === 'mini_oracle' && state.shotKey === 'oracle_rescue')
    placement.shangong = { x: 52, y: 68.2, height: 36 };
  if (state.sceneKey === 'mini_dawn' && state.shotKey !== 'dawn_gate')
    return cast.mini_corridor_candle;
  if (state.sceneKey === 'mini_dawn')
    return {
      luchen: { x: 70, y: 72, height: 32 },
      linlan: { x: 33.8, y: 81.3, height: 32 },
      zhouyan: { x: 52.9, y: 77, height: 30 },
      xuzhi: { x: 43.2, y: 85, height: 33 },
    };
  return placement;
}
