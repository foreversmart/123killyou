import type { GameState } from '../../shared/types/game.ts';
export type SoundEvent = {
  kind: 'gong' | 'bell' | 'knock' | 'shatter' | 'bird' | 'door';
  at: number;
};
const repeat = (kind: SoundEvent['kind'], count: number, spacing = 0.85): SoundEvent[] =>
  Array.from({ length: count }, (_, index) => ({ kind, at: index * spacing }));
export function storyCues(state: GameState): SoundEvent[] {
  switch (state.shotKey || state.sceneKey) {
    case 'corridor_two_gongs':
      return repeat('gong', 2);
    case 'wake_candle':
    case 'mini_wake_three_gongs':
      return repeat('gong', 3);
    case 'four_knocks':
    case 'mini_four_knocks':
      return repeat('knock', 4, 0.62);
    case 'three_knocks':
    case 'mini_three_knocks':
    case 'dawn_knocks':
      return repeat('knock', 3, 0.62);
    case 'listen_vase':
      return [{ kind: 'shatter', at: 0 }];
    case 'double_enter':
    case 'double_exit':
    case 'double_frenzy':
      return [{ kind: 'door', at: 0 }];
    case 'dawn_gongs':
    case 'mini_dawn_trap':
      return [...repeat('gong', 5), { kind: 'bell', at: 4.6 }];
    case 'dawn_courtyard':
      return [...repeat('gong', 5), { kind: 'bird', at: 5.1 }, { kind: 'bird', at: 5.7 }];
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
export function cueSignature(state: GameState): string {
  const replay = /重听|再听|听钟/.test(state.lastHeard || '') ? `:${state.revision}` : '';
  return `${state.runId}:${state.sceneKey}:${state.shotKey || ''}${replay}`;
}
