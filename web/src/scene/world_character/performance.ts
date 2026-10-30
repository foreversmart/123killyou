import type { GameState, SceneActor } from '@/shared/types/game';

export function performanceFor(actor: SceneActor, state: GameState, walking = false) {
  const shot = state.shotKey || '';
  if (actor.id === 'victim') return 'still';
  if (actor.id === 'shangong' && state.flags.cup_failed) return 'stone';
  if (walking) return 'walk';
  if (actor.id === 'skin_double') {
    if (state.flags.double_calm) return 'calm';
    if (shot === 'double_frenzy') return 'frenzy';
    if (shot.startsWith('double_scripture_')) return 'scratch';
    if (shot === 'double_exit') return 'latch';
    return 'uneasy';
  }
  if (actor.id === 'huipu' && state.sceneKey === 'mini_listen')
    return state.flags.vase_broken ? 'startled' : 'lean';
  if (actor.id === 'luchen') {
    if (shot === 'register_desk') return 'write';
    if (shot === 'arrival_luchen') return 'welcome';
    if (shot === 'refectory_glance') return 'glance';
    if (state.sceneKey === 'mini_corridor_candle')
      return shot === 'corridor_warning' ? 'hush' : 'offer';
  }
  if (actor.id === 'shangong') {
    if (state.flags.cup_jiao_rescue) return 'rescue';
    if (['oracle_rules', 'oracle_cast'].includes(shot)) return 'ritual';
  }
  if (['linlan', 'zhouyan', 'xuzhi'].includes(actor.id)) {
    if (shot === 'refectory_eating' && !state.flags.refectory_meal_finished) return 'eat';
    if (actor.id === 'zhouyan' && ['register_drag_mark', 'dawn_axis'].includes(shot))
      return 'inspect';
    if (actor.id === 'zhouyan' && shot === 'arrival_zhouyan') return 'look_up';
    if (actor.id === 'xuzhi' && shot === 'arrival_gate_beauty') return 'admire';
    if (actor.id === 'linlan') {
      if (shot === 'arrival_unload') return 'stretch';
      if (shot === 'arrival_weather') return 'camera';
      if (shot === 'dawn_courtyard') return 'review_camera';
    }
    if (actor.id === 'xuzhi' && shot === 'dawn_gate') return 'ribbon';
  }
  return 'idle';
}

export type Performance = ReturnType<typeof performanceFor>;
