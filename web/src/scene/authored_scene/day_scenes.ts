import type { GameState } from '@/shared/types/game';
import { composeLayout } from './compose';
import type { SceneComposition, SceneLayer } from './types';
import registrationLayout from '../../../../assets/scenes/registration/layout.json';
import diningLayout from '../../../../assets/scenes/dining_hall/layout.json';

type Selection = Record<string, string | boolean>;

/**
 * Authoritative compositions for the two daylight scenes. These use the
 * sourceFrame and destination rect recorded alongside each generated asset;
 * the renderer must crop first, then scale the crop into its authored rect.
 */
export function dayScene(state: GameState): SceneComposition | undefined {
  if (state.sceneKey === 'mini_register') {
    const courtyardShot = [
      'register_key_tags',
      'register_rooms',
      'register_drag_mark',
      'register_camera_bell',
      'register_ribbon',
      'register_luggage',
    ];
    return courtyardShot.includes(state.shotKey || '') ? undefined : registrationScene(state);
  }
  if (state.sceneKey === 'mini_refectory') return refectoryScene(state);
  return undefined;
}

function registrationScene(state: GameState): SceneComposition {
  // The registration story moves into the authored east-courtyard plate after
  // the desk hand-off. A separate courtyard composition owns those shots.
  const selection: Selection = {
    ledger: state.shotKey === 'register_rooms' ? 'closed' : 'open',
    keyVisible: !hasItem(state, 'key'),
    permit: state.shotKey === 'register_luggage' ? 'single' : 'stack',
    roomTagsVisible: [
      'register_key_tags',
      'register_rooms',
      'register_drag_mark',
      'register_camera_bell',
      'register_ribbon',
      'register_luggage',
    ].includes(state.shotKey || ''),
  };
  const composition = composeLayout(registrationLayout as never, 'registration', selection);
  const writing = state.shotKey === 'register_desk';
  const actorPreview = writing
    ? registrationLayout.writingPreview
    : registrationLayout.actorPreview;
  if (!actorPreview) return composition;
  const actor: SceneLayer = {
    id: 'actor_lu_chen',
    src: writing
      ? '/art/story/characters/lu_chen/writing_ledger.webp'
      : '/art/story/characters/lu_chen/standing_reception.webp',
    imageWidth: 1024,
    imageHeight: 1536,
    frame: actorPreview.sourceFrame,
    rect: actorPreview.rect,
    zIndex: actorPreview.zIndex,
    actorId: 'luchen',
    motion: writing ? 'write' : 'idle',
  };
  return {
    ...composition,
    layers: [
      ...composition.layers,
      actor,
      ...(writing
        ? [
            {
              ...actor,
              id: 'writing_brush',
              zIndex: 35,
              clipRect: { x: 715, y: 620, width: 93, height: 100 },
              motion: 'write_hand' as const,
            },
            {
              ...actor,
              id: 'writing_palm',
              zIndex: 35,
              clipRect: { x: 1070, y: 620, width: 135, height: 100 },
              motion: 'write_hand' as const,
            },
          ]
        : []),
    ].sort((a, b) => a.zIndex - b.zIndex),
    labels: composition.labels,
  };
}

function refectoryScene(state: GameState): SceneComposition {
  const selection: Selection = {
    linLan: mealState(state, 'linlan'),
    zhouYan: mealState(state, 'zhouyan'),
    xuZhi: mealState(state, 'xuzhi'),
    player: mealState(state, 'player'),
    huiPu: true,
  };
  const composition = composeLayout(diningLayout as never, 'dining_hall', selection);
  const actors: Record<string, string> = {
    lin_lan: 'linlan',
    zhou_yan: 'zhouyan',
    xu_zhi: 'xuzhi',
    lu_chen: 'luchen',
    curtain_presence: 'huipu',
  };
  return {
    ...composition,
    layers: composition.layers.map((layer) => {
      const actorId = actors[layer.id];
      const isMealLayer = /^(linLan|zhouYan|xuZhi|player)_(full|empty)$/.test(layer.id);
      return {
        ...layer,
        ...(actorId
          ? { actorId, motion: actorId === 'huipu' ? ('idle' as const) : ('eat' as const) }
          : isMealLayer
            ? { motion: 'eat' as const }
            : {}),
      };
    }),
  };
}

function mealState(state: GameState, person: string): string {
  return state.flags[`meal_${person}_ate`] ? 'empty' : 'full';
}

function hasItem(state: GameState, id: string): boolean {
  return state.inventory.some(
    (item) => item.id === id || item.name.includes(id === 'key' ? '钥匙' : id),
  );
}
