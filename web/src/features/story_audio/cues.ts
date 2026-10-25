import type { GameState } from '../../shared/types/game.ts';
export type SoundEvent = {
  kind:
    | 'gong'
    | 'bell'
    | 'knock'
    | 'shatter'
    | 'bird'
    | 'door'
    | 'cat'
    | 'breath'
    | 'scrape'
    | 'match'
    | 'latch'
    | 'rustle'
    | 'step'
    | 'tear'
    | 'chime'
    | 'rooster'
    | 'wood'
    | 'bus';
  at: number;
  pan?: number;
};
const repeat = (kind: SoundEvent['kind'], count: number, spacing = 0.85): SoundEvent[] =>
  Array.from({ length: count }, (_, index) => ({ kind, at: index * spacing }));
export function storyCues(state: GameState): SoundEvent[] {
  if (state.shotKey?.startsWith('death_'))
    return [
      {
        kind:
          state.retryScene === 'mini_listen' || state.retryScene === 'mini_oracle'
            ? 'step'
            : 'door',
        at: 0,
      },
    ];
  switch (state.shotKey || state.sceneKey) {
    case 'corridor_two_gongs':
      return repeat('gong', 2);
    case 'wake_candle':
    case 'mini_wake_three_gongs':
      return [
        ...repeat('gong', 3),
        { kind: 'breath', at: 3, pan: 0.55 },
        { kind: 'scrape', at: 4.6, pan: 0.55 },
      ];
    case 'wake_door':
      return [
        { kind: 'breath', at: 0, pan: 0.55 },
        { kind: 'scrape', at: 1.7, pan: 0.55 },
      ];
    case 'four_knocks':
    case 'mini_four_knocks':
      return repeat('knock', 4, 0.62);
    case 'three_knocks':
    case 'mini_three_knocks':
    case 'dawn_knocks':
      return repeat('knock', 3, 0.62);
    case 'listen_vase':
      return [{ kind: 'shatter', at: 0, pan: -0.4 }];
    case 'listen_door':
      return [
        { kind: 'cat', at: 0.1, pan: -0.65 },
        { kind: 'bird', at: 1, pan: -0.4 },
        { kind: 'tear', at: 1.9, pan: 0.65 },
      ];
    case 'listen_skin':
      return [
        { kind: 'tear', at: 0.25, pan: 0.65 },
        { kind: 'tear', at: 1.8, pan: 0.65 },
      ];
    case 'listen_cat':
    case 'oracle_cat':
    case 'arrival_cat':
      return [{ kind: 'cat', at: 0.2, pan: -0.65 }];
    case 'listen_bird':
    case 'oracle_bird':
      return [
        { kind: 'bird', at: 0.15, pan: -0.45 },
        { kind: 'bird', at: 0.85, pan: -0.45 },
      ];
    case 'room_candle':
      return [{ kind: 'match', at: 0 }];
    case 'room_latch':
      return [{ kind: 'latch', at: 0.1, pan: 0.35 }];
    case 'oracle_cast':
      return [
        { kind: 'wood', at: 0.55, pan: -0.15 },
        { kind: 'wood', at: 0.85, pan: 0.2 },
      ];
    case 'room_history':
    case 'room_scripture':
    case 'room_page':
    case 'room_permit':
      return [{ kind: 'rustle', at: 0 }];
    case 'register_camera_bell':
      return [{ kind: 'chime', at: 0.1, pan: -0.7 }];
    case 'corridor_lock':
      return [{ kind: 'latch', at: 0.1, pan: 0.8 }];
    case 'double_enter':
    case 'double_exit':
    case 'double_frenzy':
      return [{ kind: 'door', at: 0 }];
    case 'dawn_wait':
      return [
        { kind: 'step', at: 0.1, pan: 0.4 },
        { kind: 'step', at: 0.9, pan: 0.65 },
        { kind: 'step', at: 1.9, pan: 0.9 },
      ];
    case 'dawn_gongs':
    case 'mini_dawn_trap':
      return [...repeat('gong', 5), { kind: 'bell', at: 4.6, pan: 0.8 }];
    case 'dawn_courtyard':
      return [
        ...repeat('gong', 5),
        { kind: 'rooster', at: 4.6, pan: -0.4 },
        { kind: 'bird', at: 5.1 },
        { kind: 'bird', at: 5.7 },
      ];
    case 'ending_bus':
      return [{ kind: 'bus', at: 0 }];
    case 'arrival_inner':
      return [
        { kind: 'bird', at: 0 },
        { kind: 'bell', at: 0.8, pan: 0.85 },
      ];
    case 'mini_arrival':
    case 'arrival_gate':
    case 'arrival_bus':
    case 'dawn_gate':
      return [
        { kind: 'bird', at: 0 },
        { kind: 'bird', at: 0.65 },
      ];
    default:
      return [];
  }
}
export function cueDuration(cue: SoundEvent): number {
  if (cue.kind === 'bell') return 3.3;
  if (cue.kind === 'bus') return 3.1;
  if (cue.kind === 'breath' || cue.kind === 'tear' || cue.kind === 'rooster') return 1.5;
  return 1.1;
}
export function cueSignature(state: GameState): string {
  const replay = /重听|再听|听钟|听敲门|听声音|检查猫食碟|检查鸟笼|听猫叫|听鸟叫/.test(
    state.lastHeard || '',
  )
    ? `:${state.revision}`
    : '';
  return `${state.runId}:${state.sceneKey}:${state.shotKey || ''}${replay}`;
}
