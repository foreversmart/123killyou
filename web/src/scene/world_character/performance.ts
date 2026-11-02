import type { GameState, SceneActor } from '@/shared/types/game';

export function performanceFor(
  actor: SceneActor,
  state: GameState,
  walking = false,
  alighting = false,
) {
  const shot = state.shotKey || '';
  if (actor.id === 'victim') return 'still';
  if (actor.id === 'shangong' && state.flags.cup_failed) return 'stone';
  if (walking) {
    // The gate-to-registration passage is a flock: Lu Chen keeps a calm lead
    // while each guest continues a small personal observation as they follow.
    if (state.sceneKey === 'mini_register') {
      if (actor.id === 'luchen') return 'walk_lead';
      if (actor.id === 'linlan') return 'walk_camera';
      if (actor.id === 'zhouyan') return 'walk_architecture';
      if (actor.id === 'xuzhi') return 'walk_companion';
    }
    return 'walk';
  }
  if (
    state.sceneKey === 'mini_arrival' &&
    (shot === 'arrival_gate' || shot.startsWith('arrival_'))
  ) {
    // Keep the whole gate tableau alive while individual lines play. The
    // guests continue their own small tasks together: the camera is checked,
    // the plaque and eaves are studied, bags are moved under the eave, and Lu
    // Chen walks in to welcome them. A focused speaker therefore never turns
    // the other actors into front-facing statues.
    if (actor.id === 'linlan') return shot === 'arrival_unload' ? 'stretch' : 'camera';
    if (actor.id === 'zhouyan') return shot === 'arrival_zhouyan' ? 'look_up' : 'admire';
    if (actor.id === 'xuzhi') {
      if (['arrival_gate_beauty', 'arrival_weather', 'arrival_plaque'].includes(shot))
        return 'admire';
      if (['arrival_inner', 'arrival_cat'].includes(shot)) return 'glance';
      return 'luggage';
    }
    if (actor.id === 'luchen') return 'welcome';
  }
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
    if (
      shot === 'arrival_luchen' ||
      shot === 'arrival_unload' ||
      (alighting && shot === 'arrival_gate')
    )
      return 'welcome';
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
    // The arrival shot is a group beat. Keep the other guests engaged while
    // one person speaks so the tableau reads as a shared arrival rather than
    // a sequence of frozen cut-outs.
    if (alighting && shot === 'arrival_gate') {
      if (actor.id === 'linlan') return 'camera';
      if (actor.id === 'zhouyan') return 'admire';
      return 'luggage';
    }
    if (shot === 'arrival_unload') {
      if (actor.id === 'linlan') return 'stretch';
      if (actor.id === 'zhouyan') return 'admire';
      return 'luggage';
    }
    if (actor.id === 'zhouyan' && shot === 'register_drag_mark') return 'point_floor';
    if (actor.id === 'zhouyan' && shot === 'dawn_axis') return 'inspect';
    if (actor.id === 'zhouyan' && shot === 'arrival_zhouyan') return 'look_up';
    if (actor.id === 'xuzhi' && shot === 'arrival_gate_beauty') return 'admire';
    if (actor.id === 'linlan') {
      if (shot === 'arrival_unload') return 'stretch';
      if (shot === 'arrival_weather') return 'camera';
      if (shot === 'dawn_courtyard') return 'review_camera';
    }
    if (actor.id === 'xuzhi' && shot === 'dawn_gate') return 'ribbon';
  }
  if (state.sceneKey === 'mini_register' && shot === 'register_desk') {
    // Guests gather around the ledger instead of waiting at the walls. Their
    // small glances and camera check keep the registration tableau natural.
    if (actor.id === 'linlan') return 'camera';
    if (actor.id === 'zhouyan') return 'inspect';
    if (actor.id === 'xuzhi') return 'glance';
  }
  // A shot change should advance the speaking line while leaving the group
  // in the activity that was established by the preceding beat. Returning
  // `idle` here made a companion snap to the camera as soon as another person
  // finished talking. Keep these low-key actions running across the arrival
  // and registration montage so the tableau feels continuous.
  const ambient: Record<string, Record<string, string>> = {
    register_key_tags: { linlan: 'camera', zhouyan: 'inspect', xuzhi: 'glance', luchen: 'offer' },
    register_drag_mark: {
      linlan: 'glance',
      zhouyan: 'point_floor',
      xuzhi: 'glance',
      luchen: 'glance',
    },
    register_camera_bell: { linlan: 'camera', zhouyan: 'glance', xuzhi: 'glance' },
    register_ribbon: { linlan: 'glance', zhouyan: 'inspect', xuzhi: 'ribbon' },
    register_rooms: { linlan: 'camera', zhouyan: 'inspect', xuzhi: 'glance', luchen: 'offer' },
    register_luggage: { linlan: 'glance', zhouyan: 'inspect', xuzhi: 'luggage', luchen: 'offer' },
    refectory_table: { linlan: 'glance', zhouyan: 'inspect', xuzhi: 'glance' },
    refectory_porridge: { linlan: 'glance', zhouyan: 'inspect', xuzhi: 'glance', luchen: 'offer' },
    refectory_lamp: { linlan: 'glance', zhouyan: 'inspect', xuzhi: 'glance', luchen: 'offer' },
    refectory_bread: { linlan: 'glance', zhouyan: 'inspect', xuzhi: 'glance', luchen: 'offer' },
    refectory_glance: { linlan: 'glance', zhouyan: 'inspect', xuzhi: 'glance', luchen: 'glance' },
    refectory_curtain: { linlan: 'glance', zhouyan: 'glance', xuzhi: 'glance', luchen: 'glance' },
    corridor_candles: { linlan: 'glance', zhouyan: 'inspect', xuzhi: 'glance' },
    corridor_warning: { linlan: 'glance', zhouyan: 'glance', xuzhi: 'glance' },
    corridor_lock: { linlan: 'glance', zhouyan: 'inspect', xuzhi: 'glance' },
    corridor_two_gongs: { linlan: 'glance', zhouyan: 'glance', xuzhi: 'glance' },
    dawn_courtyard: {
      linlan: 'review_camera',
      zhouyan: 'inspect',
      xuzhi: 'glance',
      luchen: 'glance',
    },
    dawn_axis: { linlan: 'review_camera', zhouyan: 'inspect', xuzhi: 'glance', luchen: 'glance' },
    dawn_gate: { linlan: 'review_camera', zhouyan: 'inspect', xuzhi: 'ribbon', luchen: 'welcome' },
  };
  const continuing = ambient[shot]?.[actor.id];
  if (continuing) return continuing;
  return 'idle';
}

export type Performance = ReturnType<typeof performanceFor>;
