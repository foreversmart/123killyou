import type { GameState, SceneActor } from '@/shared/types/game';
import courtyardLayout from '../../../../assets/scenes/east_courtyard/layout.json';
import guestRoomLayout from '../../../../assets/scenes/guest_room/layout.json';
import shrineLayout from '../../../../assets/scenes/east_shrine/layout.json';
import templeGateLayout from '../../../../assets/scenes/temple_gate/layout.json';
import type { AuthoredLayout, SceneComposition, SceneLayer } from './types';
import { composeLayout, runtimeSource } from './compose';

type Selection = Record<string, string | boolean>;

const authored = (value: unknown) => value as AuthoredLayout;

/**
 * Build the authored compositions for the open courtyard, the half-open room,
 * the side shrine, and the final gate. These coordinates come from the
 * scene layout JSON files; the old percentage hotspots are intentionally not
 * used for the visible artwork.
 */
export function exteriorScene(state: GameState): SceneComposition | undefined {
  switch (state.sceneKey) {
    case 'mini_corridor_candle':
      return courtyardScene(state);
    case 'mini_listen':
      return listenScene(state);
    case 'mini_oracle':
      return oracleScene(state);
    case 'mini_dawn':
      return state.shotKey === 'dawn_gate' ? gateScene(state) : courtyardScene(state);
    case 'mini_ending':
      return departureScene();
    case 'mini_death':
      if (state.shotKey === 'death_mini_listen') return listenScene(state);
      if (state.shotKey === 'death_mini_oracle') return oracleScene(state);
      return undefined;
    default:
      return undefined;
  }
}

function courtyardScene(state: GameState): SceneComposition {
  const time = state.sceneKey === 'mini_dawn' ? 'dawn' : 'dusk';
  const selection: Selection = {
    time,
    vase: state.flags.vase_broken ? 'broken' : 'intact',
    privateClues: true,
    door: state.shotKey === 'corridor_lamp' ? 'lamp' : 'closed',
  };
  const result = composeLayout(authored(courtyardLayout), 'east_courtyard', selection);
  const wanted = state.shotKey === 'corridor_candles' ? 'luchen' : actorForCourtyard(state);
  return withActors(result, authored(courtyardLayout), 'east_courtyard', state, wanted);
}

function actorForCourtyard(state: GameState): string | undefined {
  if (state.sceneKey === 'mini_dawn') {
    if (state.shotKey === 'dawn_axis') return 'zhouyan';
    if (state.shotKey === 'dawn_courtyard') return 'luchen';
  }
  if (state.shotKey === 'corridor_warning' || state.shotKey === 'corridor_two_gongs') return 'luchen';
  return undefined;
}

function listenScene(state: GameState): SceneComposition {
  const result = composeLayout(authored(guestRoomLayout), 'guest_room', {
    hui: state.flags.vase_broken ? 'turn' : 'rear',
  });
  const layers = result.layers.map((layer) =>
    layer.id === 'victim_detail' && !state.flags.skin_seen ? { ...layer, rect: { ...layer.rect, width: 0, height: 0 } } : layer,
  );
  return { ...result, layers };
}

function oracleScene(state: GameState): SceneComposition {
  const elder = state.flags.cup_failed ? 'stone' : state.flags.cup_jiao_rescue ? 'alive' : 'alive';
  const result = composeLayout(authored(shrineLayout), 'east_shrine', {
    elder,
    jiaobei: cupState(state),
    candle: state.flags.cup_jiao_rescue,
  });
  return result;
}

function cupState(state: GameState): string {
  if (!state.flags.cup_cast_counted) return 'sealed';
  if (state.flags.cup_roll_sacred) return 'sacred';
  if (state.flags.cup_roll_laugh) return 'laugh';
  return 'yin';
}

function gateScene(_state: GameState): SceneComposition {
  return composeLayout(authored(templeGateLayout), 'temple_gate', {
    time: 'dawn',
    bags: true,
    cat: false,
    companions: true,
  });
}

/**
 * The departure background is a first-person bus plate. It already contains
 * all visible geometry, so adding standing character cutouts would put people
 * in front of the windows and break the intended camera. Keep the composition
 * to the authored plate and its mirror reflection.
 */
function departureScene(): SceneComposition {
  return {
    width: 1672,
    height: 941,
    layers: [
      {
        id: 'departure_background',
        src: '/art/story/scenes/bus/bus_departure.webp',
        imageWidth: 1672,
        imageHeight: 941,
        frame: { x: 0, y: 0, width: 1672, height: 941 },
        rect: { x: 0, y: 0, width: 1672, height: 941 },
        zIndex: 0,
      },
    ],
    labels: [],
  };
}

function withActors(
  composition: SceneComposition,
  layout: AuthoredLayout,
  directory: string,
  state: GameState,
  only?: string,
): SceneComposition {
  const actors = (state.actors || []).filter((actor) => actor.visible && actor.id !== 'player');
  const selected = only ? actors.filter((actor) => actor.id === only) : actors;
  const actorLayers = selected.flatMap((actor) => actorLayer(layout, directory, actor));
  return { ...composition, layers: [...composition.layers, ...actorLayers].sort((a, b) => a.zIndex - b.zIndex) };
}

function actorLayer(layout: AuthoredLayout, directory: string, actor: SceneActor): SceneLayer[] {
  const id = actor.id === 'luchen' ? 'actor_lu_chen' : actor.id === 'linlan' ? 'actor_lin_lan' : actor.id === 'zhouyan' ? 'actor_zhou_yan' : actor.id === 'xuzhi' ? 'actor_xu_zhi' : actor.id === 'shangong' ? 'elder_alive' : undefined;
  if (!id || !layout.sprites[id]) return [];
  const layer = layout.layers.find((item) => item.id === id);
  if (!layer) return [];
  const sprite = layout.sprites[id];
  return [{
    id: `${id}_${actor.id}`,
    actorId: actor.id,
    src: runtimeSource(directory, sprite.path),
    imageWidth: sprite.width,
    imageHeight: sprite.height,
    frame: sprite.sourceFrame || { x: 0, y: 0, width: sprite.width, height: sprite.height },
    rect: { ...layer.rect },
    zIndex: layer.zIndex,
    clipRect: layer.clipRect,
  }];
}
