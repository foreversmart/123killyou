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
    motion: writing ? 'still' : 'idle',
  };
  const dragObserver: SceneLayer | undefined =
    state.shotKey === 'register_drag_mark'
      ? {
          id: 'actor_zhou_yan_registration',
          src: '/art/story/characters/zhou_yan/standing.webp',
          imageWidth: 1024,
          imageHeight: 1536,
          frame: { x: 276, y: 13, width: 502, height: 1509 },
          rect: { x: 1185, y: 120, width: (900 * 502) / 1509, height: 900 },
          zIndex: 12,
          actorId: 'zhouyan',
          motion: 'idle',
        }
      : undefined;
  return {
    ...composition,
    layers: [
      ...composition.layers,
      actor,
      ...(dragObserver ? [dragObserver] : []),
      ...(writing
        ? [
            {
              ...actor,
              id: 'writing_brush',
              zIndex: 35,
              clipPath:
                'M740 495H785L800 550L815 580L800 637L789 650L809 711L797 714L779 661C768 691 746 710 723 718C705 716 692 708 690 688L689 638L695 595L720 559Z',
              motion: 'write_hand' as const,
            },
            {
              ...actor,
              id: 'writing_palm',
              zIndex: 35,
              clipPath:
                'M1080 620H1228V696Q1217 704 1186 694L1181 713H1107L1100 694L1086 701L1070 697V689L1080 685L1092 670Z',
              motion: 'still' as const,
            },
          ]
        : []),
    ].sort((a, b) => a.zIndex - b.zIndex),
    labels: composition.labels,
  };
}

function refectoryScene(state: GameState): SceneComposition {
  // The meal plate is authored as one complete illustration. Keep the meal
  // flags in the composition input so scene state remains available to future
  // authored layers, while the current layout intentionally ignores them.
  const selection: Selection = {
    linLan: mealState(state, 'linlan'),
    zhouYan: mealState(state, 'zhouyan'),
    xuZhi: mealState(state, 'xuzhi'),
    player: mealState(state, 'player'),
    huiPu: true,
  };
  const composition = composeLayout(diningLayout as never, 'dining_hall', selection);
  // Lu Chen's glance is the one authored action that still needs a runtime
  // layer. The full plate already contains the keeper for every other shot;
  // add the cropped motion layer only for this explicit story beat.
  if (state.shotKey === 'refectory_glance') {
    const keeper: SceneLayer = {
      id: 'lu_chen',
      src: '/art/story/characters/lu_chen/standing_reception.webp',
      imageWidth: 1024,
      imageHeight: 1536,
      frame: { x: 0, y: 0, width: 1024, height: 1536 },
      rect: { x: 1190, y: 120, width: 270, height: 700 },
      zIndex: 12,
      actorId: 'luchen',
      motion: 'still',
    };
    return {
      ...composition,
      layers: [...composition.layers, ...keeperGlance(keeper)].sort((a, b) => a.zIndex - b.zIndex),
    };
  }
  // The remote scene work deliberately removes independently animated meal
  // sprites. Keep the actor mapping for any future layered layout without
  // reintroducing those sprites on the current full-plate composition.
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
      return actorId ? { ...layer, actorId, motion: 'still' as const } : layer;
    }),
  };
}

/** A single glance moves the head while the keeper's body stays at the doorway. */
function keeperGlance(layer: SceneLayer): SceneLayer[] {
  const headHeight = 250;
  const scale = layer.rect.height / layer.frame.height;
  const neck = layer.rect.y + 234 * scale;
  return [
    {
      ...layer,
      actorId: 'luchen',
      motion: 'still',
      clipRect: { ...layer.rect, y: neck, height: layer.rect.y + layer.rect.height - neck },
    },
    {
      ...layer,
      id: 'lu_chen_glance_head',
      actorId: 'luchen',
      motion: 'glance',
      motionOrigin: { x: layer.rect.x + layer.rect.width * 0.4, y: neck },
      frame: { ...layer.frame, height: headHeight },
      rect: { ...layer.rect, height: headHeight * scale },
    },
  ];
}

function mealState(state: GameState, person: string): string {
  return state.flags[`meal_${person}_ate`] ? 'empty' : 'full';
}

function hasItem(state: GameState, id: string): boolean {
  return state.inventory.some(
    (item) => item.id === id || item.name.includes(id === 'key' ? '钥匙' : id),
  );
}
