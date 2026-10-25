import type { GameState } from '../../shared/types/game.ts';
import { json } from './api.ts';

// Looking at the opening must never read through or replace the autosave slot.
// Only an explicit choice (or the first interaction) establishes a session.
export function createSessionEntry(request: typeof json = json) {
  let selected: GameState | null = null;
  let pending: Promise<GameState> | null = null;
  return {
    opening: () => request<GameState>('/api/story/opening'),
    enter(mode: 'new' | 'resume' = 'new'): Promise<GameState> {
      if (selected) return Promise.resolve(selected);
      if (pending) return pending;
      pending = request<GameState>(mode === 'resume' ? '/api/sessions/resume' : '/api/sessions', {
        method: 'POST',
      })
        .then((state) => {
          selected = state;
          return state;
        })
        .finally(() => {
          pending = null;
        });
      return pending;
    },
  };
}
