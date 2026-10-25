import type { GameState } from '@/shared/types/game';
import roomLayout from '../../../../assets/scenes/player_room/layout.json';
import { composeLayout } from './compose';
import type { AuthoredLayout, SceneComposition } from './types';

const roomScenes = new Set([
  'mini_room',
  'mini_wake_three_gongs',
  'mini_four_knocks',
  'mini_three_knocks',
  'mini_double',
  'mini_dawn_trap',
]);
const identities: Record<string, string> = {
  linlan: 'lin_lan',
  zhouyan: 'zhou_yan',
  xuzhi: 'xu_zhi',
};

/** All room shots share the same authored camera and tabletop coordinates. */
export function nightScene(state: GameState): SceneComposition | undefined {
  const scene = state.sceneKey || '';
  const death = scene === 'mini_death';
  const source = state.retryScene || state.shotKey?.replace(/^death_/, '') || '';
  if (!roomScenes.has(scene) && !(death && !['mini_listen', 'mini_oracle'].includes(source)))
    return undefined;
  if (state.shotKey === 'four_peephole') return peepholeScene();

  const flags = state.flags;
  const lit = !death && Boolean(flags.red_candle_lit);
  const held = flags.red_candle_held || lit || state.inventory.some((item) => item.id === 'candle');
  const candle = !held
    ? 'absent'
    : death || scene === 'mini_wake_three_gongs'
      ? 'out'
      : lit
        ? scene === 'mini_dawn_trap'
          ? 'short'
          : 'burning'
        : 'unlit';
  const actor = state.actors?.find((person) => person.id === 'skin_double' && person.visible);
  const identity = actor ? identities[actor.portrait] : undefined;
  const revealed =
    flags.double_refused_candle ||
    flags.double_frenzy ||
    ['double_exit', 'double_frenzy'].includes(state.shotKey || '');
  const composition = composeLayout(roomLayout as AuthoredLayout, 'player_room', {
    time: death || !lit ? 'moonlit' : scene === 'mini_dawn_trap' ? 'false_dawn' : 'candlelit',
    candle,
    door:
      death || ['double_exit', 'double_frenzy'].includes(state.shotKey || '') ? 'open' : 'closed',
    actor: death ? 'intrusion' : identity ? `${identity}${revealed ? '' : '_familiar'}` : 'none',
  });
  for (const layer of composition.layers) {
    if (layer.id === 'intrusion') layer.actorId = 'evil';
    if (layer.id.startsWith('familiar_') || layer.id.startsWith('double_')) {
      layer.actorId = 'skin_double';
      if (state.shotKey === 'double_calm') {
        // A full-size body lies beside the bed; do not turn a standing sprite
        // into a tiny person to simulate distance or lying down.
        layer.rect = { x: 290, y: 405, width: layer.rect.width, height: 730 };
        layer.rotation = -90;
        layer.clipRect = { x: 105, y: 735, width: 735, height: 206 };
      }
    }
  }
  return composition;
}

function peepholeScene(): SceneComposition {
  const rect = { x: 0, y: 0, width: 1672, height: 941 };
  return {
    width: rect.width,
    height: rect.height,
    layers: [
      {
        id: 'peephole_empty',
        src: '/art/story/scenes/player_room/peephole_empty.webp',
        imageWidth: rect.width,
        imageHeight: rect.height,
        frame: rect,
        rect,
        zIndex: 0,
      },
    ],
    labels: [],
  };
}
