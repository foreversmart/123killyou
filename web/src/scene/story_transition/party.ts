type Traveler = {
  id: 'luchen' | 'linlan' | 'zhouyan' | 'xuzhi';
  name: string;
  x: number;
  y: number;
  height: number;
  facing?: 'left' | 'right';
  waiting?: boolean;
};

const companions: Traveler[] = [
  { id: 'linlan', name: '林岚', x: 33, y: 75, height: 31, facing: 'left' },
  { id: 'zhouyan', name: '周砚', x: 48, y: 68, height: 27 },
  { id: 'xuzhi', name: '许栀', x: 62, y: 80, height: 34, facing: 'left' },
];

// The camera travels with the player. Only other members of the party appear.
export function travelParty(sceneKey: string): Traveler[] {
  if (sceneKey === 'mini_ending') return companions;
  if (sceneKey === 'mini_room')
    return [
      { id: 'luchen', name: '陆沉', x: 52, y: 61, height: 28, waiting: true },
      { id: 'linlan', name: '林岚', x: 24, y: 71, height: 30, facing: 'left' },
      { id: 'zhouyan', name: '周砚', x: 39, y: 78, height: 34 },
      { id: 'xuzhi', name: '许栀', x: 73, y: 73, height: 32 },
    ];
  if (!['mini_register', 'mini_refectory', 'mini_corridor_candle'].includes(sceneKey)) return [];
  return [{ id: 'luchen', name: '陆沉', x: 76, y: 63, height: 28, facing: 'left' }, ...companions];
}
