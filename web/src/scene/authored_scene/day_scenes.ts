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
  if (state.sceneKey === 'mini_register') return registrationScene(state);
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
  const composition = composeLayout(registrationLayout, 'registration', selection);
  const actorPreview = (
    registrationLayout as typeof registrationLayout & {
      actorPreview?: {
        sourceFrame: { x: number; y: number; width: number; height: number };
        rect: { x: number; y: number; width: number; height: number };
        zIndex: number;
      };
    }
  ).actorPreview;
  if (!actorPreview) return composition;
  const actor: SceneLayer = {
    id: 'actor_lu_chen',
    src: '/art/story/characters/lu_chen/standing_reception.webp',
    imageWidth: 1024,
    imageHeight: 1536,
    frame: actorPreview.sourceFrame,
    rect: actorPreview.rect,
    zIndex: actorPreview.zIndex,
    actorId: 'luchen',
  };
  return {
    ...composition,
    layers: [...composition.layers, actor].sort((a, b) => a.zIndex - b.zIndex),
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
  return composeLayout(diningLayout, 'dining_hall', selection);
}

function mealState(state: GameState, person: string): string {
  return state.flags[`meal_${person}_ate`] ? 'empty' : 'full';
}

function hasItem(state: GameState, id: string): boolean {
  return state.inventory.some(
    (item) => item.id === id || item.name.includes(id === 'key' ? '钥匙' : id),
  );
}
