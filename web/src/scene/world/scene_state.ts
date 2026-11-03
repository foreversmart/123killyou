import type { GameState, SceneActor } from '@/shared/types/game';
import type { WorldMode } from '@/scene/world/types';
import { canShowScenePerson } from '@/scene/scene_person/visibility';
import { isSleepInterlude } from '@/scene/world/sleep';
import { isListenDoorway } from '@/scene/world/listen_route';

export type Place =
  | 'gate'
  | 'corridor'
  | 'register'
  | 'refectory'
  | 'bedroom'
  | 'listen'
  | 'oracle'
  | 'hall'
  | 'road';

export function scenePlace(state: GameState, mode: WorldMode = 'story'): Place {
  if (state.sceneKey === 'mini_death') {
    const source = state.retryScene || state.shotKey?.replace(/^death_/, '');
    if (source === 'mini_listen') return 'listen';
    if (source === 'mini_oracle') return 'oracle';
    return 'bedroom';
  }
  if (mode === 'road') return 'road';
  if (mode === 'alighting') return 'gate';
  if (mode === 'hall') return 'hall';
  if (mode === 'travel') return state.sceneKey === 'mini_ending' ? 'gate' : 'corridor';
  if (state.sceneKey === 'mini_ending') return 'road';
  if (state.shotKey === 'four_peephole') return 'corridor';
  if (state.sceneKey === 'mini_arrival' || state.shotKey === 'dawn_gate') return 'gate';
  if (state.sceneKey === 'mini_register')
    return ['register_rooms', 'register_camera_bell', 'register_ribbon'].includes(
      state.shotKey || '',
    )
      ? 'corridor'
      : 'register';
  if (state.sceneKey === 'mini_corridor_candle' || state.sceneKey === 'mini_dawn')
    return 'corridor';
  if (state.sceneKey === 'mini_refectory') return 'refectory';
  if (state.sceneKey === 'mini_listen') return isListenDoorway(state) ? 'corridor' : 'listen';
  if (state.sceneKey === 'mini_oracle') return 'oracle';
  if (!state.sceneKey) return state.room === 'watch' ? 'register' : 'corridor';
  return 'bedroom';
}

export function isDaylight(state: GameState, mode: WorldMode = 'story') {
  return (
    mode === 'road' ||
    mode === 'alighting' ||
    ['mini_arrival', 'mini_register', 'mini_refectory', 'mini_dawn', 'mini_ending'].includes(
      state.sceneKey || '',
    )
  );
}

export function visibleActors(state: GameState, mode: WorldMode = 'story'): SceneActor[] {
  if (
    state.sceneKey === 'mini_death' ||
    (state.sceneKey === 'mini_ending' && mode !== 'travel') ||
    mode === 'road'
  )
    return [];
  return (state.actors || []).filter((actor) => {
    const sleepingPlayer =
      mode === 'story' && actor.id === 'player' && actor.visible && isSleepInterlude(state);
    const doorwayPlayer =
      actor.id === 'player' &&
      actor.visible &&
      ((mode === 'story' && isListenDoorway(state)) ||
        (mode === 'travel' && state.sceneKey === 'mini_listen'));
    const boardingPlayer =
      actor.id === 'player' &&
      actor.visible &&
      mode === 'travel' &&
      state.sceneKey === 'mini_ending';
    if (
      (!sleepingPlayer && !doorwayPlayer && !boardingPlayer && !canShowScenePerson(actor)) ||
      actor.id === 'evil'
    )
      return false;
    if (state.sceneKey === 'mini_listen' && ['linlan', 'zhouyan', 'xuzhi'].includes(actor.id))
      return state.flags.companion_present !== false;
    // No hidden character is revealed by camera movement or transition shots.
    if (mode === 'travel' || mode === 'hall')
      return !['huipu', 'victim', 'skin_double'].includes(actor.id);
    if (actor.id === 'huipu' && state.sceneKey === 'mini_refectory')
      return state.shotKey === 'refectory_curtain';
    if (actor.id === 'huipu' && state.sceneKey === 'mini_listen')
      return Boolean(state.flags.skin_seen);
    if (actor.id === 'victim')
      return state.sceneKey === 'mini_listen' && Boolean(state.flags.skin_seen);
    return true;
  });
}
