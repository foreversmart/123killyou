import type { GameState } from '@/shared/types/game';
import type { World } from '@/scene/world/types';
import type { Place } from '@/scene/world/scene_state';
import type { StageProp } from '@/scene/story_stage/types';
import { sceneLayout } from '@/scene/story_stage/layouts';
import { propPositions } from '@/scene/world/placement';
import { propModel } from '@/scene/world_prop/models';
import { Builder, materials as M } from '@/scene/geometry/builder';

const gateProps: StageProp[] = [
  { id: 'bell', name: '山门铜铃', kind: 'bell', command: '看铜铃', x: 0, y: 0 },
  { id: 'cat', name: '晒太阳的花猫', kind: 'plate', command: '看看花猫', x: 0, y: 0 },
  { id: 'plaque', name: '明照寺旧匾', kind: 'sign', command: '看看山门', x: 0, y: 0 },
  { id: 'bags', name: '四只旅行包', kind: 'bag', x: 0, y: 0 },
];

function catModel() {
  const b = new Builder(),
    fur = { color: 0x9f8c68, rough: 0.98, pattern: 2 };
  b.ball([0.27, 0.15, 0.14], [0, 0.12, 0], fur);
  b.ball([0.12, 0.12, 0.1], [0.19, 0.25, 0.03], fur);
  for (const side of [-1, 1]) {
    b.ball([0.03, 0.065, 0.04], [0.19 + side * 0.07, 0.35, 0.015], fur);
    b.ball([0.012, 0.013, 0.006], [0.19 + side * 0.045, 0.265, 0.122], {
      color: 0xa6a354,
      rough: 0.3,
    });
    b.ball([0.007, 0.011, 0.006], [0.19 + side * 0.045, 0.265, 0.127], M.black);
    b.ball([0.08, 0.045, 0.045], [0.12, 0.04, side * 0.11], fur);
  }
  b.rod([-0.22, 0.1, 0], [-0.4, 0.07, 0.13], 0.035, fur);
  return b.mesh('cat');
}

export function addProps(world: World, state: GameState, place: Place, interactive: boolean) {
  if (place === 'road' || place === 'hall') return;
  const props = place === 'gate' ? gateProps : sceneLayout(state).props;
  const positions = propPositions[place] || {};
  for (const prop of props) {
    const position =
      place === 'oracle' &&
      prop.id === 'cups' &&
      (state.flags.cup_cast_counted || state.shotKey === 'oracle_cast')
        ? ([0.65, 0.02, 1.15] as [number, number, number])
        : positions[prop.id];
    if (!position) continue;
    // Architectural signs and latches are already built at these coordinates.
    const embedded = prop.id === 'plaque' || prop.id === 'tower' || prop.id === 'latch';
    const personal = ['camera', 'map', 'ribbon'].includes(prop.id);
    const heldBowl =
      ['linlan_bowl', 'zhouyan_bowl', 'xuzhi_bowl'].includes(prop.id) &&
      state.shotKey === 'refectory_eating' &&
      !state.flags.refectory_meal_finished &&
      state.flags['meal_' + prop.id.replace('_bowl', '') + '_ate'];
    if (
      !embedded &&
      !personal &&
      !heldBowl &&
      !(place === 'oracle' && prop.id === 'candle' && state.flags.cup_jiao_rescue) &&
      !(state.sceneKey === 'mini_corridor_candle' && prop.id === 'candle')
    ) {
      const model = prop.id === 'cat' && place === 'gate' ? catModel() : propModel(prop, state);
      model.position = [...position];
      world.root.children.push(model);
    }
    if (prop.command && interactive)
      world.hotspots.push({
        id: prop.id,
        name: prop.name,
        command: prop.command,
        position: [position[0], position[1] + (prop.kind === 'candle' ? 0.22 : 0.1), position[2]],
      });
  }
}
