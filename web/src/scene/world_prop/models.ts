import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder, lathe, plane, torus } from '@/scene/geometry/primitives';
import { labelTile } from '@/scene/renderer/atlas';
import { book, bowl, bread, plate, bag, camera } from '@/scene/world_prop/household';
import { candle, lantern, beads, key, vase, cage, cups } from '@/scene/world_prop/ritual';
import type { StageProp } from '@/scene/story_stage/types';
import type { GameState } from '@/shared/types/game';

export function propModel(prop: StageProp, state: GameState) {
  const b = new Builder(),
    id = prop.id,
    flags = state.flags;
  if (prop.kind === 'candle')
    return candle(
      !flags.story_dead && (state.sceneKey === 'mini_oracle' || Boolean(flags.red_candle_lit)),
      state.sceneKey === 'mini_dawn_trap',
    );
  if (prop.kind === 'cups') return cups(flags, state.shotKey === 'oracle_cast');
  if (prop.kind === 'book')
    book(
      b,
      id === 'register' ? '登记簿' : id === 'scripture' ? '大念处经' : '明照旧事',
      id === 'register' && state.shotKey === 'register_desk',
    );
  if (prop.kind === 'bowl')
    bowl(b, Boolean(flags['meal_' + id.replace('_bowl', '') + '_ate']), id === 'water');
  if (prop.kind === 'bread') bread(b);
  if (prop.kind === 'plate')
    plate(
      b,
      id === 'cat' ? 'cat' : id === 'bamboo' ? 'bamboo' : id === 'pickles' ? 'pickles' : 'greens',
    );
  if (prop.kind === 'bag')
    for (let i = 0; i < 4; i++)
      bag(b, [i * 0.5 - 0.75, 0, (i % 2) * 0.17], [0x71634d, 0x414c4d, 0x7a7e66, 0x4e4d43][i]);
  if (prop.kind === 'camera') camera(b, [0, 0.06, 0]);
  if (prop.kind === 'key') key(b);
  if (prop.kind === 'beads') beads(b);
  if (prop.kind === 'lamp')
    lantern(b, id === 'keeper_lamp' || id === 'curtain_lamp' || state.sceneKey === 'mini_oracle');
  if (prop.kind === 'vase' || prop.kind === 'shards')
    vase(b, flags.vase_broken || prop.kind === 'shards');
  if (prop.kind === 'cage') cage(b);
  if (prop.kind === 'paper' || prop.kind === 'sign') {
    b.box([0.25, 0.012, 0.34], [0, 0.008, 0], M.paper);
    b.add(
      plane(0.23, 0.32),
      { color: 0xffffff },
      [0, 0.016, 0.16],
      [1, 1, 1],
      [-Math.PI / 2, 0, 0],
      labelTile(id === 'notice' ? '入住须知' : '通行凭'),
    );
  }
  if (prop.kind === 'ribbon') {
    b.add(torus(0.04, 0.009), { color: 0x467eae, rough: 0.6 });
    for (const s of [-1, 1])
      b.box([0.025, 0.005, 0.11], [s * 0.026, 0.005, 0.05], { color: 0x467eae, rough: 0.6 }, [
        0,
        s * 0.3,
        0,
      ]);
  }
  if (prop.kind === 'spoon') {
    b.rod([0, 0.03, -0.12], [0, 0.03, 0.12], 0.012, M.wood);
    b.ball([0.033, 0.012, 0.048], [0, 0.03, -0.14], M.wood);
  }
  if (prop.kind === 'bell') {
    b.add(
      lathe([
        [0.09, 0],
        [0.1, 0.02],
        [0.07, 0.13],
        [0.03, 0.17],
        [0, 0.17],
      ]),
      M.brass,
    );
    b.rod([0, 0.15, 0], [0, -0.16, 0], 0.004, M.brass);
    b.box([0.06, 0.12, 0.005], [0, -0.2, 0], M.paper);
  }
  if (prop.kind === 'latch') b.box([0.7, 0.055, 0.09], [0, 0, 0], M.wood);
  if (prop.kind === 'match') {
    b.box([0.1, 0.03, 0.06], [0, 0.015, 0], M.paper);
    for (let i = 0; i < 3; i++)
      b.rod([-0.03, 0.035, i * 0.016 - 0.016], [0.07, 0.035, i * 0.016 - 0.016], 0.003, M.wood);
  }
  if (prop.kind === 'torch') {
    b.add(cylinder(0.027, 0.025, 0.19), M.black, [0, 0.04, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    b.add(cylinder(0.041, 0.027, 0.05), M.brass, [0, 0.04, 0.12], [1, 1, 1], [Math.PI / 2, 0, 0]);
  }
  return b.mesh(prop.id);
}
