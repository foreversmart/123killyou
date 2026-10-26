import type { StageLayout, StageProp } from './types';
const p = (
  id: string,
  name: string,
  kind: StageProp['kind'],
  x: number,
  y: number,
  command?: string,
  width = 7,
): StageProp => ({ id, name, kind, x, y, command, width });

const roomProps: StageProp[] = [
  p('candle', '红烛', 'candle', 35, 73, '点燃红烛', 6),
  p('history', '游客版寺史册', 'book', 28, 78, '查看寺庙历史', 7),
  p('scripture', '大念处经', 'book', 42, 79, '阅读大念处经', 7),
  p('matches', '火柴', 'match', 39, 69, '点燃红烛', 4),
  p('latch', '门闩', 'latch', 65, 52, '检查门闩', 8),
  p('lamp', '未点的油灯', 'lamp', 46, 69, '看看油灯', 4),
  p('beads', '念珠', 'beads', 18, 80, '查看念珠', 4),
];
const room: StageLayout = {
  chapter: '05 · 门房',
  title: '大念处经 · 四句经文',
  atmosphere: '窗外一线回廊灯，床边只有自己的呼吸。',
  actors: {},
  props: roomProps,
};

export const nightLayouts: Record<string, StageLayout> = {
  mini_room: room,
  mini_wake_three_gongs: {
    ...room,
    chapter: '06 · 三更惊醒',
    title: '熄灭的烛芯',
    atmosphere: '三声更锣，最后一声还在梁上震着。',
    props: roomProps.map((p) =>
      p.id === 'candle' || p.id === 'matches' ? { ...p, command: '续燃红烛' } : p,
    ),
  },
  mini_four_knocks: {
    ...room,
    chapter: '07 · 四敲空门',
    title: '问过之后，没有回答',
    atmosphere: '敲声停了。门眼中只有一条空走廊。',
    props: roomProps.map((p) => (p.id === 'latch' ? { ...p, command: '检查门缝红蜡' } : p)),
  },
  mini_three_knocks: {
    ...room,
    chapter: '08 · 三敲同行',
    title: '先听清门外是谁',
    atmosphere: '三次轻敲后，一个熟悉的声音在门外压得很低。',
  },
  mini_listen: {
    chapter: '08 · 半掩的偏房',
    title: '半掩的偏房',
    atmosphere: '你贴在门轴这一侧，撕裂声从床边传来。',
    actors: {
      huipu: { x: 76, y: 72, height: 46, facing: 'left' },
      linlan: { x: 21, y: 83, height: 36 },
      zhouyan: { x: 21, y: 83, height: 36 },
      xuzhi: { x: 21, y: 83, height: 36 },
    },
    props: [
      p('vase', '花瓶', 'vase', 34, 79, '观察屋内', 8),
      p('cat', '猫食碟', 'plate', 13, 73, '检查猫食碟', 7),
      p('bird', '鸟笼', 'cage', 15, 39, '检查鸟笼', 7),
      p('torch', '手电', 'torch', 52, 85, '看半掩房门', 5),
      p('plaque', '灯房房牌', 'sign', 54, 28, '观察屋内', 5),
    ],
  },
  mini_oracle: {
    chapter: '09 · 大殿偏殿',
    title: '活路不在我嘴里',
    atmosphere: '长明灯照不到佛像的半张脸，小桌后的人却还在呼吸。',
    actors: { shangong: { x: 52, y: 66, height: 37 }, huipu: { x: 94, y: 64, height: 23 } },
    props: [
      p('cups', '杯筊', 'cups', 50, 76, '查看杯筊规矩', 11),
      p('seal', '杯筊封条', 'paper', 40, 72, '确认求回门房', 6),
      p('candle', '神公的红烛', 'candle', 64, 69, '看引路红烛', 7),
      p('cat', '猫食碟', 'plate', 27, 82, '检查猫食碟', 8),
      p('bird', '鸟笼', 'cage', 77, 39, '检查鸟笼', 8),
      p('lamp', '长明灯', 'lamp', 20, 44, '看看长明灯', 5),
    ],
  },
  mini_double: {
    ...room,
    chapter: '10 · 同屋的同行人',
    title: '红光没有照全他的影子',
    atmosphere: '门关了，熟悉的衣服擦过床沿。他的呼吸却没有雾。',
    actors: { skin_double: { x: 54, y: 81, height: 41 } },
  },
  mini_dawn_trap: {
    ...room,
    chapter: '11 · 惊魂未定在房内',
    title: '窗外，还是黑的',
    atmosphere: '近处的震响停后，远处又拖来一声漫长的余音。',
  },
  mini_death: {
    ...room,
    chapter: '歧路 · 红烛熄灭',
    title: '最后一寸红光',
    atmosphere: '门闩断裂的声音，在黑暗里留了很久。',
    props: roomProps.filter((p) => p.id === 'candle' || p.id === 'beads'),
  },
};
