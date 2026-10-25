import type { GameState } from '@/shared/types/game';
import type { StoryChoice } from './types';
const c = (thought: string, command: string, tone?: StoryChoice['tone']): StoryChoice => ({
  thought,
  command,
  tone,
});

export function sceneChoices(state: GameState): StoryChoice[] {
  const shot = state.shotKey || '';
  switch (state.sceneKey) {
    case 'mini_register':
      return [c('先听听大家怎么安排', '继续听'), c('把行李放好，去吃晚膳', '去斋堂吃晚膳')];
    case 'mini_refectory':
      return [
        c('这碗粥，我先不碰', '我拒绝吃肉粥'),
        c('先尝一口吧', '我吃肉粥'),
        c('先劝大家都换素饼', '劝大家不要吃粥'),
        c('大家都吃，应该没事吧', '让所有人吃粥', 'quiet'),
        c('决定好了，离开斋堂', '吃完晚膳'),
      ];
    case 'mini_corridor_candle':
      return [
        c('接过陆沉手里的红烛', '拿红烛'),
        c('听完叮嘱再走', '继续听'),
        c('去写着“门”的房间', '回自己的房间'),
      ];
    case 'mini_room':
      return [
        c(state.flags.red_candle_lit ? '再看一眼烛火' : '先把红烛点上', '点燃红烛'),
        c('翻翻寺史', '查看寺庙历史'),
        c('读一遍桌上的经书', '阅读清心静神经'),
        c('躺下歇一会儿', '睡下'),
      ];
    case 'mini_wake_three_gongs':
      return [
        c('陆沉说过火不能灭……续上', '续燃红烛'),
        c('月光这么亮，应该够了吧', '不续燃红烛', 'quiet'),
      ];
    case 'mini_four_knocks':
      return [
        c('隔着门问一句：谁？', '不开门并问是谁'),
        c('再听听门外', '检查门缝红蜡'),
        c('还是开门看看', '开门', 'quiet'),
      ];
    case 'mini_three_knocks':
      return [
        c('先核对他刚才说的私物', '核对门外身份'),
        c('沿墙跟去看看', '跟同伴去偷听住持'),
        c('我留在这支烛旁', '留在房间观察'),
      ];
    case 'mini_listen':
      if (!['listen_vase'].includes(shot) && !state.flags.vase_broken)
        return [c('贴近门缝看清楚', '观察住持'), c('太近了，往后退半步', '退后')];
      return [
        c('学刚才那声猫叫', '模仿猫叫'),
        c('用短促的鸟叫掩过去', '模仿鸟叫'),
        c('立刻跑回门房，把门关上', '跑回自己的房间并关门'),
        c('大殿还有灯，向那边跑', '跑向大殿找神公'),
        c('另一头也许有路', '冲向后山', 'quiet'),
      ];
    case 'mini_oracle':
      if (shot === 'oracle_cast') return [c('屏住呼吸，看清地上的杯面', '继续听')];
      if (shot === 'oracle_rescue') return [c('跟紧他手里的红烛', '跟神公回房')];
      if (shot === 'oracle_stone') return [c('他的指尖……怎么变成石头了', '继续听')];
      return [c('先求他：我想回门房', '救我，我想回自己的房间'), c('把眼前这一问掷出去', '掷杯筊')];
    case 'mini_double':
      if (shot === 'double_calm' || state.flags.double_calm)
        return [c('守着烛火，闭上眼歇一会儿', '睡下')];
      if (shot.startsWith('double_scripture_')) return [c('稳住，把下一句念完', '继续念经')];
      if (state.flags.double_frenzy || shot === 'double_frenzy')
        return [
          c('不跟，立刻把房门关上', '关上房门不跟出去'),
          c('他冲出去了，我得跟上', '跟出去', 'quiet'),
        ];
      if (state.flags.double_refused_candle || shot === 'double_exit')
        return [
          c('不能乱，想起经书里的四句', '朗读清心静神经'),
          c('我不跟出去，把门关上', '关上房门不跟出去'),
          c('我跟他出去看一眼', '跟出去', 'quiet'),
        ];
      return [
        c('烛火不能灭，我不同意', '我不吹灭红烛'),
        c('也许他说得对，先吹灭', '吹灭红烛', 'quiet'),
        c('先念起清心偈', '朗读清心静神经'),
      ];
    case 'mini_dawn_trap':
      return [
        c('窗外还黑着，再等一等', '不开门等待真正的五更'),
        c('把刚才那段声音再听一遍', '重听五更和钟声'),
        c('最后也是一声锣……第六声？', '把钟声算作第六声', 'quiet'),
        c('他们说天亮了，开门看看', '开门', 'quiet'),
      ];
    case 'mini_dawn':
      return [
        c('听听他们昨晚的经历', '听天亮对白'),
        c('问陆沉，住持去哪了', '询问住持去了哪里'),
        c('这张残页，还是留在寺里', '留下残页'),
        c('四个人都在，上车回家', '坐大巴回家'),
      ];
    case 'mini_ending':
      return [c('记住这一夜', '查看手记'), c('再走一次这段旅程', '重新开始')];
    case 'mini_death':
      return [
        c('从刚才还来得及的地方重试', '从最近安全节点重试'),
        c('从山门重新走一遍', '重新开始', 'quiet'),
      ];
    default:
      return [];
  }
}
