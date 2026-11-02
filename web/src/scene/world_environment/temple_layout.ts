/**
 * A compact site plan based on the common Chinese Buddhist temple pattern:
 * a south-facing axial sequence, paired bell and drum towers, and service
 * courtyards kept to the east and west of the worship axis.
 *
 * Coordinates use the scene convention (+Z toward the approach). Keeping the
 * plan in data makes the rendered compound and the paper map agree on names,
 * order, and cardinal placement.
 */
export type TempleBuildingKind = 'hall' | 'tower' | 'side_hall' | 'service';

export type TempleBuilding = {
  id: string;
  label: string;
  kind: TempleBuildingKind;
  x: number;
  z: number;
  width: number;
  depth: number;
  base: number;
  tall?: boolean;
};

export const templeLayout: readonly TempleBuilding[] = [
  {
    id: 'heavenly_kings_hall',
    label: '天王殿',
    kind: 'hall',
    x: 0,
    z: -12,
    width: 16,
    depth: 9,
    base: 0.55,
  },
  {
    id: 'bell_tower',
    label: '钟楼',
    kind: 'tower',
    x: -13.5,
    z: -14,
    width: 6,
    depth: 6,
    base: 0.35,
  },
  {
    id: 'drum_tower',
    label: '鼓楼',
    kind: 'tower',
    x: 13.5,
    z: -14,
    width: 6,
    depth: 6,
    base: 0.35,
  },
  {
    id: 'west_garan_hall',
    label: '伽蓝殿',
    kind: 'side_hall',
    x: -18,
    z: -29,
    width: 8,
    depth: 10,
    base: 0.45,
  },
  {
    id: 'maha_vira_hall',
    label: '大雄宝殿',
    kind: 'hall',
    x: 0,
    z: -29,
    width: 20,
    depth: 12,
    base: 0.9,
    tall: true,
  },
  {
    id: 'east_ancestral_hall',
    label: '祖师殿',
    kind: 'side_hall',
    x: 18,
    z: -29,
    width: 8,
    depth: 10,
    base: 0.45,
  },
  {
    id: 'guest_courtyard',
    label: '客寮院',
    kind: 'service',
    x: -17,
    z: -43,
    width: 10,
    depth: 9.2,
    base: 0.55,
  },
  {
    id: 'guest_hall',
    label: '客堂',
    kind: 'service',
    x: -26.8,
    z: -43,
    width: 5.6,
    depth: 7,
    base: 0.35,
  },
  {
    id: 'refectory',
    label: '斋堂',
    kind: 'service',
    x: 17,
    z: -43,
    width: 10,
    depth: 9.2,
    base: 0.55,
  },
  {
    id: 'monk_quarters',
    label: '僧寮',
    kind: 'service',
    x: 26.8,
    z: -43,
    width: 5.6,
    depth: 7,
    base: 0.35,
  },
  {
    id: 'sutra_library',
    label: '藏经楼',
    kind: 'hall',
    x: 0,
    z: -50,
    width: 18,
    depth: 10,
    base: 1.25,
    tall: true,
  },
  {
    id: 'abbot_quarters',
    label: '方丈院',
    kind: 'service',
    x: -17,
    z: -56,
    width: 9,
    depth: 8,
    base: 0.8,
  },
  {
    id: 'kitchen_storehouse',
    label: '香积厨/库房',
    kind: 'service',
    x: 17,
    z: -56,
    width: 9,
    depth: 8,
    base: 0.8,
  },
  {
    id: 'toilet_block',
    label: '净房',
    kind: 'service',
    x: 26.5,
    z: -54,
    width: 5,
    depth: 5,
    base: 0.35,
  },
] as const;

export const templeAxis = [
  'mountain_gate',
  'heavenly_kings_hall',
  'maha_vira_hall',
  'sutra_library',
] as const;

export const templeLayoutNotes = {
  orientation: '南向山门，北高后院',
  westWing: '钟楼、伽蓝殿、客寮院、客堂、方丈院',
  eastWing: '鼓楼、祖师殿、斋堂、僧寮、香积厨/库房、净房',
  waterFeature: '山门内东南角放生池',
} as const;
