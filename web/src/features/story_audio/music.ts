import type { GameState } from '@/shared/types/game';

export const NIGHT_BACKGROUND_MUSIC = '/audio/incantation.mp3';
export const DEATH_SOUND_EFFECT = '/audio/dead.mp3';

// The wake sounds finish at 5.75s + the scrape cue's 1.1s window.
// Leave a short gap so the music enters after the player has clearly woken up.
export const NIGHT_BACKGROUND_MUSIC_DELAY_MS = 7000;

const NIGHT_BACKGROUND_SCENES = new Set([
  'mini_wake_three_gongs',
  'mini_four_knocks',
  'mini_three_knocks',
  'mini_listen',
  'mini_oracle',
  'mini_double',
  'mini_dawn_trap',
  'mini_death',
]);

export function shouldPlayNightBackground(state: Pick<GameState, 'sceneKey'> | null): boolean {
  return Boolean(state?.sceneKey && NIGHT_BACKGROUND_SCENES.has(state.sceneKey));
}
